import { StockkeeperRepository } from '../repositories/stockkeeper.repository';
import { extractProvinceDistrictWardFromAddress, isSameArea, isSameWardArea } from '../utils/location';
import { ORDER_STATUS, orderStatusEquals, orderStatusIn } from '../utils/orderStatus';
import { RoutingService } from './routing.service';

const stockRepo = new StockkeeperRepository();
const routingService = new RoutingService();

const STATUS_VN = {
  PICKED_UP: '\u0110\u00C3 \u004C\u1EA4\u0059 \u0048\u00C0\u004E\u0047',
  IN_TRANSIT: '\u0110\u0041\u004E\u0047 \u0054\u0052\u0055\u004E\u0047 \u0043\u0048\u0055\u0059\u1EC2\u004E',
  DELIVERY_FAILED: '\u0047\u0049\u0041\u004F \u0054\u0048\u1EA4\u0054 \u0042\u1EA0\u0049',
  AT_WAREHOUSE: '\u0054\u1EA0\u0049 \u004B\u0048\u004F',
  INBOUND_WAREHOUSE: '\u004E\u0048\u1EACP \u004B\u0048\u004F',
  RETURNING: '\u0110\u0041\u004E\u0047 \u0048\u004F\u00C0\u004E',
  DELIVERING: '\u0110\u0041\u004E\u0047 \u0047\u0049\u0041\u004F',
} as const;

const INBOUND_ALLOWED_STATUS_KEYS: Array<keyof typeof ORDER_STATUS> = [
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERY_FAILED',
  'AT_WAREHOUSE',
  'INBOUND_WAREHOUSE',
];
const OUTBOUND_ALLOWED_STATUS_KEYS: Array<keyof typeof ORDER_STATUS> = ['AT_WAREHOUSE', 'INBOUND_WAREHOUSE'];

export class StockkeeperService {
  private async attachRoutePlans(items: any[]) {
    return Promise.all(
      items.map(async (item: any) => {
        try {
          if (!item.id_store || !item.id_dest_area) {
            return { ...item, route_plan_nodes: [] };
          }

          const route = await routingService.resolveRoute(Number(item.id_store), Number(item.id_dest_area));
          return {
            ...item,
            route_plan_nodes: Array.isArray(route?.nodes) ? route.nodes : [],
          };
        } catch {
          return { ...item, route_plan_nodes: [] };
        }
      })
    );
  }

  private buildTransitContext(item: any, assignmentLocationId: number | null) {
    const rawNodes = Array.isArray(item.route_plan_nodes) ? item.route_plan_nodes : [];
    const isReturnFlow =
      !!item.is_return ||
      orderStatusIn(item.status, [ORDER_STATUS.RETURNING, ORDER_STATUS.DELIVERY_FAILED]) ||
      String(item.last_action || '').includes('HOAN');
    const routeNodes = isReturnFlow ? [...rawNodes].reverse() : rawNodes;

    if (!routeNodes.length) return null;

    const departureIndex = routeNodes.findIndex(
      (node: any) => Number(node.id_location || 0) === Number(item.last_location_id || 0)
    );
    if (departureIndex < 0) return null;

    const nextNode = routeNodes[departureIndex + 1] || null;
    if (!nextNode?.id_location) return null;

    const assignmentMatchesDeparture =
      assignmentLocationId && Number(assignmentLocationId) === Number(item.last_location_id);
    const assignmentMatchesArrival =
      assignmentLocationId && Number(assignmentLocationId) === Number(nextNode.id_location);

    if (!assignmentMatchesDeparture && !assignmentMatchesArrival) {
      return null;
    }

    return {
      direction: assignmentMatchesDeparture ? 'OUTBOUND' : 'INBOUND',
      from_location_id: Number(item.last_location_id),
      from_location_name: item.last_location_name,
      from_location_type: item.last_location_type,
      to_location_id: Number(nextNode.id_location),
      to_location_name: nextNode.location_name,
      to_location_type: nextNode.location_type,
      route_plan_nodes: routeNodes,
    };
  }

  private async resolveAssignedShipper(id_spoke: number, receiverAddress: string) {
    const parsed = extractProvinceDistrictWardFromAddress(receiverAddress || '');
    if (!parsed) return null;

    const assignments = await stockRepo.getWardAssignmentsBySpoke(id_spoke);
    if (!assignments.length) return null;

    const exactWard = assignments.find(
      (a: any) => a.ward && isSameWardArea(a.province, a.district, a.ward, parsed.province, parsed.district, parsed.ward)
    );
    if (exactWard) return Number(exactWard.id_shipper);

    const districtFallback = assignments.find(
      (a: any) => !a.ward && isSameArea(a.province, a.district, parsed.province, parsed.district)
    );
    if (districtFallback) return Number(districtFallback.id_shipper);

    return null;
  }

