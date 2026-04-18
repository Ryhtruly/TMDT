import { RoutingRepository } from '../repositories/routing.repository';

const routingRepo = new RoutingRepository();

// Tính khoảng cách Haversine giữa 2 tọa độ GPS (km)
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export class RoutingService {
  // =============================================
  // A. TỰ ĐỘNG TẠO TUYẾN ĐƯỜNG CHO ĐƠN HÀNG
  //    Logic Hub-and-Spoke:
  //    - Cùng Spoke       → DIRECT (Spoke)
  //    - Cùng Hub         → INTRA_HUB (Spoke → Hub → Spoke)
  //    - Khác Hub         → INTER_HUB (Spoke → Hub → Hub → Spoke)
  // =============================================
  async resolveRoute(id_store: number, id_dest_area: number, service_type?: string) {
    // Docx dòng 1588-1591: Nếu dịch vụ = hỏa tốc → Lộ trình A → B, KHÔNG qua kho
    if (service_type && service_type.toUpperCase().includes('HỎA TỐC')) {
      const dest = await routingRepo.findDestSpokeByArea(id_dest_area);
      return {
        id_route: null,
        route_type: 'EXPRESS',
        origin: 'Địa chỉ Shop',
        destination: 'Địa chỉ người nhận',
        total_nodes: 0,
        nodes: [],
        is_cached: false,
        note: 'Hỏa tốc: Giao trực tiếp A → B, không qua kho trung chuyển.'
      };
    }

    const origin = await routingRepo.findOriginSpokeByStore(id_store);
    const dest = await routingRepo.findDestSpokeByArea(id_dest_area);

    if (!dest) throw new Error('Không tìm thấy Spoke phụ trách khu vực giao hàng.');

    // Nếu không tìm được origin → dùng Spoke đầu tiên trong hệ thống
    const originSpoke = origin?.id_spoke || dest.id_spoke;
    const originHub = origin?.id_hub || dest.id_hub;

    // Xác định loại tuyến
    let route_type: string;
    if (originSpoke === dest.id_spoke) {
      route_type = 'DIRECT';
    } else if (originHub === dest.id_hub) {
      route_type = 'INTRA_HUB';
    } else {
      route_type = 'INTER_HUB';
    }

    // Kiểm tra route đã tồn tại chưa
    let existingRoute = await routingRepo.findExistingRoute(originSpoke, dest.id_spoke);
    if (existingRoute) {
      const nodes = await routingRepo.getRouteNodes(existingRoute.id_route);
      return {
        id_route: existingRoute.id_route,
        route_type: existingRoute.route_type,
        origin: origin?.spoke_name || 'N/A',
        destination: dest.spoke_name,
        total_nodes: existingRoute.total_nodes,
        nodes,
        is_cached: true
      };
    }

    // Tạo route mới + nodes
    const client = await routingRepo.getTxClient();
    try {
      await client.query('BEGIN');

      const nodes: { id_location: number; stop_order: number; is_intermediate: boolean; name: string }[] = [];

      if (route_type === 'DIRECT') {
        // Spoke → trực tiếp giao
        nodes.push({ id_location: dest.spoke_location, stop_order: 1, is_intermediate: false, name: dest.spoke_name });
      } else if (route_type === 'INTRA_HUB') {
        // Spoke gốc → Hub → Spoke đích
        const originSpokeLocation = origin?.spoke_location;
        const hubLocation = await routingRepo.getHubLocation(originHub);
        if (originSpokeLocation) nodes.push({ id_location: originSpokeLocation, stop_order: 1, is_intermediate: false, name: origin?.spoke_name || 'Spoke gốc' });
        if (hubLocation) nodes.push({ id_location: hubLocation, stop_order: 2, is_intermediate: true, name: origin?.hub_name || 'Hub' });
        nodes.push({ id_location: dest.spoke_location, stop_order: 3, is_intermediate: false, name: dest.spoke_name });
      } else {
        // INTER_HUB: Spoke A → Hub A → Hub B → Spoke B
        const originSpokeLocation = origin?.spoke_location;
        const hubALocation = await routingRepo.getHubLocation(originHub);
        const hubBLocation = await routingRepo.getHubLocation(dest.id_hub);
        if (originSpokeLocation) nodes.push({ id_location: originSpokeLocation, stop_order: 1, is_intermediate: false, name: origin?.spoke_name || 'Spoke gốc' });
        if (hubALocation) nodes.push({ id_location: hubALocation, stop_order: 2, is_intermediate: true, name: origin?.hub_name || 'Hub gốc' });
        if (hubBLocation && hubBLocation !== hubALocation) nodes.push({ id_location: hubBLocation, stop_order: 3, is_intermediate: true, name: dest.hub_name });
        nodes.push({ id_location: dest.spoke_location, stop_order: nodes.length + 1, is_intermediate: false, name: dest.spoke_name });
      }

      const id_route = await routingRepo.createRoute(originSpoke, dest.id_spoke, route_type, nodes.length, client);

      for (const node of nodes) {
        await routingRepo.addRouteNode(id_route, node.id_location, node.stop_order, node.is_intermediate, client);
      }

      await client.query('COMMIT');

      return {
        id_route,
        route_type,
        origin: origin?.spoke_name || 'N/A',
        destination: dest.spoke_name,
        total_nodes: nodes.length,
        nodes: nodes.map(n => ({ location_name: n.name, stop_order: n.stop_order, is_intermediate: n.is_intermediate })),
        is_cached: false
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Xem tất cả routes đã tạo
  async getAllRoutes() {
    return await routingRepo.getAllRoutes();
  }

  // Xem chi tiết 1 route
  async getRouteDetail(id_route: number) {
    const nodes = await routingRepo.getRouteNodes(id_route);
    if (!nodes.length) throw new Error('Route không tồn tại.');
    return { id_route, nodes };
  }

  // ==== AUTO-GENERATE ALGORITHM ====
  async autoGenerateRoute(origin_spoke_id: number, dest_spoke_id: number) {
    if (origin_spoke_id === dest_spoke_id) throw new Error('Bưu cục phát và bưu cục nhận không được trùng nhau.');
    
    const origin = await routingRepo.getSpokeWithLocation(origin_spoke_id);
    const dest = await routingRepo.getSpokeWithLocation(dest_spoke_id);
    
    if (!origin || !dest) throw new Error('Bưu cục không tồn tại.');

    const isSameProvince = origin.id_hub === dest.id_hub;
    const route_type = isSameProvince ? 'Nội tỉnh' : 'Liên Vùng';
    
    const hubOrigin = await routingRepo.getHubWithLocation(origin.id_hub);
    const hubDest = await routingRepo.getHubWithLocation(dest.id_hub);

    // Xây dựng danh sách các chặng
    const routeNodesToInsert = [];
    
    // Node 1: Spoke Phát
    routeNodesToInsert.push({ id_location: origin.id_location, is_intermediate: false });
    
    if (isSameProvince) {
      // Nội tỉnh: Spoke Phát -> Hub Chung -> Spoke Nhận
      routeNodesToInsert.push({ id_location: hubOrigin.id_location, is_intermediate: true });
    } else {
      // Liên Vùng: Spoke Phát -> Hub Kéo -> Hub Đẩy -> Spoke Nhận
      routeNodesToInsert.push({ id_location: hubOrigin.id_location, is_intermediate: true });
      routeNodesToInsert.push({ id_location: hubDest.id_location, is_intermediate: true });
    }
    
    // Node Cuối: Spoke Nhận
    routeNodesToInsert.push({ id_location: dest.id_location, is_intermediate: false });

    // Tạo Route vào DB với transaction
    const client = await routingRepo.getTxClient();
    try {
      await client.query('BEGIN');
      const id_route = await routingRepo.createRoute(origin_spoke_id, dest_spoke_id, route_type, routeNodesToInsert.length, client);

      // Chèn các nodes vào DB
      for (let i = 0; i < routeNodesToInsert.length; i++) {
        await routingRepo.addRouteNode(id_route, routeNodesToInsert[i].id_location, i + 1, routeNodesToInsert[i].is_intermediate, client);
      }
      await client.query('COMMIT');
      
      return { 
        id_route, 
        route_type, 
        origin_spoke_id, 
        dest_spoke_id, 
        total_nodes: routeNodesToInsert.length 
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
export const routingService = new RoutingService();
