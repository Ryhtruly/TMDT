import { OrderRepository } from '../repositories/order.repository';
import { ShopRepository } from '../repositories/shop.repository';
import { getRegionByProvince, normalizeProvinceName } from '../utils/location';

const orderRepo = new OrderRepository();
const shopRepo = new ShopRepository();

type PayerType = 'SENDER' | 'RECEIVER';
type OperationalRouteType = 'DIRECT' | 'INTRA_HUB' | 'INTER_HUB';
type PricingRouteType = 'Noi tinh' | 'Lien vung' | 'Xuyen mien';

const generateTrackingCode = (): string => {
  const prefix = 'QLKV';
  const ts = Date.now().toString().slice(-7);
  const rand = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `${prefix}${ts}${rand}`;
};

const calcVolumetricWeight = (length: number, width: number, height: number): number =>
  Math.ceil((length * width * height) / 6000);

const INSURANCE_THRESHOLD = 1_000_000;
const INSURANCE_RATE = 0.005;

const calcInsuranceFee = (itemValue: number): number =>
  itemValue > INSURANCE_THRESHOLD ? Math.round(itemValue * INSURANCE_RATE) : 0;

const normalizePayerType = (value: unknown): PayerType =>
  String(value || 'SENDER').toUpperCase() === 'RECEIVER' ? 'RECEIVER' : 'SENDER';

const resolveOperationalRouteType = (originArea: any, destArea: any): OperationalRouteType => {
  if (originArea.id_spoke === destArea.id_spoke) return 'DIRECT';
  if (originArea.parent_hub_id === destArea.parent_hub_id) return 'INTRA_HUB';
  return 'INTER_HUB';
};

const resolvePricingRouteType = (originArea: any, destArea: any): PricingRouteType => {
  if (normalizeProvinceName(originArea.province) === normalizeProvinceName(destArea.province)) {
    return 'Noi tinh';
  }

  const originRegion = getRegionByProvince(originArea.province);
  const destRegion = getRegionByProvince(destArea.province);

  if (originRegion !== 'unknown' && originRegion === destRegion) {
    return 'Lien vung';
  }

  if (originArea.parent_hub_id === destArea.parent_hub_id) {
    return 'Lien vung';
  }

  return 'Xuyen mien';
};

const mapPricingRouteTypeForDb = (routeType: PricingRouteType) => {
  switch (routeType) {
    case 'Noi tinh':
      return 'Nội tỉnh';
    case 'Lien vung':
      return 'Liên Vùng';
    default:
      return 'Xuyên Miền';
  }
};

const buildPaymentFlow = (payerType: PayerType, totalFee: number, codAmount: number, walletAvailable: number) => {
  const senderChargeNow = payerType === 'SENDER' ? totalFee : 0;
  const receiverFeeOnDelivery = payerType === 'RECEIVER' ? totalFee : 0;
  const cashToCollectOnDelivery = codAmount + receiverFeeOnDelivery;

  return {
    payer_type: payerType,
    sender_charge_now: senderChargeNow,
    receiver_fee_on_delivery: receiverFeeOnDelivery,
    cash_to_collect_on_delivery: cashToCollectOnDelivery,
    wallet_check: {
      available_balance: walletAvailable,
      is_sufficient: payerType === 'RECEIVER' ? true : walletAvailable >= totalFee,
      warning:
        payerType === 'RECEIVER'
          ? `Shop khong bi tru vi luc tao don. Shipper can thu ${cashToCollectOnDelivery.toLocaleString()}d khi giao.`
          : walletAvailable < totalFee
            ? `So du vi khong du. Can nap them it nhat ${(totalFee - walletAvailable).toLocaleString()}d`
            : 'So du du de tao don',
    },
  };
};

export class OrderService {
  async getServiceTypes() {
    return await orderRepo.getAllServiceTypes();
  }