  private async getAssignment(id_user: number) {
    const assignment = await stockRepo.getStockkeeperAssignment(id_user);
    if (!assignment) throw new Error('Tai khoan chua duoc phan cong vao kho nao. Lien he admin!');
    return assignment;
  }

  private async getOrdersFromBag(bag_code: string) {
    const { pool } = require('../config/db');
    const bagResult = await pool.query('SELECT * FROM bags WHERE bag_code = $1', [bag_code]);
    if (!bagResult.rows[0]) throw new Error(`Khong tim thay bao kien: ${bag_code}`);

    const bagItems = await pool.query(
      'SELECT o.tracking_code FROM bag_items bi JOIN orders o ON bi.id_order = o.id_order WHERE bi.id_bag = $1',
      [bagResult.rows[0].id_bag]
    );
    return bagItems.rows.map((row: any) => row.tracking_code);
  }

  async scanInbound(id_user: number, tracking_code: string, shelf_location?: string) {
    if (tracking_code.startsWith('B-')) {
      const orderCodes = await this.getOrdersFromBag(tracking_code);
      let successCount = 0;
      const errorMessages: string[] = [];

      for (const code of orderCodes) {
        try {
          await this.scanInboundSingle(id_user, code, shelf_location);
          successCount += 1;
        } catch (error: any) {
          errorMessages.push(`Loi ${code}: ${error.message}`);
        }
      }

      await stockRepo.updateBagStatus(tracking_code, 'RECEIVED');
      return {
        tracking_code,
        new_status: STATUS_VN.AT_WAREHOUSE,
        warehouse: `Bao kien gom ${orderCodes.length} don`,
        shelf_location: shelf_location || '',
        message: `Quet bao kien thanh cong ${successCount}/${orderCodes.length} don. ${errorMessages.join(' | ')}`.trim(),
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
    if (!order) throw new Error(`Khong tim thay don: ${tracking_code}`);

    if (order.id_service_type === 3) {
      throw new Error(`Don giao hoa toc khong duoc phep nhap kho!`);
    }

    if (!orderStatusIn(order.status, INBOUND_ALLOWED_STATUS_KEYS)) {
      throw new Error(`Don "${order.status}". Chi chap nhan: DA LAY HANG, DANG TRUNG CHUYEN, GIAO THAT BAI, TAI KHO, NHAP KHO`);
    }

    // Verify warehouse is in route plan
    const route = await routingService.resolveRoute(Number(order.id_store), Number(order.id_dest_area));
    const validLocationIds = Array.isArray(route?.nodes) ? route.nodes.map((n: any) => Number(n.id_location)) : [];
    
    if (validLocationIds.length > 0 && !validLocationIds.includes(Number(idLocation))) {
      throw new Error(`Kho ${warehouseName} khong thuoc tuyen duong cua don hang nay!`);
    }

    const client = await stockRepo.getTxClient();
    try {
      await client.query('BEGIN');
      await stockRepo.upsertInventory(order.id_order, id_hub, id_spoke, shelf_location || null, client);
      await stockRepo.updateOrderStatus(order.id_order, STATUS_VN.AT_WAREHOUSE, client);
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
        new_status: STATUS_VN.AT_WAREHOUSE,
        warehouse: warehouseName,
        shelf_location: shelf_location || 'Chua co',
        message: 'Nhap kho thanh cong!',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async scanOutbound(id_user: number, tracking_code: string) {
    if (tracking_code.startsWith('B-')) {
      const orderCodes = await this.getOrdersFromBag(tracking_code);
      let successCount = 0;
      const errorMessages: string[] = [];

      for (const code of orderCodes) {
        try {
          await this.scanOutboundSingleV2(id_user, code);
          successCount += 1;
        } catch (error: any) {
          errorMessages.push(`Loi ${code}: ${error.message}`);
        }
      }

      await stockRepo.updateBagStatus(tracking_code, 'IN_TRANSIT');
      return {
        tracking_code,
        new_status: 'CAP NHAT THEO DON',
        warehouse: `Bao kien gom ${orderCodes.length} don`,
        message: `Xuat kho ma bao thanh cong ${successCount}/${orderCodes.length} don. ${errorMessages.join(' | ')}`.trim(),
      };
    }

    return this.scanOutboundSingleV2(id_user, tracking_code);
  }

  async scanOutboundSingle(id_user: number, tracking_code: string) {
    const assignment = await this.getAssignment(id_user);
    const { id_hub, id_spoke, hub_name, spoke_name } = assignment;
    const warehouseName = hub_name || spoke_name;
    const idLocation = assignment.hub_location_id || assignment.spoke_location_id;

    const order = await stockRepo.findOrderByTracking(tracking_code);
    if (!order) throw new Error(`Khong tim thay don: ${tracking_code}`);

    if (!orderStatusIn(order.status, OUTBOUND_ALLOWED_STATUS_KEYS)) {
      throw new Error(`Don dang o "${order.status}". Phai la "TAI KHO".`);
    }

    const inventoryRecord = await stockRepo.findInventoryRecord(order.id_order, id_hub, id_spoke);
    if (!inventoryRecord) throw new Error(`Don chua duoc nhap kho tai ${warehouseName}!`);

    const dest_hub = order.dest_hub;
    const dest_spoke = order.dest_spoke;
    const next_hop_id = order.next_hop_id;
    const isReturnFlow = order.is_return || orderStatusEquals(order.status, ORDER_STATUS.DELIVERY_FAILED);

    let nextStatus: string = STATUS_VN.IN_TRANSIT;
    let nextMessage = 'Xuat kho thanh cong! Dang tren duong trung chuyen.';
    let assignedShipperId = null;

    if (dest_hub && !dest_spoke) {
      if (isReturnFlow && next_hop_id === id_hub) {
        nextStatus = STATUS_VN.AT_WAREHOUSE;
        nextMessage = 'Xuat kho thanh cong! Dang hoan hang ve shop.';
      }
    } else if (dest_spoke && id_spoke !== dest_spoke) {
      nextStatus = STATUS_VN.IN_TRANSIT;
      nextMessage = 'Xuat kho thanh cong! Dang tren duong di chi nhanh dich.';
    } else if (dest_spoke && id_spoke === dest_spoke) {
      if (isReturnFlow) {
        nextStatus = STATUS_VN.RETURNING;
        nextMessage = 'Xuat kho thanh cong! Dang hoan hang ve shop.';
      } else {
        nextStatus = STATUS_VN.DELIVERING;
        nextMessage = 'Xuat kho thanh cong! San sang giao cho nguoi nhan.';
        assignedShipperId = await this.resolveAssignedShipper(id_spoke, order.receiver_address || '');
      }
    }

    const client = await stockRepo.getTxClient();
    try {
      await client.query('BEGIN');
      await stockRepo.removeInventory(order.id_order, client);
      await stockRepo.updateOrderStatus(order.id_order, nextStatus, client);
      await stockRepo.updateCurrentShipper(order.id_order, assignedShipperId, client);
      await stockRepo.insertOrderLog(order.id_order, idLocation, id_user, 'XUAT KHO', client);
      await client.query('COMMIT');

      return {
        tracking_code,
        new_status: nextStatus,
        warehouse: warehouseName,
        assigned_shipper_id: assignedShipperId,
        message: nextMessage,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async scanOutboundSingleV2(id_user: number, tracking_code: string) {
    const assignment = await this.getAssignment(id_user);
    const { id_hub, id_spoke, hub_name, spoke_name } = assignment;
    const warehouseName = hub_name || spoke_name;
    const idLocation = assignment.hub_location_id || assignment.spoke_location_id;

    const order = await stockRepo.findOrderByTracking(tracking_code);
    if (!order) throw new Error(`Khong tim thay don: ${tracking_code}`);

    if (!orderStatusIn(order.status, OUTBOUND_ALLOWED_STATUS_KEYS)) {
      throw new Error(`Don dang o "${order.status}". Phai la "TAI KHO".`);
    }

    const inventoryRecord = await stockRepo.findInventoryRecord(order.id_order, id_hub, id_spoke);
    if (!inventoryRecord) throw new Error(`Don chua duoc nhap kho tai ${warehouseName}!`);

    const dest_hub = order.dest_hub;
    const dest_spoke = order.dest_spoke;
    const next_hop_id = order.next_hop_id;
    const isReturnFlow = order.is_return || orderStatusEquals(order.status, ORDER_STATUS.DELIVERY_FAILED);

    let nextStatus: string = STATUS_VN.IN_TRANSIT;
    let nextMessage = 'Xuat kho thanh cong! Dang tren duong trung chuyen.';
    let outboundAction = 'XUAT KHO';
    let assignedShipperId = null;

    if (dest_hub && !dest_spoke) {
      if (isReturnFlow && next_hop_id === id_hub) {
        nextStatus = STATUS_VN.AT_WAREHOUSE;
        nextMessage = 'Xuat kho thanh cong! Dang hoan hang ve shop.';
      }
    } else if (dest_spoke && id_spoke !== dest_spoke) {
      nextStatus = STATUS_VN.IN_TRANSIT;
      nextMessage = 'Xuat kho thanh cong! Dang tren duong di chi nhanh dich.';
    } else if (dest_spoke && id_spoke === dest_spoke) {
      if (isReturnFlow) {
        nextStatus = STATUS_VN.RETURNING;
        nextMessage = 'Xuat kho thanh cong! Dang hoan hang ve shop.';
      } else {
        nextStatus = STATUS_VN.PICKED_UP;
        nextMessage = 'Xuat kho thanh cong! Don da san sang cho shipper cuoi chang nhan va bat dau giao.';
        outboundAction = 'XUAT KHO -> GIAO CUOI';
      }
    }

    const client = await stockRepo.getTxClient();
    try {
      await client.query('BEGIN');
      await stockRepo.removeInventory(order.id_order, client);
      await stockRepo.updateOrderStatus(order.id_order, nextStatus, client);
      await stockRepo.updateCurrentShipper(order.id_order, assignedShipperId, client);
      await stockRepo.insertOrderLog(order.id_order, idLocation, id_user, outboundAction, client);
      await client.query('COMMIT');

      return {
        tracking_code,
        new_status: nextStatus,
        warehouse: warehouseName,
        assigned_shipper_id: assignedShipperId,
        message: nextMessage,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getInventory(id_user: number) {
    const assignment = await this.getAssignment(id_user);
    const items = await stockRepo.getInventoryList(assignment.id_hub || null, assignment.id_spoke || null);
    const itemsWithRoutes = await this.attachRoutePlans(items);

    return {
      warehouse: assignment.hub_name || assignment.spoke_name || 'Kho hien tai',
      total_items: itemsWithRoutes.length,
      items: itemsWithRoutes.map((item: any) => ({
        ...item,
        warehouse_name: item.current_warehouse_name || item.warehouse_name,
        hours_in_warehouse: parseFloat(item.hours_in_warehouse || '0').toFixed(1),
        is_overdue: parseFloat(item.hours_in_warehouse || '0') >= 24,
      })),
    };
  }

  async getOverdueAlerts(id_user: number) {
    const assignment = await this.getAssignment(id_user);
    const alerts = await stockRepo.getOverdueAlerts(assignment.id_hub || null, assignment.id_spoke || null);
    const alertsWithRoutes = await this.attachRoutePlans(alerts);

    return {
      warehouse: assignment.hub_name || assignment.spoke_name || 'Kho hien tai',
      total_overdue: alertsWithRoutes.length,
      warning: alertsWithRoutes.length > 0
        ? `Co ${alertsWithRoutes.length} don hang ton kho qua 24 gio chua duoc dieu phoi.`
        : 'Khong co don nao ton kho qua 24h.',
      items: alertsWithRoutes.map((item: any) => ({
        ...item,
        hours_in_warehouse: parseFloat(item.hours_in_warehouse || '0').toFixed(1),
      })),
    };
  }

  async getTransitOrders(id_user: number) {
    const assignment = await this.getAssignment(id_user);
    const assignmentLocationId = Number(assignment.hub_location_id || assignment.spoke_location_id || 0) || null;
    const items = await stockRepo.getTransitOrders();
    const itemsWithRoutes = await this.attachRoutePlans(items);

    const relatedItems = itemsWithRoutes
      .map((item: any) => {
        const context = this.buildTransitContext(item, assignmentLocationId);
        if (!context) return null;
        return {
          ...item,
          ...context,
          transit_hours: parseFloat(item.transit_hours || '0').toFixed(1),
        };
      })
      .filter(Boolean);

    return {
      warehouse: assignment.hub_name || assignment.spoke_name || 'Kho hien tai',
      total_items: relatedItems.length,
      outgoing: relatedItems.filter((item: any) => item.direction === 'OUTBOUND'),
      incoming: relatedItems.filter((item: any) => item.direction === 'INBOUND'),
      items: relatedItems,
    };
  }

  async getBagSuggestions(id_user: number) {
    const assignment = await this.getAssignment(id_user);
    if (!assignment.id_hub) throw new Error('Gom bao lien Hub chi danh cho Hub.');

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
    return stockRepo.getBagsForWarehouse(assignment.id_hub || null, assignment.id_spoke || null);
  }

  async getSpokeSuggestions(id_user: number) {
    const assignment = await this.getAssignment(id_user);
    if (!assignment.id_hub) throw new Error('Gom bao ve Spoke chi danh cho Hub.');

    const orders = await stockRepo.getOrdersForBagging(assignment.id_hub, null);
    const spokesResult = await require('../config/db').pool.query('SELECT * FROM spokes WHERE id_hub = $1', [assignment.id_hub]);
    return spokesResult.rows.map((s: any) => {
      const matched = orders.filter((o: any) => o.dest_spoke_id === s.id_spoke && o.next_hop_type === 'SPOKE');
      return {
        id_spoke: s.id_spoke,
        name: s.spoke_name,
        orders: matched.length,
        items: matched.map((o: any) => o.tracking_code),
      };
    });
  }

  async createBag(id_user: number, dest_id: number, order_ids: number[], next_hop_type?: 'HUB' | 'SPOKE') {
    const assignment = await this.getAssignment(id_user);
    if (!order_ids.length) throw new Error('Khong co don hang de gom bao.');

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
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
