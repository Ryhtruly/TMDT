import { StockkeeperRepository } from '../repositories/stockkeeper.repository';
import {
  extractProvinceDistrictWardFromAddress,
  isSameArea,
  isSameWardArea,
} from '../utils/location';

const stockRepo = new StockkeeperRepository();

const INBOUND_ALLOWED_STATUSES = ['ĐÃ LẤY HÀNG', 'ĐANG TRUNG CHUYỂN', 'GIAO THẤT BẠI'];
const OUTBOUND_ALLOWED_STATUSES = ['TẠI KHO'];

export class StockkeeperService {
  private async resolveAssignedShipper(id_spoke: number, receiverAddress: string) {
    const parsed = extractProvinceDistrictWardFromAddress(receiverAddress || '');
    if (!parsed) return null;

    const assignments = await stockRepo.getWardAssignmentsBySpoke(id_spoke);
    if (!assignments.length) return null;

    const exactWard = assignments.find((assignment: any) =>
      assignment.ward &&
      isSameWardArea(
        assignment.province,
        assignment.district,
        assignment.ward,
        parsed.province,
        parsed.district,
        parsed.ward
      )
    );
    if (exactWard) return Number(exactWard.id_shipper);

    const districtFallback = assignments.find((assignment: any) =>
      !assignment.ward &&
      isSameArea(assignment.province, assignment.district, parsed.province, parsed.district)
    );
    if (districtFallback) return Number(districtFallback.id_shipper);

    return null;
  }

  private async getAssignment(id_user: number) {
    const assignment = await stockRepo.getStockkeeperAssignment(id_user);
    if (!assignment) {
      throw new Error('Tai khoan chua duoc phan cong vao kho nao. Lien he admin!');
    }
    return assignment;
  }

  async scanInbound(id_user: number, tracking_code: string, shelf_location?: string) {
    const assignment = await this.getAssignment(id_user);
    const { id_hub, id_spoke, hub_name, spoke_name } = assignment;
    const warehouseName = hub_name || spoke_name;
    const idLocation = assignment.hub_location_id || assignment.spoke_location_id;

    const order = await stockRepo.findOrderByTracking(tracking_code);
    if (!order) throw new Error(`Khong tim thay don hang: ${tracking_code}`);

    if (!INBOUND_ALLOWED_STATUSES.includes(order.status)) {
      throw new Error(
        `Khong the nhap kho! Don dang o trang thai "${order.status}".\n` +
          `Chi chap nhan nhap kho: ${INBOUND_ALLOWED_STATUSES.join(', ')}`
      );
    }

    const client = await stockRepo.getTxClient();
    try {
      await client.query('BEGIN');

      await stockRepo.upsertInventory(order.id_order, id_hub, id_spoke, shelf_location || null, client);
      await stockRepo.updateOrderStatus(order.id_order, 'TẠI KHO', client);
      await stockRepo.insertOrderLog(
        order.id_order,
        idLocation,
        id_user,
        `NHAP KHO: ${warehouseName}${shelf_location ? ` - Ke ${shelf_location}` : ''}`,
        client
      );

      await client.query('COMMIT');

      return {
        tracking_code,
        new_status: 'TẠI KHO',
        warehouse: warehouseName,
        shelf_location: shelf_location || 'Chua co vi tri ke',
        message: `Nhap kho thanh cong tai ${warehouseName}!`,
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async scanOutbound(id_user: number, tracking_code: string) {
    const assignment = await this.getAssignment(id_user);
    const { id_hub, id_spoke, hub_name, spoke_name } = assignment;
    const warehouseName = hub_name || spoke_name;
    const idLocation = assignment.hub_location_id || assignment.spoke_location_id;

    const order = await stockRepo.findOrderByTracking(tracking_code);
    if (!order) throw new Error(`Khong tim thay don hang: ${tracking_code}`);

    if (!OUTBOUND_ALLOWED_STATUSES.includes(order.status)) {
      throw new Error(`Khong the xuat kho! Don dang o "${order.status}". Phai o trang thai "TẠI KHO".`);
    }

    const inventoryRecord = await stockRepo.findInventoryRecord(order.id_order, id_hub, id_spoke);
    if (!inventoryRecord) {
      throw new Error(
        `Don hang nay chua duoc nhap kho tai ${warehouseName}! ` +
          'Khong the xuat kho khi chua co ban ghi nhap kho tai day.'
      );
    }

    const isDestinationSpoke =
      !!id_spoke && !!order.dest_spoke && Number(id_spoke) === Number(order.dest_spoke);
    const nextStatus = isDestinationSpoke ? 'ĐÃ LẤY HÀNG' : 'ĐANG TRUNG CHUYỂN';
    const nextAction = isDestinationSpoke ? 'XUAT KHO -> GIAO CUOI' : 'XUAT KHO -> TRUNG CHUYEN';
    const nextMessage = isDestinationSpoke
      ? `Xuat kho thanh cong tu ${warehouseName}! Hang da san sang ban giao cho shipper giao cuoi chang.`
      : `Xuat kho thanh cong tu ${warehouseName}! Don dang trung chuyen sang chang tiep theo.`;
    const assignedShipperId =
      isDestinationSpoke && id_spoke ? await this.resolveAssignedShipper(id_spoke, order.receiver_address || '') : null;

    const client = await stockRepo.getTxClient();
    try {
      await client.query('BEGIN');

      await stockRepo.removeInventory(order.id_order, client);
      await stockRepo.updateOrderStatus(order.id_order, nextStatus, client);
      await stockRepo.updateCurrentShipper(order.id_order, assignedShipperId, client);
      await stockRepo.insertOrderLog(order.id_order, idLocation, id_user, nextAction, client);

      await client.query('COMMIT');

      return {
        tracking_code,
        new_status: nextStatus,
        warehouse: warehouseName,
        assigned_shipper_id: assignedShipperId,
        message: nextMessage,
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getInventory(id_user: number) {
    const assignment = await this.getAssignment(id_user);
    const items = await stockRepo.getInventoryList(assignment.id_hub, assignment.id_spoke);

    return {
      warehouse: assignment.hub_name || assignment.spoke_name,
      total_items: items.length,
      items: items.map((item: any) => ({
        ...item,
        hours_in_warehouse: parseFloat(item.hours_in_warehouse || 0).toFixed(1),
        is_overdue: parseFloat(item.hours_in_warehouse || 0) >= 24,
      })),
    };
  }

  async getOverdueAlerts(id_user: number) {
    const assignment = await this.getAssignment(id_user);
    const alerts = await stockRepo.getOverdueAlerts(assignment.id_hub, assignment.id_spoke);

    return {
      warehouse: assignment.hub_name || assignment.spoke_name,
      total_overdue: alerts.length,
      warning:
        alerts.length > 0
          ? `Co ${alerts.length} don hang ton kho qua 24 gio chua duoc dieu phoi!`
          : 'Khong co don nao ton kho qua 24 gio.',
      items: alerts.map((item: any) => ({
        ...item,
        hours_in_warehouse: parseFloat(item.hours_in_warehouse || 0).toFixed(1),
      })),
    };
  }
}