  async previewFee(input: any, idUser: number) {
    const {
      id_store,
      id_dest_area,
      weight,
      item_value = 0,
      cod_amount = 0,
      id_service_type,
      payer_type = 'SENDER',
      length = 0,
      width = 0,
      height = 0,
    } = input;

    if (!id_store || !id_dest_area || !weight) {
      throw new Error('Can cung cap id_store, id_dest_area va weight de tinh phi.');
    }

    const shop = await shopRepo.findShopByUserId(idUser);
    if (!shop) throw new Error('Khong tim thay thong tin shop.');

    const store = await orderRepo.findStoreByIdAndShop(id_store, shop.id_shop);
    if (!store) throw new Error('Kho hang khong ton tai hoac khong thuoc shop cua ban.');

    const destArea = await orderRepo.findAreaById(id_dest_area);
    if (!destArea) throw new Error('Khu vuc giao hang khong hop le.');

    const originArea = await orderRepo.findOriginAreaByStore(id_store);
    if (!originArea) {
      throw new Error('Kho gui hang chua map duoc voi spoke phat hang.');
    }

    const volumetric = calcVolumetricWeight(length, width, height);
    const billableWeight = Math.max(weight, volumetric);
    const operationalRouteType = resolveOperationalRouteType(originArea, destArea);
    const pricingRouteType = resolvePricingRouteType(originArea, destArea);

    const pricingRule = await orderRepo.findBestPricingRule(
      mapPricingRouteTypeForDb(pricingRouteType),
      destArea.area_type,
      billableWeight
    );
    const baseFee = pricingRule ? Number(pricingRule.price) : 35000;

    let serviceMultiplier = 1.0;
    let serviceName = 'Tieu chuan';
    if (id_service_type) {
      const serviceType = await orderRepo.findServiceType(id_service_type);
      if (serviceType) {
        serviceMultiplier = Number(serviceType.base_multiplier);
        serviceName = serviceType.service_name;
      }
    }

    const shippingFee = Math.round(baseFee * serviceMultiplier);
    const insuranceFee = calcInsuranceFee(item_value);
    const totalFee = shippingFee + insuranceFee;
    const normalizedPayerType = normalizePayerType(payer_type);

    const wallet = await shopRepo.getWalletByUserId(idUser);
    const available = wallet ? Number(wallet.balance) + Number(wallet.credit_limit) - Number(wallet.used_credit) : 0;
    const paymentFlow = buildPaymentFlow(normalizedPayerType, totalFee, Number(cod_amount || 0), available);

    return {
      pickup_store: store.store_name,
      origin_province: originArea.province,
      origin_district: originArea.district,
      dest_province: destArea.province,
      dest_district: destArea.district,
      area_type: destArea.area_type,
      operational_route_type: operationalRouteType,
      pricing_route_type: pricingRule?.route_type || mapPricingRouteTypeForDb(pricingRouteType),
      service_name: serviceName,
      billable_weight: billableWeight,
      note_weight:
        volumetric > weight
          ? `Can quy doi (${volumetric}g) lon hon can thuc (${weight}g), tinh theo can quy doi.`
          : `Tinh theo can thuc: ${weight}g`,
      fee_breakdown: {
        base_shipping_fee: baseFee,
        service_multiplier: serviceMultiplier,
        shipping_fee: shippingFee,
        insurance_fee: insuranceFee,
        total_fee: totalFee,
      },
      payment_flow: paymentFlow,
      wallet_check: paymentFlow.wallet_check,
    };
  }

