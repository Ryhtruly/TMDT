import { StockkeeperRepository } from '../repositories/stockkeeper.repository';

const stockRepo = new StockkeeperRepository();

// Trạng thái đơn hợp lệ để nhập kho
const INBOUND_ALLOWED_STATUSES = ['ĐÃ LẤY HÀNG', 'ĐANG TRUNG CHUYỂN', 'GIAO THẤT BẠI'];
// Trạng thái đơn hợp lệ để xuất kho
const OUTBOUND_ALLOWED_STATUSES = ['TẠI KHO'];

export class StockkeeperService {
  // Lấy thông tin kho của thủ kho đang đăng nhập
  private async getAssignment(id_user: number) {
    const assignment = await stockRepo.getStockkeeperAssignment(id_user);
    if (!assignment) throw new Error('Tài khoản chưa được phân công vào kho nào. Liên hệ Admin!');
    return assignment;
  }

  // =============================================
  // A. QUÉT NHẬP KHO (Inbound Scan)
  // Logic: Hàng về → Ghi vào warehouse_inventory → Đổi status = TẠI KHO
  // =============================================
  async scanInbound(id_user: number, tracking_code: string, shelf_location?: string) {
    const assignment = await this.getAssignment(id_user);
    const { id_hub, id_spoke, hub_name, spoke_name } = assignment;
    const warehouse_name = hub_name || spoke_name;
    const id_location = assignment.hub_location_id || assignment.spoke_location_id;

    const order = await stockRepo.findOrderByTracking(tracking_code);
    if (!order) throw new Error(`Không tìm thấy đơn hàng: ${tracking_code}`);

    // Validate: Chỉ nhập kho các đơn trong trạng thái hợp lệ
    if (!INBOUND_ALLOWED_STATUSES.includes(order.status)) {
      throw new Error(
        `Không thể nhập kho! Đơn đang ở trạng thái "${order.status}".\n` +
        `Chỉ chấp nhận nhập kho: ${INBOUND_ALLOWED_STATUSES.join(', ')}`
      );
    }

    const client = await stockRepo.getTxClient();
    try {
      await client.query('BEGIN');

      // Ghi nhận vào warehouse_inventory (UPSERT - di chuyển kho)
      await stockRepo.upsertInventory(order.id_order, id_hub, id_spoke, shelf_location || null, client);

      // Đổi trạng thái đơn → TẠI KHO
      await stockRepo.updateOrderStatus(order.id_order, 'TẠI KHO', client);

      // Ghi log timeline
      await stockRepo.insertOrderLog(
        order.id_order, id_location, id_user,
        `NHẬP KHO: ${warehouse_name}${shelf_location ? ` - Kệ ${shelf_location}` : ''}`,
        client
      );

      await client.query('COMMIT');

      return {
        tracking_code,
        new_status: 'TẠI KHO',
        warehouse: warehouse_name,
        shelf_location: shelf_location || 'Chưa có vị trí kệ',
        message: `Nhập kho thành công tại ${warehouse_name}!`
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // =============================================
  // B. QUÉT XUẤT KHO (Outbound Scan)
  // Ràng buộc Docx: Không được xuất nếu chưa nhập tại kho này
  // =============================================
  async scanOutbound(id_user: number, tracking_code: string) {
    const assignment = await this.getAssignment(id_user);
    const { id_hub, id_spoke, hub_name, spoke_name } = assignment;
    const warehouse_name = hub_name || spoke_name;
    const id_location = assignment.hub_location_id || assignment.spoke_location_id;

    const order = await stockRepo.findOrderByTracking(tracking_code);
    if (!order) throw new Error(`Không tìm thấy đơn hàng: ${tracking_code}`);

    // Ràng buộc Docx: Phải ở trạng thái TẠI KHO
    if (order.status !== 'TẠI KHO') {
      throw new Error(`Không thể xuất kho! Đơn đang ở "${order.status}". Phải ở trạng thái "TẠI KHO".`);
    }

    // Ràng buộc Docx: Phải đã nhập kho tại chính kho này
    const inventoryRecord = await stockRepo.findInventoryRecord(order.id_order, id_hub, id_spoke);
    if (!inventoryRecord) {
      throw new Error(
        `Đơn hàng này CHƯA được nhập kho tại ${warehouse_name}! ` +
        `Không thể xuất kho khi chưa có bản ghi nhập kho tại đây.`
      );
    }

    const client = await stockRepo.getTxClient();
    try {
      await client.query('BEGIN');

      // Xóa khỏi warehouse_inventory
      await stockRepo.removeInventory(order.id_order, client);

      // Đổi trạng thái → ĐANG TRUNG CHUYỂN (chờ Shipper tiếp nhận)
      await stockRepo.updateOrderStatus(order.id_order, 'ĐANG TRUNG CHUYỂN', client);

      // Ghi log
      await stockRepo.insertOrderLog(
        order.id_order, id_location, id_user,
        `XUẤT KHO: ${warehouse_name} → Chờ giao tiếp`,
        client
      );

      await client.query('COMMIT');

      return {
        tracking_code,
        new_status: 'ĐANG TRUNG CHUYỂN',
        warehouse: warehouse_name,
        message: `Xuất kho thành công từ ${warehouse_name}! Đơn đang chờ Shipper tiếp nhận.`
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // =============================================
  // C. XEM DANH SÁCH HÀNG TRONG KHO
  // =============================================
  async getInventory(id_user: number) {
    const assignment = await this.getAssignment(id_user);
    const items = await stockRepo.getInventoryList(assignment.id_hub, assignment.id_spoke);

    // Phân loại tự động (theo Docx): hàng cần chuyển tiếp vs hàng chờ giao
    const to_forward = items.filter((i: any) => {
      // Nếu địa chỉ đích không thuộc Spoke này → cần chuyển tiếp lên Hub
      return assignment.id_spoke && !i.province; // Logic đơn giản
    });

    return {
      warehouse: assignment.hub_name || assignment.spoke_name,
      total_items: items.length,
      items: items.map((i: any) => ({
        ...i,
        hours_in_warehouse: parseFloat(i.hours_in_warehouse || 0).toFixed(1),
        is_overdue: parseFloat(i.hours_in_warehouse || 0) >= 24
      }))
    };
  }

  // =============================================
  // D. CẢNH BÁO TỒN KHO >24H (theo Docx)
  // =============================================
  async getOverdueAlerts(id_user: number) {
    const assignment = await this.getAssignment(id_user);
    const alerts = await stockRepo.getOverdueAlerts(assignment.id_hub, assignment.id_spoke);

    return {
      warehouse: assignment.hub_name || assignment.spoke_name,
      total_overdue: alerts.length,
      warning: alerts.length > 0
        ? `⚠️ Có ${alerts.length} đơn hàng tồn kho quá 24 giờ chưa được điều phối!`
        : '✅ Không có đơn nào tồn kho quá 24 giờ.',
      items: alerts.map((a: any) => ({
        ...a,
        hours_in_warehouse: parseFloat(a.hours_in_warehouse || 0).toFixed(1)
      }))
    };
  }
}
