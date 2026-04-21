import { pool } from '../config/db';

export const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shipper_cod_reconciliations (
      id_reconciliation SERIAL PRIMARY KEY,
      id_shipper INT NOT NULL REFERENCES users(id_user),
      reconciliation_date DATE NOT NULL DEFAULT CURRENT_DATE,
      total_cod NUMERIC NOT NULL DEFAULT 0,
      total_receiver_fee NUMERIC NOT NULL DEFAULT 0,
      total_cash NUMERIC NOT NULL DEFAULT 0,
      order_count INT NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'CHO_XAC_NHAN',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE shipper_cod_reconciliations
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP NOT NULL DEFAULT NOW();
  `);

  await pool.query(`
    ALTER TABLE shipper_cod_reconciliations
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE shipper_cod_reconciliations
    ADD COLUMN IF NOT EXISTS confirmed_by INT;
  `);

  await pool.query(`
    ALTER TABLE shipper_cod_reconciliations
    ADD COLUMN IF NOT EXISTS admin_note VARCHAR(255);
  `);

  await pool.query(`
    ALTER TABLE shipper_cod_reconciliations
    ALTER COLUMN status SET DEFAULT 'CHO_XAC_NHAN';
  `);

  await pool.query(`
    UPDATE shipper_cod_reconciliations
    SET status = 'CHO_XAC_NHAN'
    WHERE status = 'DA_NOP';
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'shipper_cod_reconciliations_confirmed_by_fk'
      ) THEN
        ALTER TABLE shipper_cod_reconciliations
        ADD CONSTRAINT shipper_cod_reconciliations_confirmed_by_fk
        FOREIGN KEY (confirmed_by)
        REFERENCES users(id_user);
      END IF;
    END
    $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shipper_ward_assignments (
      id_assignment SERIAL PRIMARY KEY,
      id_shipper INT NOT NULL REFERENCES users(id_user),
      id_spoke INT NOT NULL REFERENCES spokes(id_spoke),
      province VARCHAR(100) NOT NULL,
      district VARCHAR(100) NOT NULL,
      ward VARCHAR(100),
      priority INT NOT NULL DEFAULT 100,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payer_type VARCHAR(20) NOT NULL DEFAULT 'SENDER';
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS fee_payment_method VARCHAR(20) NOT NULL DEFAULT 'WALLET';
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS shipper_reconciliation_id INT;
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS current_shipper_id INT;
  `);

  await pool.query(`
    ALTER TABLE wallets
    ADD COLUMN IF NOT EXISTS debt_started_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE wallets
    ADD COLUMN IF NOT EXISTS debt_due_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE wallets
    ADD COLUMN IF NOT EXISTS debt_locked_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE wallets
    ADD COLUMN IF NOT EXISTS debt_status VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
  `);

  await pool.query(`
    ALTER TABLE delivery_attempts
    ADD COLUMN IF NOT EXISTS reason_code VARCHAR(50);
  `);

  await pool.query(`
    ALTER TABLE pricing_rules
    ADD COLUMN IF NOT EXISTS goods_type VARCHAR(10) NOT NULL DEFAULT 'LIGHT';
  `);

  await pool.query(`
    ALTER TABLE pricing_rules
    ADD COLUMN IF NOT EXISTS base_weight_g NUMERIC NOT NULL DEFAULT 500;
  `);

  await pool.query(`
    ALTER TABLE pricing_rules
    ADD COLUMN IF NOT EXISTS extra_per_500g NUMERIC NOT NULL DEFAULT 2000;
  `);

  await pool.query(`
    UPDATE pricing_rules
    SET goods_type = 'LIGHT'
    WHERE goods_type IS NULL OR TRIM(goods_type) = '';
  `);

  await pool.query(`
    INSERT INTO pricing_rules (route_type, area_type, goods_type, base_weight_g, weight_step, price, extra_per_500g)
    SELECT rule.route_type, rule.area_type, rule.goods_type, rule.base_weight_g, rule.weight_step, rule.price, rule.extra_per_500g
    FROM (
      VALUES
        (U&'N\\1ED9i t\\1EC9nh', U&'N\\1ED8I TH\\00C0NH', 'HEAVY', 20000, 3000, 100000, 3000),
        (U&'N\\1ED9i t\\1EC9nh', U&'NGO\\1EA0I TH\\00C0NH', 'HEAVY', 20000, 3000, 130000, 3500),
        (U&'Li\\00EAn V\\00F9ng', U&'N\\1ED8I TH\\00C0NH', 'HEAVY', 20000, 3000, 200000, 5000),
        (U&'Li\\00EAn V\\00F9ng', U&'NGO\\1EA0I TH\\00C0NH', 'HEAVY', 20000, 3000, 250000, 5500),
        (U&'Xuy\\00EAn Mi\\1EC1n', U&'N\\1ED8I TH\\00C0NH', 'HEAVY', 20000, 3000, 300000, 7000),
        (U&'Xuy\\00EAn Mi\\1EC1n', U&'NGO\\1EA0I TH\\00C0NH', 'HEAVY', 20000, 3000, 360000, 8000)
    ) AS rule(route_type, area_type, goods_type, base_weight_g, weight_step, price, extra_per_500g)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pricing_rules pr
      WHERE pr.route_type = rule.route_type
        AND pr.area_type = rule.area_type
        AND pr.goods_type = rule.goods_type
    );
  `);

  await pool.query(`
    ALTER TABLE cod_payouts
    ADD COLUMN IF NOT EXISTS id_bank INT;
  `);

  await pool.query(`
    ALTER TABLE cod_payouts
    ADD COLUMN IF NOT EXISTS net_amount NUMERIC NOT NULL DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE cod_payouts
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
  `);

  await pool.query(`
    ALTER TABLE cod_payouts
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
  `);

  await pool.query(`
    ALTER TABLE cod_payouts
    ADD COLUMN IF NOT EXISTS approved_by INT;
  `);

  await pool.query(`
    ALTER TABLE cod_payouts
    ADD COLUMN IF NOT EXISTS admin_note VARCHAR(255);
  `);

  await pool.query(`
    ALTER TABLE cod_payouts
    ALTER COLUMN status SET DEFAULT 'CHO_DUYET';
  `);

  await pool.query(`
    UPDATE cod_payouts
    SET status = 'CHO_DUYET'
    WHERE status IN ('CHỜ DUYỆT', 'CHá»œ DUYá»†T');
  `);

  await pool.query(`
    UPDATE cod_payouts
    SET status = 'DA_CHUYEN'
    WHERE status IN ('ĐÃ CHUYỂN', 'ÄÃƒ CHUYá»‚N');
  `);

  await pool.query(`
    UPDATE cod_payouts
    SET net_amount = GREATEST(COALESCE(total_cod, 0) - COALESCE(service_fee, 0), 0)
    WHERE COALESCE(net_amount, 0) = 0
      AND COALESCE(total_cod, 0) > 0;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cod_payout_items (
      id_item SERIAL PRIMARY KEY,
      id_payout INT NOT NULL REFERENCES cod_payouts(id_payout) ON DELETE CASCADE,
      id_order INT NOT NULL REFERENCES orders(id_order),
      cod_amount NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(id_order)
    );
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'cod_payouts_id_bank_fk'
      ) THEN
        ALTER TABLE cod_payouts
        ADD CONSTRAINT cod_payouts_id_bank_fk
        FOREIGN KEY (id_bank)
        REFERENCES bank_accounts(id_bank);
      END IF;
    END
    $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'cod_payouts_approved_by_fk'
      ) THEN
        ALTER TABLE cod_payouts
        ADD CONSTRAINT cod_payouts_approved_by_fk
        FOREIGN KEY (approved_by)
        REFERENCES users(id_user);
      END IF;
    END
    $$;
  `);

  await pool.query(`
    UPDATE orders
    SET payer_type = 'SENDER'
    WHERE payer_type IS NULL OR TRIM(payer_type) = '';
  `);

  await pool.query(`
    UPDATE orders
    SET fee_payment_method = CASE
      WHEN payer_type = 'RECEIVER' THEN 'CASH'
      ELSE COALESCE(NULLIF(TRIM(fee_payment_method), ''), 'WALLET')
    END
    WHERE fee_payment_method IS NULL OR TRIM(fee_payment_method) = '' OR payer_type = 'RECEIVER';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_cash_collections (
      id_collection SERIAL PRIMARY KEY,
      id_order INT NOT NULL REFERENCES orders(id_order) ON DELETE CASCADE,
      collection_type VARCHAR(30) NOT NULL,
      payer_party VARCHAR(20) NOT NULL,
      collection_stage VARCHAR(20) NOT NULL,
      expected_amount NUMERIC NOT NULL DEFAULT 0,
      collected_amount NUMERIC NOT NULL DEFAULT 0,
      collected_by_shipper INT REFERENCES users(id_user),
      collected_at TIMESTAMP,
      reconciliation_id INT REFERENCES shipper_cod_reconciliations(id_reconciliation),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_order_cash_collections_order
    ON order_cash_collections(id_order);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_order_cash_collections_shipper_reconciliation
    ON order_cash_collections(collected_by_shipper, reconciliation_id, collected_at);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_order_cash_collections_type
    ON order_cash_collections(collection_type, reconciliation_id);
  `);

  await pool.query(`
    INSERT INTO order_cash_collections
      (id_order, collection_type, payer_party, collection_stage, expected_amount,
       collected_amount, collected_by_shipper, collected_at, reconciliation_id)
    SELECT
      o.id_order,
      'COD',
      'RECEIVER',
      'DELIVERY',
      COALESCE(o.cod_amount, 0),
      COALESCE(o.cod_amount, 0),
      scr.id_shipper,
      COALESCE(scr.confirmed_at, scr.submitted_at, scr.created_at),
      scr.id_reconciliation
    FROM orders o
    JOIN shipper_cod_reconciliations scr ON scr.id_reconciliation = o.shipper_reconciliation_id
    WHERE COALESCE(o.cod_amount, 0) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM order_cash_collections occ
        WHERE occ.id_order = o.id_order
          AND occ.collection_type = 'COD'
      );
  `);

  await pool.query(`
    INSERT INTO order_cash_collections
      (id_order, collection_type, payer_party, collection_stage, expected_amount,
       collected_amount, collected_by_shipper, collected_at, reconciliation_id)
    SELECT
      o.id_order,
      'COD',
      'RECEIVER',
      'DELIVERY',
      COALESCE(o.cod_amount, 0),
      CASE WHEN delivered.id_shipper IS NOT NULL THEN COALESCE(o.cod_amount, 0) ELSE 0 END,
      delivered.id_shipper,
      delivered.delivered_at,
      o.shipper_reconciliation_id
    FROM orders o
    LEFT JOIN LATERAL (
      SELECT da.id_shipper, da.created_at as delivered_at
      FROM delivery_attempts da
      WHERE da.id_order = o.id_order
        AND da.result = 'THÃ€NH CÃ”NG'
      ORDER BY da.created_at DESC, da.id_attempt DESC
      LIMIT 1
    ) delivered ON TRUE
    WHERE COALESCE(o.cod_amount, 0) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM order_cash_collections occ
        WHERE occ.id_order = o.id_order
          AND occ.collection_type = 'COD'
      );
  `);

  await pool.query(`
    INSERT INTO order_cash_collections
      (id_order, collection_type, payer_party, collection_stage, expected_amount,
       collected_amount, collected_by_shipper, collected_at, reconciliation_id)
    SELECT
      o.id_order,
      fee.collection_type,
      'RECEIVER',
      'DELIVERY',
      fee.amount,
      fee.amount,
      scr.id_shipper,
      COALESCE(scr.confirmed_at, scr.submitted_at, scr.created_at),
      scr.id_reconciliation
    FROM orders o
    JOIN shipper_cod_reconciliations scr ON scr.id_reconciliation = o.shipper_reconciliation_id
    CROSS JOIN LATERAL (
      VALUES
        ('SHIPPING_FEE', COALESCE(o.shipping_fee, 0)),
        ('INSURANCE_FEE', COALESCE(o.insurance_fee, 0))
    ) AS fee(collection_type, amount)
    WHERE COALESCE(o.payer_type, 'SENDER') = 'RECEIVER'
      AND COALESCE(fee.amount, 0) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM order_cash_collections occ
        WHERE occ.id_order = o.id_order
          AND occ.collection_type = fee.collection_type
          AND occ.payer_party = 'RECEIVER'
      );
  `);

  await pool.query(`
    INSERT INTO order_cash_collections
      (id_order, collection_type, payer_party, collection_stage, expected_amount,
       collected_amount, collected_by_shipper, collected_at, reconciliation_id)
    SELECT
      o.id_order,
      fee.collection_type,
      'RECEIVER',
      'DELIVERY',
      fee.amount,
      CASE WHEN delivered.id_shipper IS NOT NULL THEN fee.amount ELSE 0 END,
      delivered.id_shipper,
      delivered.delivered_at,
      o.shipper_reconciliation_id
    FROM orders o
    LEFT JOIN LATERAL (
      SELECT da.id_shipper, da.created_at as delivered_at
      FROM delivery_attempts da
      WHERE da.id_order = o.id_order
        AND da.result = 'THÃ€NH CÃ”NG'
      ORDER BY da.created_at DESC, da.id_attempt DESC
      LIMIT 1
    ) delivered ON TRUE
    CROSS JOIN LATERAL (
      VALUES
        ('SHIPPING_FEE', COALESCE(o.shipping_fee, 0)),
        ('INSURANCE_FEE', COALESCE(o.insurance_fee, 0))
    ) AS fee(collection_type, amount)
    WHERE COALESCE(o.payer_type, 'SENDER') = 'RECEIVER'
      AND COALESCE(fee.amount, 0) > 0
      AND NOT EXISTS (
        SELECT 1
        FROM order_cash_collections occ
        WHERE occ.id_order = o.id_order
          AND occ.collection_type = fee.collection_type
          AND occ.payer_party = 'RECEIVER'
      );
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_shipper_reconciliation_fk'
      ) THEN
        ALTER TABLE orders
        ADD CONSTRAINT orders_shipper_reconciliation_fk
        FOREIGN KEY (shipper_reconciliation_id)
        REFERENCES shipper_cod_reconciliations(id_reconciliation);
      END IF;
    END
    $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_current_shipper_fk'
      ) THEN
        ALTER TABLE orders
        ADD CONSTRAINT orders_current_shipper_fk
        FOREIGN KEY (current_shipper_id)
        REFERENCES users(id_user);
      END IF;
    END
    $$;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_orders_shipper_reconciliation_id
    ON orders(shipper_reconciliation_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_orders_current_shipper_id
    ON orders(current_shipper_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_shipper_cod_reconciliations_shipper_date
    ON shipper_cod_reconciliations(id_shipper, reconciliation_date DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_shipper_cod_reconciliations_status
    ON shipper_cod_reconciliations(status, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_cod_payouts_account_status
    ON cod_payouts(id_account, status, created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_cod_payout_items_payout
    ON cod_payout_items(id_payout);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_shipper_ward_assignments_spoke_active
    ON shipper_ward_assignments(id_spoke, is_active, priority);
  `);
};
