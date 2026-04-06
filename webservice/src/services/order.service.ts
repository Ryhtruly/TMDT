import { OrderRepository } from '../repositories/order.repository';
import { ShopRepository } from '../repositories/shop.repository';

const orderRepo = new OrderRepository();
const shopRepo = new ShopRepository();

// Tạo mã tracking chuẩn GHN format: QLKV + timestamp + random
const generateTrackingCode = (): string => {
  const prefix = 'QLKV';
  const ts = Date.now().toString().slice(-7);
  const rand = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `${prefix}${ts}${rand}`;
};

// Tính cân nặng quy đổi theo khối (volumetric weight) - chuẩn GHN: D*R*C / 6000
const calcVolumetricWeight = (length: number, width: number, height: number): number => {
  return Math.ceil((length * width * height) / 6000);
};

// Tính phí bảo hiểm theo Docx
const INSURANCE_THRESHOLD = 1_000_000;
const INSURANCE_RATE = 0.005;
const calcInsuranceFee = (item_value: number): number => {
  return item_value > INSURANCE_THRESHOLD ? Math.round(item_value * INSURANCE_RATE) : 0;
};

export class OrderService {
  // =============================================
  // A. XEM CÁC LOẠI DỊCH VỤ (Để Shop chọn)
  // =============================================
  async getServiceTypes() {
    return await orderRepo.getAllServiceTypes();
  }

  // =============================================
  // B. TÍNH PHÍ TRƯỚC KHI TẠO ĐƠN (Preview - Giống GHN)
  // =============================================
  async previewFee(input: any, id_user: number) {
    const { id_store, id_dest_area, weight, item_value = 0, id_service_type, length = 0, width = 0, height = 0 } = input;

    if (!id_store || !id_dest_area || !weight) {
      throw new Error('Cần cung cấp: id_store, id_dest_area, weight để tính phí.');
    }

    // Xác thực Store thuộc Shop đang đăng nhập
    const shop = await shopRepo.findShopByUserId(id_user);
    if (!shop) throw new Error('Không tìm thấy thông tin Shop.');

    const store = await orderRepo.findStoreByIdAndShop(id_store, shop.id_shop);
    if (!store) throw new Error('Kho hàng không tồn tại hoặc không thuộc Shop của bạn.');

    // Lấy vùng đích
    const destArea = await orderRepo.findAreaById(id_dest_area);
    if (!destArea) throw new Error('Khu vực giao hàng không hợp lệ.');

    // Tính cân nặng thực tế (lấy giá trị lớn hơn giữa cân thực và cân thể tích)
    const volumetric = calcVolumetricWeight(length, width, height);
    const billable_weight = Math.max(weight, volumetric);

    // Tìm bảng giá phù hợp
    const pricingRule = await orderRepo.findBestPricingRule(destArea.area_type, billable_weight);
    const base_fee = pricingRule ? Number(pricingRule.price) : 35000;

    // Nhân hệ số loại dịch vụ (Express = x1.5, Standard = x1.0...)
    let service_multiplier = 1.0;
    if (id_service_type) {
      const svcType = await orderRepo.findServiceType(id_service_type);
      if (svcType) service_multiplier = Number(svcType.base_multiplier);
    }

    const shipping_fee = Math.round(base_fee * service_multiplier);
    const insurance_fee = calcInsuranceFee(item_value);
    const total_fee = shipping_fee + insurance_fee;

    // Kiểm tra số dư ví (để báo trước cho Shop biết có đủ không)
    const wallet = await shopRepo.getWalletByUserId(id_user);
    const available = wallet ? (Number(wallet.balance) + Number(wallet.credit_limit) - Number(wallet.used_credit)) : 0;

    return {
      pickup_store: store.store_name,
      dest_province: destArea.province,
      dest_district: destArea.district,
      area_type: destArea.area_type,
      billable_weight,
      note_weight: volumetric > weight ? `Cân quy đổi (${volumetric}g) lớn hơn cân thực (${weight}g), tính theo cân quy đổi.` : `Tính theo cân thực: ${weight}g`,
      fee_breakdown: {
        base_shipping_fee: base_fee,
        service_multiplier: `x${service_multiplier}`,
        shipping_fee,
        insurance_fee,
        insurance_note: insurance_fee > 0 ? `Hàng giá trị ${Number(item_value).toLocaleString()}đ > 1tr, tự động phí BH 0.5%` : 'Không phát sinh phí bảo hiểm',
        total_fee
      },
      wallet_check: {
        available_balance: available,
        is_sufficient: available >= total_fee,
        warning: available < total_fee ? `⚠️ Số dư ví không đủ! Cần nạp thêm ít nhất ${(total_fee - available).toLocaleString()}đ` : '✅ Số dư đủ để tạo đơn'
      }
    };
  }

