import cron from 'node-cron';
import { pool } from '../config/db';

export class CronService {
  /**
   * Khởi tạo các cronjobs khi app bootstrap
   */
  public startJobs() {
    // Chạy lúc 00:00 (nửa đêm) mỗi ngày
    cron.schedule('0 0 * * *', async () => {
      console.log('[Cron] Đang chạy các tiến trình dọn dẹp hàng ngày...');
      await this.autoApprovePendingCodPayouts();
      await this.autoProcessOverdueOrders();
      console.log('[Cron] Hoàn thành tiến trình hàng ngày.');
    });

    // Chạy mỗi giờ (test hoặc dọn dẹp nhẹ)
    // cron.schedule('0 * * * *', async () => {});

    console.log('[CronService] Đã kích hoạt nền tảng tự động lập lịch Cron Jobs.');
  }

  /**
   * Tự động duyệt các yêu cầu rút tiền COD bị treo quá 3 ngày (Hành chính hoặc cuối tuần)
   */
  private async autoApprovePendingCodPayouts() {
    try {
      const q = `
        UPDATE cod_payouts
        SET 
          status = 'DA_CHUYEN',
          approved_at = NOW(),
          admin_note = 'Hệ thống tự động duyệt sau quá hạn quy định'
        WHERE status = 'CHO_DUYET'
          AND created_at < NOW() - INTERVAL '3 days'
        RETURNING id_payout;
      `;
      const res = await pool.query(q);
      if (res.rowCount && res.rowCount > 0) {
        console.log(`[Cron] Đã tự động duyệt ${res.rowCount} phiếu rút tiền COD (cod_payouts).`);
      }
    } catch (e) {
      console.error('[Cron] Lỗi autoApprovePendingCodPayouts:', e);
    }
  }

  /**
   * Tự động xử lý bưu phẩm quá hạn
   */
  private async autoProcessOverdueOrders() {
    try {
      // 1. Quá hạn Lấy Hàng (Chờ lấy hàng trên 7 ngày) -> HỦY
      const cancelQ = `
        UPDATE orders
        SET status = 'ĐÃ HỦY', note = note || ' - Hệ thống tự động HỦY do Shop không chuẩn bị hàng quá 7 ngày.'
        WHERE status = 'CHỜ LẤY HÀNG'
          AND created_at < NOW() - INTERVAL '7 days'
        RETURNING id_order;
      `;
      const cancelRes = await pool.query(cancelQ);
      if (cancelRes.rowCount && cancelRes.rowCount > 0) {
        console.log(`[Cron] Đã tự động HỦY ${cancelRes.rowCount} đơn chờ lấy quá 7 ngày.`);
      }

      // 2. Quá hạn Tại Kho, Đang Giao nhưng găm hàng quá lâu (Trên 14 ngày) -> Chuyển thành HOÀN HÀNG
      const returnQ = `
        UPDATE orders
        SET status = 'HOÀN HÀNG', 
            is_return = TRUE,
            note = note || ' - Hệ thống tự động báo HOÀN do giam giữ đơn hàng quá 14 ngày không xuất.'
        WHERE status IN ('TẠI KHO', 'ĐANG GIAO HÀNG')
          AND created_at < NOW() - INTERVAL '14 days'
        RETURNING id_order;
      `;
      const returnRes = await pool.query(returnQ);
      if (returnRes.rowCount && returnRes.rowCount > 0) {
        console.log(`[Cron] Đã tự động báo HOÀN HÀNG ${returnRes.rowCount} đơn giam quá 14 ngày.`);
      }

    } catch (e) {
      console.error('[Cron] Lỗi autoProcessOverdueOrders:', e);
    }
  }
}