  async createOrder(input: any, idUser: number) {
    const {
      id_store,
      id_service_type,
      receiver_name,
      receiver_phone,
      receiver_address,
      id_dest_area,
      payer_type = 'SENDER',
      weight,
      item_value = 0,
      cod_amount = 0,
      note = '',
      length = 0,
      width = 0,
      height = 0,
      pickup_shift = null,
      dropoff_spoke_id = null,
    } = input;

    if (!id_store || !receiver_name || !receiver_phone || !receiver_address || !id_dest_area || !weight) {
      throw new Error('Thieu thong tin bat buoc: id_store, receiver_name, receiver_phone, receiver_address, id_dest_area, weight.');
    }

    const shop = await shopRepo.findShopByUserId(idUser);
    if (!shop) throw new Error('Khong tim thay thong tin shop.');

    const store = await orderRepo.findStoreByIdAndShop(id_store, shop.id_shop);
    if (!store) throw new Error('Kho hang khong thuoc shop cua ban.');

    const destArea = await orderRepo.findAreaById(id_dest_area);
    if (!destArea) throw new Error('Khu vuc giao hang khong hop le.');

    const originArea = await orderRepo.findOriginAreaByStore(id_store);
    if (!originArea) {
      throw new Error('Kho gui hang chua map duoc voi spoke phat hang.');
    }

    const volumetric = calcVolumetricWeight(length, width, height);
    const billableWeight = Math.max(weight, volumetric);
    const operationalRouteType = resolveOperationalRouteType(originArea, destArea);
    const pricingRouteType = resolvePricingRouteType(originArea, destArea);

    const pricingRule = await orderRepo.findBestPricingRule(
      mapPricingRouteTypeForDb(pricingRouteType),
      destArea.area_type,
      billableWeight
    );
    const baseFee = pricingRule ? Number(pricingRule.price) : 35000;

    let serviceMultiplier = 1.0;
    if (id_service_type) {
      const serviceType = await orderRepo.findServiceType(id_service_type);
      if (serviceType) serviceMultiplier = Number(serviceType.base_multiplier);
    }

    const shippingFee = Math.round(baseFee * serviceMultiplier);
    const insuranceFee = calcInsuranceFee(item_value);
    const totalFee = shippingFee + insuranceFee;
    const normalizedPayerType = normalizePayerType(payer_type);

    const client = await orderRepo.getTxClient();
    try {
      await client.query('BEGIN');

      let walletAvailable = 0;
      if (normalizedPayerType === 'SENDER') {
        const wallet = await orderRepo.findWalletForUpdate(idUser, client);
        if (!wallet) throw new Error('Vi tien khong ton tai. Vui long lien he admin.');

        walletAvailable = Number(wallet.balance) + Number(wallet.credit_limit) - Number(wallet.used_credit);
        if (walletAvailable < totalFee) {
          throw new Error(
            `So du vi khong du.\n` +
              `• Phi van chuyen: ${shippingFee.toLocaleString()}d\n` +
              `• Phi bao hiem: ${insuranceFee.toLocaleString()}d\n` +
              `• Tong can thanh toan: ${totalFee.toLocaleString()}d\n` +
              `• So du kha dung: ${walletAvailable.toLocaleString()}d\n` +
              `-> Vui long nap them: ${(totalFee - walletAvailable).toLocaleString()}d`
          );
        }

        await orderRepo.deductWalletAndLog(wallet.id_wallet, totalFee, 'PHI VAN CHUYEN DON', client);
      } else {
        const wallet = await shopRepo.getWalletByUserId(idUser);
        walletAvailable = wallet ? Number(wallet.balance) + Number(wallet.credit_limit) - Number(wallet.used_credit) : 0;
      }

      const trackingCode = generateTrackingCode();
      const idOrder = await orderRepo.insertOrder(
        {
          tracking_code: trackingCode,
          id_store,
          id_service_type: id_service_type || null,
          receiver_name,
          receiver_phone,
          receiver_address,
          id_dest_area,
          weight: billableWeight,
          item_value,
          cod_amount,
          insurance_fee: insuranceFee,
          shipping_fee: shippingFee,
          note,
          status: 'CHỜ LẤY HÀNG',
          payer_type: normalizedPayerType,
          pickup_shift,
          dropoff_spoke_id,
        },
        client
      );

      const hubLoc = await client.query('SELECT h.id_location FROM hubs h ORDER BY id_hub LIMIT 1');
      if (hubLoc.rows[0]) {
        await orderRepo.insertOrderLog(idOrder, hubLoc.rows[0].id_location, idUser, 'TAO DON', client);
      }

      await client.query('COMMIT');

      const paymentFlow = buildPaymentFlow(normalizedPayerType, totalFee, Number(cod_amount || 0), walletAvailable);

      return {
        tracking_code: trackingCode,
        id_order: idOrder,
        status: 'CHỜ LẤY HÀNG',
        pickup_store: store.store_name,
        pickup_address: store.address,
        receiver: { name: receiver_name, phone: receiver_phone, address: receiver_address },
        fee_summary: {
          payer_type: normalizedPayerType,
          operational_route_type: operationalRouteType,
          pricing_route_type: pricingRule?.route_type || mapPricingRouteTypeForDb(pricingRouteType),
          shipping_fee: shippingFee,
          insurance_fee: insuranceFee,
          total_fee: totalFee,
          sender_charged_now: paymentFlow.sender_charge_now,
          receiver_fee_on_delivery: paymentFlow.receiver_fee_on_delivery,
          cash_to_collect_on_delivery: paymentFlow.cash_to_collect_on_delivery,
          remaining_balance: normalizedPayerType === 'SENDER' ? walletAvailable - totalFee : walletAvailable,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getMyOrders(idUser: number, statusFilter?: string) {
    return await orderRepo.findOrdersByShopUserId(idUser, statusFilter);
  }

  async trackOrder(trackingCode: string) {
    const result = await orderRepo.findOrderByTrackingCode(trackingCode);
    if (!result) throw new Error(`Khong tim thay van don co ma: ${trackingCode}`);
    return result;
  }
}