  // =============================================
  // C. TẠO ĐƠN HÀNG CHÍNH THỨC (Trừ tiền ví)
  // =============================================
  async createOrder(input: any, id_user: number) {
    const {
      id_store, id_service_type,
      receiver_name, receiver_phone, receiver_address, id_dest_area,
      weight, item_value = 0, cod_amount = 0, note = '',
      length = 0, width = 0, height = 0
    } = input;

    if (!id_store || !receiver_name || !receiver_phone || !receiver_address || !id_dest_area || !weight) {
      throw new Error('Thiếu thông tin bắt buộc: id_store, receiver_name, receiver_phone, receiver_address, id_dest_area, weight.');
    }

    // Validate
    const shop = await shopRepo.findShopByUserId(id_user);
    if (!shop) throw new Error('Không tìm thấy thông tin Shop.');

    const store = await orderRepo.findStoreByIdAndShop(id_store, shop.id_shop);
    if (!store) throw new Error('Kho hàng không thuộc Shop của bạn.');

    const destArea = await orderRepo.findAreaById(id_dest_area);
    if (!destArea) throw new Error('Khu vực giao hàng không hợp lệ.');

    // Tính phí
    const volumetric = calcVolumetricWeight(length, width, height);
    const billable_weight = Math.max(weight, volumetric);
    const pricingRule = await orderRepo.findBestPricingRule(destArea.area_type, billable_weight);
    const base_fee = pricingRule ? Number(pricingRule.price) : 35000;

    let service_multiplier = 1.0;
    if (id_service_type) {
      const svcType = await orderRepo.findServiceType(id_service_type);
      if (svcType) service_multiplier = Number(svcType.base_multiplier);
    }

    const shipping_fee = Math.round(base_fee * service_multiplier);
    const insurance_fee = calcInsuranceFee(item_value);
    const total_fee = shipping_fee + insurance_fee;

    // Bắt đầu Transaction - Database BEGIN
    const client = await orderRepo.getTxClient();
    try {
      await client.query('BEGIN');

      // Khoá ví (Pessimistic Locking - chống race condition)
      const wallet = await orderRepo.findWalletForUpdate(id_user, client);
      if (!wallet) throw new Error('Ví tiền không tồn tại. Vui lòng liên hệ Admin.');

      const available = Number(wallet.balance) + Number(wallet.credit_limit) - Number(wallet.used_credit);
      if (available < total_fee) {
        throw new Error(
          `Số dư ví không đủ!\n` +
          `• Phí vận chuyển: ${shipping_fee.toLocaleString()}đ\n` +
          `• Phí bảo hiểm: ${insurance_fee.toLocaleString()}đ\n` +
          `• Tổng cần thanh toán: ${total_fee.toLocaleString()}đ\n` +
          `• Số dư khả dụng: ${available.toLocaleString()}đ\n` +
          `→ Vui lòng nạp thêm: ${(total_fee - available).toLocaleString()}đ`
        );
      }

      // Trừ tiền ví + ghi lịch sử
      await orderRepo.deductWalletAndLog(
        wallet.id_wallet,
        total_fee,
        `PHÍ VẬN CHUYỂN ĐƠN`,
        client
      );

      // Sinh mã tracking
      const tracking_code = generateTrackingCode();

      // Tạo đơn hàng
      const id_order = await orderRepo.insertOrder({
        tracking_code, id_store, id_service_type: id_service_type || null,
        receiver_name, receiver_phone, receiver_address,
        id_dest_area, weight: billable_weight, item_value, cod_amount,
        insurance_fee, shipping_fee, note,
        status: 'CHỜ LẤY HÀNG'
      }, client);

      // Ghi log đầu tiên (lấy Hub đầu tiên làm điểm xuất phát)
      const hubLoc = await client.query('SELECT h.id_location FROM hubs h ORDER BY id_hub LIMIT 1');
      if (hubLoc.rows[0]) {
        await orderRepo.insertOrderLog(id_order, hubLoc.rows[0].id_location, id_user, 'TẠO ĐƠN', client);
      }

      await client.query('COMMIT');

      return {
        tracking_code,
        id_order,
        status: 'CHỜ LẤY HÀNG',
        pickup_store: store.store_name,
        pickup_address: store.address,
        receiver: { name: receiver_name, phone: receiver_phone, address: receiver_address },
        fee_summary: {
          shipping_fee,
          insurance_fee,
          total_charged: total_fee,
          remaining_balance: available - total_fee
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =============================================
  // D. XEM DANH SÁCH ĐƠN HÀNG CỦA SHOP
  // =============================================
  async getMyOrders(id_user: number, status_filter?: string) {
    return await orderRepo.findOrdersByShopUserId(id_user, status_filter);
  }

  // =============================================
  // E. TRA CỨU TRACKING (Public)
  // =============================================
  async trackOrder(tracking_code: string) {
    const result = await orderRepo.findOrderByTrackingCode(tracking_code);
    if (!result) throw new Error(`Không tìm thấy vận đơn có mã: ${tracking_code}`);
    return result;
  }
}
