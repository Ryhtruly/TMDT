import { StockkeeperRepository } from '../repositories/stockkeeper.repository';
import { extractProvinceDistrictWardFromAddress, isSameArea, isSameWardArea } from '../utils/location';
import { ORDER_STATUS, orderStatusIn } from '../utils/orderStatus';

const NORMALIZED_INBOUND_ALLOWED_STATUSES = [
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.IN_TRANSIT,
  ORDER_STATUS.DELIVERY_FAILED,
  ORDER_STATUS.RETURNING,
  ORDER_STATUS.AT_WAREHOUSE,
  ORDER_STATUS.INBOUND_WAREHOUSE,
];
const NORMALIZED_OUTBOUND_ALLOWED_STATUSES = [ORDER_STATUS.AT_WAREHOUSE, ORDER_STATUS.INBOUND_WAREHOUSE, ORDER_STATUS.RETURNING];

const stockRepo = new StockkeeperRepository();

const STATUS_AT_WAREHOUSE = 'Táº I KHO';
const LEGACY_STATUS_AT_WAREHOUSE = 'T?I KHO';
const INBOUND_ALLOWED_STATUSES = ['ÄÃƒ Láº¤Y HÃ€NG', 'ÄANG TRUNG CHUYá»‚N', 'GIAO THáº¤T Báº I', STATUS_AT_WAREHOUSE, LEGACY_STATUS_AT_WAREHOUSE, 'NHáº¬P KHO'];
const OUTBOUND_ALLOWED_STATUSES = [STATUS_AT_WAREHOUSE, LEGACY_STATUS_AT_WAREHOUSE, 'NHáº¬P KHO'];

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
    if (!assignment) throw new Error('TÃ i khoáº£n chÆ°a Ä‘Æ°á»£c phÃ¢n cÃ´ng vÃ o kho nÃ o. LiÃªn há»‡ admin!');
    return assignment;
  }

  private async getOrdersFromBag(bag_code: string) {
    const { pool } = require('../config/db');
    const bagResult = await pool.query('SELECT * FROM bags WHERE bag_code = $1', [bag_code]);
    if (!bagResult.rows[0]) throw new Error('KhÃ´ng tÃ¬m tháº¥y bao kiá»‡n: ' + bag_code);
    const bag_items = await pool.query('SELECT o.tracking_code FROM bag_items bi JOIN orders o ON bi.id_order = o.id_order WHERE bi.id_bag = $1', [bagResult.rows[0].id_bag]);
    return {
      bagInfo: bagResult.rows[0],
      orderCodes: bag_items.rows.map((r: any) => r.tracking_code)
    };
  }

  async scanInbound(id_user: number, tracking_code: string, shelf_location?: string) {
    if (tracking_code.startsWith('B-')) {
      const { bagInfo, orderCodes } = await this.getOrdersFromBag(tracking_code);

      if (bagInfo.status !== 'IN_TRANSIT') {
        throw new Error(`Bao kiá»‡n Ä‘ang á»Ÿ tráº¡ng thÃ¡i ${bagInfo.status}. Pháº£i xuáº¥t kho bao (IN_TRANSIT) tá»« Ä‘iá»ƒm trÆ°á»›c Ä‘Ã³ má»›i Ä‘Æ°á»£c phÃ©p nháº­p.`);
      }

      const assignment = await this.getAssignment(id_user);
      if (bagInfo.dest_spoke_id) {
        if (Number(bagInfo.dest_spoke_id) !== Number(assignment.id_spoke)) {
          throw new Error(`TuyÃªÌn Ä‘Æ°Æ¡Ì€ng sai! Bao kiá»‡n nÃ y cÃ³ Ä‘iá»ƒm Ä‘áº¿n lÃ  BÆ°u cá»¥c #${bagInfo.dest_spoke_id}, khÃ´ng pháº£i bÆ°u cá»¥c hiá»‡n táº¡i.`);
        }
      } else if (bagInfo.dest_hub_id && Number(bagInfo.dest_hub_id) !== Number(assignment.id_hub)) {
        throw new Error(`TuyÃªÌn Ä‘Æ°Æ¡Ì€ng sai! Bao kiá»‡n nÃ y cÃ³ Ä‘iá»ƒm Ä‘áº¿n lÃ  Hub #${bagInfo.dest_hub_id}, khÃ´ng pháº£i kho hiá»‡n táº¡i.`);
      }

      let successCount = 0; let errorMessages: string[] = [];
      for (const code of orderCodes) {
        try { await this.scanInboundSingle(id_user, code, shelf_location); successCount++; }
        catch(e: any) { errorMessages.push(`Lá»—i ${code}: ${e.message}`); }
      }
      await stockRepo.updateBagStatus(tracking_code, 'RECEIVED');
      return {
        tracking_code, new_status: ORDER_STATUS.AT_WAREHOUSE, warehouse: 'Bao kiá»‡n gá»“m ' + orderCodes.length + ' Ä‘Æ¡n',
        shelf_location: shelf_location || '', message: `QuÃ©t bao kiá»‡n thÃ nh cÃ´ng ${successCount}/${orderCodes.length} Ä‘Æ¡n. Bao kiá»‡n Ä‘Ã£ Ä‘Æ°á»£c rÃ£. ` + errorMessages.join(' | ')
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
    if (!order) throw new Error(`KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n: ${tracking_code}`);

    if (!orderStatusIn(order.status, NORMALIZED_INBOUND_ALLOWED_STATUSES)) {
      throw new Error(`ÄÆ¡n "${order.status}". Chá»‰ cháº¥p nháº­n: ${INBOUND_ALLOWED_STATUSES.join(', ')}`);
    }

    const validHubs = new Set<number>();
    const validSpokes = new Set<number>();

    if (order.dest_hub) validHubs.add(Number(order.dest_hub));
    if (order.dest_spoke) validSpokes.add(Number(order.dest_spoke));

    // Resolve origin spoke/hub tá»« Ä‘á»‹a chá»‰ store
    const originLocation = await stockRepo.resolveSpokeAndHubByAddress(order.store_address || '');
    if (originLocation?.id_hub) validHubs.add(Number(originLocation.id_hub));
    if (originLocation?.id_spoke) validSpokes.add(Number(originLocation.id_spoke));

    const onRoute = (id_hub && validHubs.has(Number(id_hub))) ||
                    (id_spoke && validSpokes.has(Number(id_spoke)));

    if (!onRoute) {
      if (order.id_service_type === 3) {
        throw new Error(`Tuyáº¿n Ä‘Æ°á»ng sai! ÄÃ¢y lÃ  Ä‘Æ¡n Há»a Tá»‘c (P2P), shipper giao trá»±c tiáº¿p khÃ´ng nháº­p kho.`);
      }
      throw new Error(`Tuyáº¿n Ä‘Æ°á»ng sai! ÄÆ¡n hÃ ng nÃ y khÃ´ng cÃ³ lá»™ trÃ¬nh Ä‘i qua ${warehouseName}.`);
    }

    const client = await stockRepo.getTxClient();
    try {
      await client.query('BEGIN');
      await stockRepo.upsertInventory(order.id_order, id_hub, id_spoke, shelf_location || null, client);
      await stockRepo.updateOrderStatus(order.id_order, ORDER_STATUS.AT_WAREHOUSE, client);
      await stockRepo.insertOrderLog(order.id_order, idLocation, id_user, `NHAP KHO: ${warehouseName}${shelf_location ? ` - Ke ${shelf_location}` : ''}`, client);
      await client.query('COMMIT');
      return { tracking_code, new_status: ORDER_STATUS.AT_WAREHOUSE, warehouse: warehouseName, shelf_location: shelf_location || 'ChÆ°a cÃ³', message: `Nháº­p kho thÃ nh cÃ´ng!` };
    } catch (e) {
      await client.query('ROLLBACK'); throw e;
    } finally { client.release(); }
  }

  async scanOutbound(id_user: number, tracking_code: string) {
    if (tracking_code.startsWith('B-')) {
      const { bagInfo, orderCodes } = await this.getOrdersFromBag(tracking_code);

      if (bagInfo.status !== 'CREATED') {
        throw new Error(`Bao kiá»‡n Ä‘ang á»Ÿ tráº¡ng thÃ¡i ${bagInfo.status}. Chá»‰ cÃ³ thá»ƒ xuáº¥t cÃ¡c bao kiá»‡n vá»«a má»›i Ä‘Æ°á»£c gom (CREATED).`);
      }

      const assignment = await this.getAssignment(id_user);
      if (bagInfo.origin_hub_id && Number(bagInfo.origin_hub_id) !== Number(assignment.id_hub)) {
        throw new Error(`Bao kiá»‡n nÃ y xuáº¥t phÃ¡t tá»« Hub #${bagInfo.origin_hub_id}, khÃ´ng thá»ƒ xuáº¥t tá»« kho nÃ y!`);
      }

      let successCount = 0; let errorMessages: string[] = [];
      for (const code of orderCodes) {
        try { await this.scanOutboundSingle(id_user, code); successCount++; }
        catch(e: any) { errorMessages.push(`Lá»—i ${code}: ${e.message}`); }
      }
      await stockRepo.updateBagStatus(tracking_code, 'IN_TRANSIT');
      return {
        tracking_code, new_status: 'Cáº¬P NHáº¬T THEO ÄÆ N', warehouse: `Bao kiá»‡n gá»“m ${orderCodes.length} Ä‘Æ¡n`,
        message: `Xuáº¥t kho mÃ£ bao thÃ nh cÃ´ng ${successCount}/${orderCodes.length} Ä‘Æ¡n. ` + errorMessages.join(' | ')
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
    if (!order) throw new Error(`KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n: ${tracking_code}`);

    if (!orderStatusIn(order.status, NORMALIZED_OUTBOUND_ALLOWED_STATUSES)) {
      throw new Error(`ÄÆ¡n Ä‘ang á»Ÿ "${order.status}". Pháº£i lÃ  "${STATUS_AT_WAREHOUSE}".`);
    }

    const inventoryRecord = await stockRepo.findInventoryRecord(order.id_order, id_hub, id_spoke);
    if (!inventoryRecord) throw new Error(`ÄÆ¡n chÆ°a Ä‘Æ°á»£c nháº­p kho táº¡i ${warehouseName}!`);

    const dest_hub = order.dest_hub; const dest_spoke = order.dest_spoke;
    const isReturnFlow = order.is_return || orderStatusIn(order.status, [ORDER_STATUS.DELIVERY_FAILED]);

    let nextStatus = ORDER_STATUS.IN_TRANSIT; let nextMessage = 'Xuat kho thanh cong! Dang tren duong trung chuyen.';
    let logAction = 'XUAT KHO -> TRUNG CHUYEN';
    let assignedShipperId = null;

    if (isReturnFlow) {
      const originLocation = await stockRepo.resolveSpokeAndHubByAddress(order.store_address || '');
      const originHubId = originLocation?.id_hub ? Number(originLocation.id_hub) : null;
      const originSpokeId = originLocation?.id_spoke ? Number(originLocation.id_spoke) : null;

      if (originSpokeId && Number(id_spoke || 0) === originSpokeId) {
        nextStatus = ORDER_STATUS.RETURNED;
        nextMessage = 'Hoan hang ve shop thanh cong.';
        logAction = 'XUAT KHO -> HOAN TAT HOAN';
      } else if (originHubId && Number(id_hub || 0) === originHubId && !originSpokeId) {
        nextStatus = ORDER_STATUS.RETURNED;
        nextMessage = 'Hoan hang ve shop thanh cong.';
        logAction = 'XUAT KHO -> HOAN TAT HOAN';
      } else {
        nextStatus = ORDER_STATUS.IN_TRANSIT;
        nextMessage = 'Xuat kho thanh cong! Don dang hoan ve shop.';
        logAction = 'XUAT KHO -> HOAN HANG';
      }
    } else if (dest_hub && !dest_spoke) {
      nextStatus = ORDER_STATUS.IN_TRANSIT; nextMessage = 'Xuat kho thanh cong! Dang tren duong trung chuyen.'; logAction = 'XUAT KHO -> TRUNG CHUYEN';
    } else if (dest_spoke && id_spoke !== dest_spoke) {
      nextStatus = ORDER_STATUS.IN_TRANSIT; nextMessage = 'Xuat kho thanh cong! Dang tren duong di chi nhanh dich.'; logAction = 'XUAT KHO -> TRUNG CHUYEN';
    } else if (dest_spoke && id_spoke === dest_spoke) {
      nextStatus = ORDER_STATUS.PICKED_UP; nextMessage = 'Xuat kho thanh cong! Don san sang de shipper bat dau giao cuoi chang.'; assignedShipperId = await this.resolveAssignedShipper(id_spoke, order.receiver_address || ''); logAction = 'XUAT KHO -> GIAO CUOI';
    }

    const client = await stockRepo.getTxClient();
    try {
      await client.query('BEGIN');
      await stockRepo.removeInventory(order.id_order, client);
      await stockRepo.updateOrderStatus(order.id_order, nextStatus, client);
      await stockRepo.updateCurrentShipper(order.id_order, assignedShipperId, client);
      await stockRepo.insertOrderLog(order.id_order, idLocation, id_user, logAction, client);
      await client.query('COMMIT');
      return { tracking_code, new_status: nextStatus, warehouse: warehouseName, assigned_shipper_id: assignedShipperId, message: nextMessage };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  async getInventory(id_user: number) {
    await this.getAssignment(id_user);
    const items = await stockRepo.getInventoryList(null, null);
    return {
      warehouse: 'Toan bo tuyen kho',
      total_items: items.length,
      items: items.map((item: any) => ({
        ...item,
        warehouse_name: item.current_warehouse_name || item.warehouse_name,
        hours_in_warehouse: parseFloat(item.hours_in_warehouse || '0').toFixed(1),
        is_overdue: parseFloat(item.hours_in_warehouse || '0') >= 24,
      })),
    };
  }

  async getOverdueAlerts(id_user: number) { const assignment = await this.getAssignment(id_user); const alerts = await stockRepo.getOverdueAlerts(assignment.id_hub, assignment.id_spoke); return { warehouse: assignment.hub_name || assignment.spoke_name, total_overdue: alerts.length, warning: alerts.length > 0 ? `CÃ³ ${alerts.length} Ä‘Æ¡n hÃ ng tá»“n kho quÃ¡ 24 giá» chÆ°a Ä‘Æ°á»£c Ä‘iá»u phá»‘i!` : 'KhÃ´ng cÃ³ Ä‘Æ¡n nÃ o tá»“n kho quÃ¡ 24h.', items: alerts.map((item: any) => ({ ...item, hours_in_warehouse: parseFloat(item.hours_in_warehouse || '0').toFixed(1) })) }; }

  async getBagSuggestions(id_user: number) {
    const assignment = await this.getAssignment(id_user);
    if (!assignment.id_hub) throw new Error('Gom bao liÃªn Hub chá»‰ dÃ nh cho Hub.');
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
    if (!assignment.id_hub) throw new Error('Gom bao vá» Spoke chá»‰ dÃ nh cho Hub.');
    const orders = await stockRepo.getOrdersForBagging(assignment.id_hub, null);
    const spokesResult = await require('../config/db').pool.query('SELECT * FROM spokes WHERE id_hub = $1', [assignment.id_hub]);
    return spokesResult.rows.map((s: any) => {
      const matched = orders.filter((o: any) => o.dest_spoke_id === s.id_spoke && o.next_hop_type === 'SPOKE');
      return { id_spoke: s.id_spoke, name: s.spoke_name, orders: matched.length, items: matched.map((o: any) => o.tracking_code) };
    });
  }

  async createBag(id_user: number, dest_id: number, order_ids: number[], next_hop_type?: 'HUB' | 'SPOKE') {
    const assignment = await this.getAssignment(id_user);
    if (!order_ids.length) throw new Error('KhÃ´ng cÃ³ Ä‘Æ¡n hÃ ng Ä‘á»ƒ gom bao.');

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
