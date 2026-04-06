import bcrypt from 'bcryptjs';
import { ShopRepository } from '../repositories/shop.repository';

const shopRepo = new ShopRepository();

// Regex validate mật khẩu theo Docx: tối thiểu 8 ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt
const validatePassword = (password: string, phone: string): string | null => {
  if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (!/[A-Z]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ HOA.';
  if (!/[a-z]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ thường.';
  if (!/[0-9]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ số.';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt.';
  if (password.includes(phone)) return 'Mật khẩu không được chứa số điện thoại của bạn.';
  return null; // Hợp lệ
};

export class ShopService {
  // =============================================
  // 1. ĐĂNG KÝ TÀI KHOẢN SHOP (Register)
  // =============================================
  async registerShop(data: any) {
    const { phone, password, shop_name, tax_code, representative } = data;

    if (!phone || !password || !shop_name) {
      throw new Error('Vui lòng điền đầy đủ: SĐT, mật khẩu và tên Shop.');
    }

    // Validate mật khẩu chuẩn bảo mật theo Docx
    const passwordError = validatePassword(password, phone);
    if (passwordError) throw new Error(passwordError);

    // Kiểm tra trùng SĐT
    const existing = await shopRepo.findUserByPhone(phone);
    if (existing) throw new Error('Số điện thoại này đã được đăng ký. Vui lòng dùng SĐT khác.');

    const shopRole = await shopRepo.findRoleByName('SHOP');
    if (!shopRole) throw new Error('Lỗi hệ thống: Không tìm thấy Role SHOP trong DB.');

    const client = await shopRepo.getTxClient();
    try {
      await client.query('BEGIN');

      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Tạo User
      const id_user = await shopRepo.createUser(phone, hashedPassword, client);

      // Gán Role SHOP
      await shopRepo.assignRole(id_user, shopRole.id_role, client);

      // Tạo Shop profile
      const id_shop = await shopRepo.createShop(id_user, shop_name, tax_code, representative, client);

      // Tạo Ví tiền mặc định (balance = 0)
      await shopRepo.createWallet(id_user, client);

      await client.query('COMMIT');
      return { id_user, id_shop, phone, shop_name };
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =============================================
  // 2. XEM THÔNG TIN & VÍ TIỀN CỦA SHOP
  // =============================================
  async getProfile(id_user: number) {
    const shop = await shopRepo.findShopByUserId(id_user);
    if (!shop) throw new Error('Không tìm thấy thông tin Shop của tài khoản này.');
    return shop;
  }

  // =============================================
  // 3. QUẢN LÝ KHO HÀNG / ĐỊA CHỈ LẤY HÀNG (Stores)
  // =============================================
  async getMyStores(id_user: number) {
    const shop = await shopRepo.findShopByUserId(id_user);
    if (!shop) throw new Error('Không tìm thấy Shop.');
    return await shopRepo.getStoresByShopId(shop.id_shop);
  }

  async addStore(id_user: number, storeData: any) {
    const shop = await shopRepo.findShopByUserId(id_user);
    if (!shop) throw new Error('Không tìm thấy Shop.');
    const { store_name, phone, address, description } = storeData;
    if (!store_name || !phone || !address) throw new Error('Thiếu thông tin kho hàng.');
    const client = await shopRepo.getTxClient();
    try {
      const store = await shopRepo.createStore(shop.id_shop, store_name, phone, address, description, client);
      return store;
    } finally {
      client.release();
    }
  }

  async updateStore(id_user: number, id_store: number, storeData: any) {
    const shop = await shopRepo.findShopByUserId(id_user);
    if (!shop) throw new Error('Không tìm thấy Shop.');
    const { store_name, phone, address, description } = storeData;
    const updated = await shopRepo.updateStore(id_store, shop.id_shop, store_name, phone, address, description);
    if (!updated) throw new Error('Không tìm thấy kho hàng hoặc kho không thuộc Shop của bạn.');
    return updated;
  }

  async deleteStore(id_user: number, id_store: number) {
    const shop = await shopRepo.findShopByUserId(id_user);
    if (!shop) throw new Error('Không tìm thấy Shop.');
    const deleted = await shopRepo.deleteStore(id_store, shop.id_shop);
    if (!deleted) throw new Error('Không tìm thấy kho hàng để xóa.');
    return { message: 'Đã xóa kho hàng thành công.' };
  }

  // =============================================
  // 4. QUẢN LÝ TÀI KHOẢN NGÂN HÀNG (Bank Accounts)
  // =============================================
  async getMyBanks(id_user: number) {
    return await shopRepo.getBanksByUserId(id_user);
  }

  async addBankAccount(id_user: number, bankData: any) {
    const { bank_name, account_number, account_holder } = bankData;
    if (!bank_name || !account_number || !account_holder) throw new Error('Thiếu thông tin ngân hàng.');
    return await shopRepo.addBankAccount(id_user, bank_name, account_number, account_holder);
  }

  async deleteBankAccount(id_user: number, id_bank: number) {
    const deleted = await shopRepo.deleteBankAccount(id_bank, id_user);
    if (!deleted) throw new Error('Không tìm thấy tài khoản ngân hàng.');
    return { message: 'Đã xóa tài khoản ngân hàng.' };
  }

  // =============================================
  // 5. VÍ TIỀN: Xem số dư & Nạp tiền
  // =============================================
  async getWallet(id_user: number) {
    const wallet = await shopRepo.getWalletByUserId(id_user);
    if (!wallet) throw new Error('Ví tiền không tồn tại.');
    const history = await shopRepo.getTransactionHistory(wallet.id_wallet);
    return { wallet, history };
  }

  async topupWallet(id_user: number, amount: number) {
    if (!amount || amount <= 0) throw new Error('Số tiền nạp phải lớn hơn 0.');
    if (amount > 100000000) throw new Error('Số tiền nạp tối đa mỗi lần là 100 triệu đồng.');
    const wallet = await shopRepo.getWalletByUserId(id_user);
    if (!wallet) throw new Error('Không tìm thấy ví tiền.');
    const client = await shopRepo.getTxClient();
    try {
      await shopRepo.topupWallet(wallet.id_wallet, amount, client);
      return { message: `Nạp ${amount.toLocaleString()}đ vào ví thành công!`, new_balance: Number(wallet.balance) + amount };
    } finally {
      client.release();
    }
  }

  async withdrawWallet(id_user: number, amount: number, id_bank: number) {
    if (!amount || amount <= 5500) throw new Error('Số tiền rút phải lớn hơn phí dịch vụ (5,500đ).');
    const wallet = await shopRepo.getWalletByUserId(id_user);
    if (!wallet) throw new Error('Không tìm thấy ví tiền.');
    
    if (Number(wallet.balance) < amount) {
      throw new Error(`Số dư không đủ. Bạn chỉ có ${Number(wallet.balance).toLocaleString()}đ.`);
    }

    const client = await shopRepo.getTxClient();
    try {
      await client.query('BEGIN');
      await shopRepo.withdrawWallet(wallet.id_wallet, amount, client);
      // Giả lập lưu Yêu Cầu Rút vào một nơi nào đó nếu cần thiết (optional)
      await client.query('COMMIT');
      return { message: `Đã gửi yêu cầu rút ${amount.toLocaleString()}đ thành công!`, new_balance: Number(wallet.balance) - amount };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // =============================================
  // 6. HỦY ĐƠN (Chỉ khi trạng thái = 'CHỜ LẤY HÀNG')
  // =============================================
  async cancelOrder(id_user: number, id_order: number) {
    const shop = await shopRepo.findShopByUserId(id_user);
    if (!shop) throw new Error('Không tìm thấy thông tin Shop.');

    const order = await shopRepo.findOrderForCancellation(id_order, shop.id_shop);
    if (!order) throw new Error('Không tìm thấy đơn hàng hoặc đơn không thuộc Shop của bạn.');

    // Ràng buộc từ Docx: Chỉ hủy khi Shipper CHƯA lấy hàng
    if (order.status !== 'CHỜ LẤY HÀNG') {
      throw new Error(`Không thể hủy đơn! Đơn đang ở trạng thái "${order.status}". Chỉ được hủy khi shipper chưa lấy hàng.`);
    }

    const wallet = await shopRepo.getWalletByUserId(id_user);
    const refundAmount = Number(order.shipping_fee) + Number(order.insurance_fee);

    const client = await shopRepo.getTxClient();
    try {
      await client.query('BEGIN');
      await shopRepo.cancelOrder(id_order, client);
      // Hoàn tiền về ví
      if (wallet && refundAmount > 0) {
        await shopRepo.refundToWallet(wallet.id_wallet, refundAmount, client);
      }
      await client.query('COMMIT');
      return {
        message: 'Hủy đơn thành công!',
        refunded: refundAmount,
        note: refundAmount > 0 ? `Đã hoàn ${refundAmount.toLocaleString()}đ vào ví của bạn.` : ''
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =============================================
  // 7. BÁO CÁO DÒNG TIỀN
  // =============================================
  async getCashflowReport(id_user: number) {
    const report = await shopRepo.getCashflowReport(id_user);
    if (!report) throw new Error('Không tìm thấy dữ liệu tài chính.');
    return report;
  }
}
