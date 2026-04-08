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
      status VARCHAR(20) NOT NULL DEFAULT 'DA_NOP',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
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
    ADD COLUMN IF NOT EXISTS shipper_reconciliation_id INT;
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS current_shipper_id INT;
  `);

  await pool.query(`
    UPDATE orders
    SET payer_type = 'SENDER'
    WHERE payer_type IS NULL OR TRIM(payer_type) = '';
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
    CREATE INDEX IF NOT EXISTS idx_shipper_ward_assignments_spoke_active
    ON shipper_ward_assignments(id_spoke, is_active, priority);
  `);
};
