import { StockkeeperRepository } from '../repositories/stockkeeper.repository';
import { extractProvinceDistrictWardFromAddress, isSameArea, isSameWardArea } from '../utils/location';

const stockRepo = new StockkeeperRepository();

const INBOUND_ALLOWED_STATUSES = ['ĐÃ LẤY HÀNG', 'ĐANG TRUNG CHUYỂN', 'GIAO THẤT BẠI', 'TẠI KHO', 'NHẬP KHO'];
const OUTBOUND_ALLOWED_STATUSES = ['TẠI KHO', 'NHẬP KHO'];

export class StockkeeperService {
  private async resolveAssignedShipper(id_spoke: number, receiverAddress: string) {
    const parsed = extractProvinceDistrictWardFromAddress(receiverAddress || '');
    if (!parsed) return null;
    const assignments = await stockRepo.getWardAssignmentsBySpoke(id_spoke);
    if (!assignments.length) return null;
    const exactWard = assignments.find((a: any) => a.ward && isSameWardArea(a.province, a.district, a.ward, parsed.province, parsed.district, parsed.ward));
    if (exactWard) return Number(exactWard.id_shipper);
    const districtFallback = assignments.find((a: any) => !a.ward && isSameArea(a.province, a.district, parsed.province, parsed.district));
    if (districtFallback) return Number(districtFallback.id_shipper);
    return null;
  }

  private async getAssignment(id_user: number) {
    const assignment = await stockRepo.getStockkeeperAssignment(id_user);
    if (!assignment) throw new Error('Tài khoản chưa được phân công vào kho nào. Liên hệ admin!');
    return assignment;
  }

  private async getOrdersFromBag(bag_code: string) {
    const { pool } = require('../config/db');
    const bagResult = await pool.query('SELECT * FROM bags WHERE bag_code = $1', [bag_code]);
    if (!bagResult.rows[0]) throw new Error('Không tìm thấy bao kiện: ' + bag_code);
    const bag_items = await pool.query('SELECT o.tracking_code FROM bag_items bi JOIN orders o ON bi.id_order = o.id_order WHERE bi.id_bag = $1', [bagResult.rows[0].id_bag]);
    return bag_items.rows.map((r: any) => r.tracking_code);
  }

  async scanInbound(id_user: number, tracking_code: string, shelf_location?: string) {
    if (tracking_code.startsWith('B-')) {
      const orderCodes = await this.getOrdersFromBag(tracking_code);
      let successCount = 0; let errorMessages: string[] = [];
      for (const code of orderCodes) {
        try { await this.scanInboundSingle(id_user, code, shelf_location); successCount++; }
        catch(e: any) { errorMessages.push(`Lỗi ${code}: ${e.message}`); }
      }
      await stockRepo.updateBagStatus(tracking_code, 'RECEIVED');
      return {
        tracking_code, new_status: 'TẠI KHO', warehouse: 'Bao kiện gồm ' + orderCodes.length + ' đơn',
        shelf_location: shelf_location || '', message: `Quét bao kiện thành công ${successCount}/${orderCodes.length} đơn. Bao kiện đã được rã. ` + errorMessages.join(' | ')
      };
    }
    return this.scanInboundSingle(id_user, tracking_code, shelf_location);
  }

  async scanInboundSingle(id_user: number, tracking_code: string, shelf_location?: string) {
    const assignment = await this.getAssignment(id_user);
    const { id_hub, id_spoke, hub_name, spoke_name } = assignment;
    const warehouseName = hub_name || spoke_name;
    const idLocation = assignment.hub_location_id || assignment.spoke_location_id;

    const order = await stockRepo.findOrderByTracking(tracking_code);
    if (!order) throw new Error(`Không tìm thấy đơn: ${tracking_code}`);

    if (!INBOUND_ALLOWED_STATUSES.includes(order.status)) {
      throw new Error(`Đơn "${order.status}". Chỉ chấp nhận: ${INBOUND_ALLOWED_STATUSES.join(', ')}`);
    }

    const client = await stockRepo.getTxClient();
    try {
      await client.query('BEGIN');
      await stockRepo.upsertInventory(order.id_order, id_hub, id_spoke, shelf_location || null, client);
      await stockRepo.updateOrderStatus(order.id_order, 'TẠI KHO', client);
      await stockRepo.insertOrderLog(order.id_order, idLocation, id_user, `NHẬP KHO: ${warehouseName}${shelf_location ? ` - Kệ ${shelf_location}` : ''}`, client);
      await client.query('COMMIT');
      return { tracking_code, new_status: 'TẠI KHO', warehouse: warehouseName, shelf_location: shelf_location || 'Chưa có', message: `Nhập kho thành công!` };
    } catch (e) {
      await client.query('ROLLBACK'); throw e;
    } finally { client.release(); }
  }

