import { BagRepository } from '../repositories/bag.repository';
const bagRepo = new BagRepository();

const generateBagCode = (): string => `BAG${Date.now().toString().slice(-8)}`;

export class BagService {
  async createBag(origin_hub_id: number, dest_hub_id: number, order_ids: number[]) {
    if (!origin_hub_id || !dest_hub_id || !order_ids?.length) throw new Error('Cần: origin_hub_id, dest_hub_id, order_ids[]');
    const client = await bagRepo.getTxClient();
    try {
      await client.query('BEGIN');
      const bag = await bagRepo.createBag(generateBagCode(), origin_hub_id, dest_hub_id, client);
      for (const id_order of order_ids) { await bagRepo.addItemToBag(bag.id_bag, id_order, client); }
      await client.query('COMMIT');
      return { ...bag, item_count: order_ids.length };
    } catch (e) { await client.query('ROLLBACK'); throw new Error('Không thể tạo bao hàng. Kiểm tra lại ID đơn hàng.'); }
    finally { client.release(); }
  }

  async scanBag(bag_code: string, action: 'DISPATCH' | 'RECEIVE') {
    const bag = await bagRepo.findBagByCode(bag_code);
    if (!bag) throw new Error(`Không tìm thấy bao hàng: ${bag_code}`);
    const newStatus = action === 'DISPATCH' ? 'IN_TRANSIT' : 'RECEIVED';
    const client = await bagRepo.getTxClient();
    try {
      await bagRepo.updateBagStatus(bag.id_bag, newStatus, client);
      return { bag_code, new_status: newStatus, message: action === 'DISPATCH' ? 'Bao hàng đã xuất kho!' : 'Bao hàng đã được nhận tại kho đích!' };
    } finally { client.release(); }
  }

  async getBagDetail(bag_code: string) {
    const bag = await bagRepo.findBagByCode(bag_code);
    if (!bag) throw new Error(`Không tìm thấy bao: ${bag_code}`);
    const items = await bagRepo.getBagItems(bag.id_bag);
    return { bag, items };
  }

  async listBagsByHub(id_hub: number) { return await bagRepo.getBagsByHub(id_hub); }
}
