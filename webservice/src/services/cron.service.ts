import cron from 'node-cron';
import { pool } from '../config/db';
import { ORDER_STATUS, orderStatusVariants } from '../utils/orderStatus';

export class CronService {
  /**
   * Khá»Ÿi táº¡o cÃ¡c cronjobs khi app bootstrap
   */
  public startJobs() {
    // Cháº¡y lÃºc 00:00 (ná»­a Ä‘Ãªm) má»—i ngÃ y
    cron.schedule('0 0 * * *', async () => {
      console.log('[Cron] Äang cháº¡y cÃ¡c tiáº¿n trÃ¬nh dá»n dáº¹p hÃ ng ngÃ y...');
      await this.autoApprovePendingCodPayouts();
      await this.autoProcessOverdueOrders();
      await this.applyMissedPickupPenalties();
      console.log('[Cron] HoÃ n thÃ nh tiáº¿n trÃ¬nh hÃ ng ngÃ y.');
    });

    // Cháº¡y má»—i giá» (test hoáº·c dá»n dáº¹p nháº¹)
    // cron.schedule('0 * * * *', async () => {});

    console.log('[CronService] ÄÃ£ kÃ­ch hoáº¡t ná»n táº£ng tá»± Ä‘á»™ng láº­p lá»‹ch Cron Jobs.');
  }

  /**
   * Tá»± Ä‘á»™ng duyá»‡t cÃ¡c yÃªu cáº§u rÃºt tiá»n COD bá»‹ treo quÃ¡ 3 ngÃ y (HÃ nh chÃ­nh hoáº·c cuá»‘i tuáº§n)
   */
  private async autoApprovePendingCodPayouts() {
    try {
      const q = `
        UPDATE cod_payouts
        SET
          status = 'DA_CHUYEN',
          approved_at = NOW(),
          admin_note = 'Há»‡ thá»‘ng tá»± Ä‘á»™ng duyá»‡t sau quÃ¡ háº¡n quy Ä‘á»‹nh'
        WHERE status = 'CHO_DUYET'
          AND created_at < NOW() - INTERVAL '3 days'
        RETURNING id_payout;
      `;
      const res = await pool.query(q);
      if (res.rowCount && res.rowCount > 0) {
        console.log(`[Cron] ÄÃ£ tá»± Ä‘á»™ng duyá»‡t ${res.rowCount} phiáº¿u rÃºt tiá»n COD (cod_payouts).`);
      }
    } catch (e) {
      console.error('[Cron] Lá»—i autoApprovePendingCodPayouts:', e);
    }
  }

  /**
   * Tá»± Ä‘á»™ng xá»­ lÃ½ bÆ°u pháº©m quÃ¡ háº¡n
   */
  private async autoProcessOverdueOrders() {
    try {
      // 1. QuÃ¡ háº¡n Láº¥y HÃ ng (Chá» láº¥y hÃ ng trÃªn 7 ngÃ y) -> Há»¦Y
      const cancelQ = `
        UPDATE orders
        SET status = $1, note = note || ' - Há»‡ thá»‘ng tá»± Ä‘á»™ng Há»¦Y do Shop khÃ´ng chuáº©n bá»‹ hÃ ng quÃ¡ 7 ngÃ y.'
        WHERE status = ANY($2::text[])
          AND created_at < NOW() - INTERVAL '7 days'
        RETURNING id_order;
      `;
      const cancelRes = await pool.query(cancelQ, [
        ORDER_STATUS.CANCELLED,
        orderStatusVariants(ORDER_STATUS.WAITING_PICKUP),
      ]);
      if (cancelRes.rowCount && cancelRes.rowCount > 0) {
        console.log(`[Cron] ÄÃ£ tá»± Ä‘á»™ng Há»¦Y ${cancelRes.rowCount} Ä‘Æ¡n chá» láº¥y quÃ¡ 7 ngÃ y.`);
      }

      // 2. QuÃ¡ háº¡n Táº¡i Kho, Äang Giao nhÆ°ng gÄƒm hÃ ng quÃ¡ lÃ¢u (TrÃªn 14 ngÃ y) -> Chuyá»ƒn thÃ nh HOÃ€N HÃ€NG
      const returnQ = `
        UPDATE orders
        SET status = $1,
            is_return = TRUE,
            note = note || ' - Há»‡ thá»‘ng tá»± Ä‘á»™ng bÃ¡o HOÃ€N do giam giá»¯ Ä‘Æ¡n hÃ ng quÃ¡ 14 ngÃ y khÃ´ng xuáº¥t.'
        WHERE status = ANY($2::text[])
          AND created_at < NOW() - INTERVAL '14 days'
        RETURNING id_order;
      `;
      const returnRes = await pool.query(returnQ, [
        ORDER_STATUS.RETURNED,
        [
          ...orderStatusVariants(ORDER_STATUS.AT_WAREHOUSE),
          ...orderStatusVariants(ORDER_STATUS.DELIVERING),
        ],
      ]);
      if (returnRes.rowCount && returnRes.rowCount > 0) {
        console.log(`[Cron] ÄÃ£ tá»± Ä‘á»™ng bÃ¡o HOÃ€N HÃ€NG ${returnRes.rowCount} Ä‘Æ¡n giam quÃ¡ 14 ngÃ y.`);
      }

    } catch (e) {
      console.error('[Cron] Lá»—i autoProcessOverdueOrders:', e);
    }
  }

  private async applyMissedPickupPenalties() {
    const penaltyAmount = 30000;
    try {
      const result = await pool.query(
        `
        WITH overdue AS (
          SELECT DISTINCT ON (o.id_order)
            o.id_order,
            o.current_shipper_id,
            TO_CHAR(ol.created_at, 'YYYY-MM') as period
          FROM orders o
          JOIN order_logs ol ON ol.id_order = o.id_order
          WHERE o.status = ANY($2::text[])
            AND o.current_shipper_id IS NOT NULL
            AND ol.action = 'SHIPPER NHAN DON LAY HANG'
            AND ol.created_at < CURRENT_DATE
            AND NOT EXISTS (
              SELECT 1
              FROM order_logs charged
              WHERE charged.id_order = o.id_order
                AND charged.action = 'PHAT SHIPPER KHONG LAY HANG'
            )
          ORDER BY o.id_order, ol.created_at DESC
        ),
        upsert_income AS (
          INSERT INTO shipper_incomes (id_user, period, base_salary, total_commission, penalty)
          SELECT current_shipper_id, period, 0, 0, $1
          FROM overdue
          ON CONFLICT (id_user, period)
          DO UPDATE SET penalty = shipper_incomes.penalty + EXCLUDED.penalty
          RETURNING id_user
        )
        INSERT INTO order_logs (id_order, id_location, id_actor, action)
        SELECT
          overdue.id_order,
          COALESCE(latest.id_location, 1),
          overdue.current_shipper_id,
          'PHAT SHIPPER KHONG LAY HANG'
        FROM overdue
        LEFT JOIN LATERAL (
          SELECT id_location
          FROM order_logs
          WHERE id_order = overdue.id_order
          ORDER BY created_at DESC, id_log DESC
          LIMIT 1
        ) latest ON TRUE
        RETURNING id_order;
        `,
        [penaltyAmount, orderStatusVariants(ORDER_STATUS.WAITING_PICKUP)]
      );

      if (result.rowCount && result.rowCount > 0) {
        console.log(`[Cron] Da phat ${result.rowCount} don shipper nhan nhung khong lay trong ngay.`);
      }
    } catch (e) {
      console.error('[Cron] Loi applyMissedPickupPenalties:', e);
    }
  }
}