  async scanOutbound(id_user: number, tracking_code: string) {
    if (tracking_code.startsWith('B-')) {
      const orderCodes = await this.getOrdersFromBag(tracking_code);
      let successCount = 0; let errorMessages: string[] = [];
      for (const code of orderCodes) {
        try { await this.scanOutboundSingle(id_user, code); successCount++; }
        catch(e: any) { errorMessages.push(`Lỗi ${code}: ${e.message}`); }
      }
      await stockRepo.updateBagStatus(tracking_code, 'IN_TRANSIT');
      return {
        tracking_code, new_status: 'CẬP NHẬT THEO ĐƠN', warehouse: `Bao kiện gồm ${orderCodes.length} đơn`,
        message: `Xuất kho mã bao thành công ${successCount}/${orderCodes.length} đơn. ` + errorMessages.join(' | ')
      };
    }
    return this.scanOutboundSingle(id_user, tracking_code);
  }

  async scanOutboundSingle(id_user: number, tracking_code: string) {
    const assignment = await this.getAssignment(id_user);
    const { id_hub, id_spoke, hub_name, spoke_name } = assignment;
    const warehouseName = hub_name || spoke_name;
    const idLocation = assignment.hub_location_id || assignment.spoke_location_id;

    const order = await stockRepo.findOrderByTracking(tracking_code);
    if (!order) throw new Error(`Không tìm thấy đơn: ${tracking_code}`);

    if (!OUTBOUND_ALLOWED_STATUSES.includes(order.status)) {
      throw new Error(`Đơn đang ở "${order.status}". Phải là "TẠI KHO".`);
    }

    const inventoryRecord = await stockRepo.findInventoryRecord(order.id_order, id_hub, id_spoke);
    if (!inventoryRecord) throw new Error(`Đơn chưa được nhập kho tại ${warehouseName}!`);

    const dest_hub = order.dest_hub; const dest_spoke = order.dest_spoke;
    const next_hop_id = order.next_hop_id;
    const isReturnFlow = order.is_return || order.status === 'GIAO THẤT BẠI';

    let nextStatus = 'ĐANG TRUNG CHUYỂN'; let nextMessage = 'Xuất kho thành công! Đang trên đường trung chuyển.';
    let assignedShipperId = null;

    if (dest_hub && !dest_spoke) {
      if (isReturnFlow && next_hop_id === id_hub) { nextStatus = 'TẠI KHO'; nextMessage = 'Xuất kho thành công! Đang hoàn hàng về shop.'; }
      else { nextStatus = 'ĐANG TRUNG CHUYỂN'; nextMessage = 'Xuất kho thành công! Đang trên đường trung chuyển.'; }
    } else if (dest_spoke && id_spoke !== dest_spoke) {
      nextStatus = 'ĐANG TRUNG CHUYỂN'; nextMessage = 'Xuất kho thành công! Đang trên đường đi chi nhánh đích.';
    } else if (dest_spoke && id_spoke === dest_spoke) {
      if (isReturnFlow) { nextStatus = 'ĐANG HOÀN'; nextMessage = 'Xuất kho thành công! Đang hoàn hàng về shop.'; }
      else { nextStatus = 'ĐANG GIAO'; nextMessage = 'Xuất kho thành công! Sẵn sàng giao cho người nhận.'; assignedShipperId = await this.resolveAssignedShipper(id_spoke, order.receiver_address || ''); }
    }

    const client = await stockRepo.getTxClient();
    try {
      await client.query('BEGIN');
      await stockRepo.removeInventory(order.id_order, client);
      await stockRepo.updateOrderStatus(order.id_order, nextStatus, client);
      await stockRepo.updateCurrentShipper(order.id_order, assignedShipperId, client);
      await stockRepo.insertOrderLog(order.id_order, idLocation, id_user, 'XUẤT KHO', client);
      await client.query('COMMIT');
      return { tracking_code, new_status: nextStatus, warehouse: warehouseName, assigned_shipper_id: assignedShipperId, message: nextMessage };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  async getInventory(id_user: number) { const assignment = await this.getAssignment(id_user); const items = await stockRepo.getInventoryList(assignment.id_hub, assignment.id_spoke); return { warehouse: assignment.hub_name || assignment.spoke_name, total_items: items.length, items: items.map((item: any) => ({ ...item, hours_in_warehouse: parseFloat(item.hours_in_warehouse || '0').toFixed(1), is_overdue: parseFloat(item.hours_in_warehouse || '0') >= 24 })) }; }

  async getOverdueAlerts(id_user: number) { const assignment = await this.getAssignment(id_user); const alerts = await stockRepo.getOverdueAlerts(assignment.id_hub, assignment.id_spoke); return { warehouse: assignment.hub_name || assignment.spoke_name, total_overdue: alerts.length, warning: alerts.length > 0 ? `Có ${alerts.length} đơn hàng tồn kho quá 24 giờ chưa được điều phối!` : 'Không có đơn nào tồn kho quá 24h.', items: alerts.map((item: any) => ({ ...item, hours_in_warehouse: parseFloat(item.hours_in_warehouse || '0').toFixed(1) })) }; }

  async getBagSuggestions(id_user: number) {
    const assignment = await this.getAssignment(id_user);
    if (!assignment.id_hub) throw new Error('Gom bao liên Hub chỉ dành cho Hub.');
    const orders = await stockRepo.getOrdersForBagging(assignment.id_hub, null);
    const groups = new Map<string, any>();

    for (const order of orders) {
      if (!order.next_hop_id || order.next_hop_type === 'UNKNOWN') continue;
      const key = `${order.next_hop_type}_${order.next_hop_id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          next_hop_type: order.next_hop_type,
          next_hop_id: Number(order.next_hop_id),
          next_hop_name: order.next_hop_name,
          orders: [],
        });
      }

      groups.get(key).orders.push({
        id_order: order.id_order,
        tracking_code: order.tracking_code,
        receiver_name: order.receiver_name,
        province: order.province,
        district: order.district,
        last_updated: order.last_updated,
      });
    }

    return Array.from(groups.values()).sort((a: any, b: any) =>
      String(a.next_hop_name || '').localeCompare(String(b.next_hop_name || ''), 'vi')
    );
  }

  async getBags(id_user: number) {
    const assignment = await this.getAssignment(id_user);
    return await stockRepo.getBagsForWarehouse(assignment.id_hub || null, assignment.id_spoke || null);
  }

  async getSpokeSuggestions(id_user: number) {
    const assignment = await this.getAssignment(id_user);
    if (!assignment.id_hub) throw new Error('Gom bao về Spoke chỉ dành cho Hub.');
    const orders = await stockRepo.getOrdersForBagging(assignment.id_hub, null);
    const spokesResult = await require('../config/db').pool.query('SELECT * FROM spokes WHERE id_hub = $1', [assignment.id_hub]);
    return spokesResult.rows.map((s: any) => {
      const matched = orders.filter((o: any) => o.dest_spoke_id === s.id_spoke && o.next_hop_type === 'SPOKE');
      return { id_spoke: s.id_spoke, name: s.spoke_name, orders: matched.length, items: matched.map((o: any) => o.tracking_code) };
    });
  }

  async createBag(id_user: number, dest_id: number, order_ids: number[], next_hop_type?: 'HUB' | 'SPOKE') {
    const assignment = await this.getAssignment(id_user);
    if (!order_ids.length) throw new Error('Không có đơn hàng để gom bao.');

    const client = await stockRepo.getTxClient();
    try {
      await client.query('BEGIN');
      let dest_hub_id = next_hop_type === 'HUB' || !next_hop_type ? dest_id : null;
      let dest_spoke_id = next_hop_type === 'SPOKE' ? dest_id : null;

      if (next_hop_type === 'SPOKE') {
        const spokeResult = await client.query('SELECT id_hub FROM spokes WHERE id_spoke = $1', [dest_id]);
        if (!spokeResult.rows[0]?.id_hub) throw new Error('Buu cuc dich khong hop le.');
        dest_hub_id = Number(spokeResult.rows[0].id_hub);
      }
      
      const bag_code = await stockRepo.createBag(assignment.id_hub, dest_hub_id, order_ids, client, dest_spoke_id);
      await client.query('COMMIT');
      return { bag_code };
    } catch(e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
