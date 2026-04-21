const CREDIT_HISTORY_DAYS = 30;
const DEBT_GRACE_DAYS = 7;
const MIN_DYNAMIC_CREDIT = 60000;
const MAX_DYNAMIC_CREDIT = 1000000;

export const calcWalletAvailable = (wallet: any) =>
  Number(wallet?.balance || 0) + Number(wallet?.credit_limit || 0) - Number(wallet?.used_credit || 0);

export const enrichWalletDebt = (wallet: any) => {
  if (!wallet) return null;
  const usedCredit = Number(wallet.used_credit || 0);
  const creditLimit = Number(wallet.credit_limit || 0);
  const availableBalance = calcWalletAvailable(wallet);
  const debtDueAt = wallet.debt_due_at ? new Date(wallet.debt_due_at) : null;
  const isOverdue = usedCredit > 0 && !!debtDueAt && debtDueAt.getTime() < Date.now();
  const isOverLimit = usedCredit > 0 && usedCredit >= creditLimit;
  const isLocked = usedCredit > 0 && (wallet.debt_status === 'LOCKED' || !!wallet.debt_locked_at || isOverdue || isOverLimit);
  const daysUntilDue =
    usedCredit > 0 && debtDueAt
      ? Math.max(0, Math.ceil((debtDueAt.getTime() - Date.now()) / 86400000))
      : null;

  return {
    ...wallet,
    balance: Number(wallet.balance || 0),
    credit_limit: creditLimit,
    used_credit: usedCredit,
    available_balance: availableBalance,
    debt_grace_days: DEBT_GRACE_DAYS,
    debt_limit_formula: `avg_daily_shipping_fee_${CREDIT_HISTORY_DAYS}d * ${DEBT_GRACE_DAYS}`,
    is_debt_locked: isLocked,
    is_debt_overdue: isOverdue,
    is_debt_over_limit: isOverLimit,
    debt_days_until_due: daysUntilDue,
  };
};

export const assertWalletNotDebtLocked = (wallet: any) => {
  const enriched = enrichWalletDebt(wallet);
  if (!enriched?.is_debt_locked) return;

  if (enriched.is_debt_over_limit) {
    throw new Error(
      `Tai khoan shop da vuot han muc no ${enriched.credit_limit.toLocaleString('vi-VN')}d. Vui long nap tien de tiep tuc su dung dich vu.`
    );
  }

  throw new Error(
    `Tai khoan shop dang co no qua han. Vui long nap ${enriched.used_credit.toLocaleString('vi-VN')}d de tiep tuc su dung dich vu.`
  );
};

export const calculateDynamicCreditLimit = async (id_user: number, db: any) => {
  const result = await db.query(
    `
    WITH shop AS (
      SELECT id_shop
      FROM shops
      WHERE id_user = $1
      LIMIT 1
    ),
    fee_total AS (
      SELECT COALESCE(SUM(COALESCE(o.shipping_fee, 0) + COALESCE(o.insurance_fee, 0)), 0) AS total_fee
      FROM orders o
      JOIN stores s ON s.id_store = o.id_store
      JOIN shop sh ON sh.id_shop = s.id_shop
      WHERE o.created_at >= CURRENT_DATE - ($2::int * INTERVAL '1 day')
        AND o.status <> 'ĐÃ HỦY'
    )
    SELECT LEAST($5::numeric, GREATEST($4::numeric, CEIL((total_fee / $2::numeric) * $3::numeric))) AS credit_limit
    FROM fee_total
    `,
    [id_user, CREDIT_HISTORY_DAYS, DEBT_GRACE_DAYS, MIN_DYNAMIC_CREDIT, MAX_DYNAMIC_CREDIT]
  );
  return Number(result.rows[0]?.credit_limit || MIN_DYNAMIC_CREDIT);
};

export const syncWalletDebtState = async (id_user: number, db: any) => {
  const creditLimit = await calculateDynamicCreditLimit(id_user, db);

  await db.query('UPDATE wallets SET credit_limit = $2 WHERE id_account = $1', [id_user, creditLimit]);

  await db.query(
    `
    UPDATE wallets
    SET
      balance = CASE WHEN balance >= used_credit THEN balance - used_credit ELSE 0 END,
      used_credit = CASE WHEN balance >= used_credit THEN 0 ELSE used_credit - balance END
    WHERE id_account = $1
      AND COALESCE(balance, 0) > 0
      AND COALESCE(used_credit, 0) > 0
    `,
    [id_user]
  );

  await db.query(
    `
    UPDATE wallets
    SET debt_started_at = NOW(),
        debt_due_at = NOW() + ($2::int * INTERVAL '1 day')
    WHERE id_account = $1
      AND COALESCE(used_credit, 0) > 0
      AND debt_started_at IS NULL
    `,
    [id_user, DEBT_GRACE_DAYS]
  );

  await db.query(
    `
    UPDATE wallets
    SET debt_started_at = NULL,
        debt_due_at = NULL,
        debt_locked_at = NULL
    WHERE id_account = $1
      AND COALESCE(used_credit, 0) <= 0
    `,
    [id_user]
  );

  await db.query(
    `
    UPDATE wallets
    SET debt_locked_at = COALESCE(debt_locked_at, NOW())
    WHERE id_account = $1
      AND COALESCE(used_credit, 0) > 0
      AND (
        (debt_due_at IS NOT NULL AND debt_due_at < NOW())
        OR COALESCE(used_credit, 0) >= COALESCE(credit_limit, 0)
      )
    `,
    [id_user]
  );

  await db.query(
    `
    UPDATE wallets
    SET debt_status = CASE
      WHEN COALESCE(used_credit, 0) <= 0 THEN 'NORMAL'
      WHEN debt_locked_at IS NOT NULL THEN 'LOCKED'
      WHEN debt_due_at IS NOT NULL AND debt_due_at < NOW() THEN 'LOCKED'
      WHEN COALESCE(used_credit, 0) >= COALESCE(credit_limit, 0) THEN 'LOCKED'
      ELSE 'WARNING'
    END
    WHERE id_account = $1
    `,
    [id_user]
  );

  return creditLimit;
};

export const getSyncedWalletByUserId = async (id_user: number, db: any, forUpdate = false) => {
  if (forUpdate) {
    await db.query('SELECT id_wallet FROM wallets WHERE id_account = $1 FOR UPDATE', [id_user]);
  }
  await syncWalletDebtState(id_user, db);
  const result = await db.query(
    `SELECT * FROM wallets WHERE id_account = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    [id_user]
  );
  return enrichWalletDebt(result.rows[0] || null);
};

export const deductWalletAndLog = async (
  id_wallet: number,
  amount: number,
  note: string,
  db: any,
  allowOverLimit = false
) => {
  const result = await db.query(
    `
    UPDATE wallets
    SET
      used_credit = used_credit + CASE WHEN balance < $1 THEN $1 - balance ELSE 0 END,
      balance = CASE WHEN balance < $1 THEN 0 ELSE balance - $1 END
    WHERE id_wallet = $2
      ${allowOverLimit ? '' : 'AND (balance + credit_limit - used_credit) >= $1'}
    RETURNING id_wallet, id_account
    `,
    [amount, id_wallet]
  );

  if (!result.rowCount) {
    throw new Error('So du/han muc vi shop khong du de tru phi.');
  }

  await db.query('INSERT INTO transaction_history (id_wallet, amount, type) VALUES ($1, $2, $3)', [
    id_wallet,
    -amount,
    note,
  ]);

  await syncWalletDebtState(Number(result.rows[0].id_account), db);
  return amount;
};
