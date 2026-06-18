type OrderStatusKey =
  | 'WAITING_PICKUP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'AT_WAREHOUSE'
  | 'INBOUND_WAREHOUSE'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'PICKUP_FAILED'
  | 'RETURNING'
  | 'RETURNED'
  | 'RETURN_COMPLETED'
  | 'CANCELLED';

export const ORDER_STATUS: Record<OrderStatusKey, string> = {
  WAITING_PICKUP: '\u0043\u0048\u1edc \u004c\u1ea4\u0059 \u0048\u00c0\u004e\u0047',
  PICKED_UP: '\u0110\u00c3 \u004c\u1ea4\u0059 \u0048\u00c0\u004e\u0047',
  IN_TRANSIT: '\u0110\u0041\u004e\u0047 \u0054\u0052\u0055\u004e\u0047 \u0043\u0048\u0055\u0059\u1ec2\u004e',
  AT_WAREHOUSE: '\u0054\u1ea0\u0049 \u004b\u0048\u004f',
  INBOUND_WAREHOUSE: '\u004e\u0048\u1eac\u0050 \u004b\u0048\u004f',
  DELIVERING: '\u0110\u0041\u004e\u0047 \u0047\u0049\u0041\u004f',
  DELIVERED: '\u0047\u0049\u0041\u004f \u0054\u0048\u00c0\u004e\u0048 \u0043\u00d4\u004e\u0047',
  DELIVERY_FAILED: '\u0047\u0049\u0041\u004f \u0054\u0048\u1ea4\u0054 \u0042\u1ea0\u0049',
  PICKUP_FAILED: '\u004c\u1ea4\u0059 \u0048\u00c0\u004e\u0047 \u0054\u0048\u1ea4\u0054 \u0042\u1ea0\u0049',
  RETURNING: '\u0110\u0041\u004e\u0047 \u0048\u004f\u00c0\u004e',
  RETURNED: '\u0048\u004f\u00c0\u004e \u0048\u00c0\u004e\u0047',
  RETURN_COMPLETED: '\u0110\u00c3 \u0054\u0052\u1ea2 \u0053\u0048\u004f\u0050',
  CANCELLED: '\u0110\u00c3 \u0048\u1ee6\u0059',
};

export const DELIVERY_ATTEMPT_RESULT = {
  SUCCESS: '\u0054\u0048\u00c0\u004e\u0048 \u0043\u00d4\u004e\u0047',
  FAILED: '\u0054\u0048\u1ea4\u0054 \u0042\u1ea0\u0049',
};

const BROKEN_DELIVERY_ATTEMPT_RESULT_VARIANTS: Record<string, string[]> = {
  [DELIVERY_ATTEMPT_RESULT.SUCCESS]: ['TH\u00c3\u20acNH C\u00c3\u201dNG'],
  [DELIVERY_ATTEMPT_RESULT.FAILED]: ['TH\u00e1\u00ba\u00a4T B\u00e1\u00ba\u00a0I'],
};

const BROKEN_MANUAL_VARIANTS: Record<string, string[]> = {
  [ORDER_STATUS.AT_WAREHOUSE]: ['T?I KHO'],
};

const mojibakeOnce = (value: string) => unescape(encodeURIComponent(value));
const mojibakeTwice = (value: string) => mojibakeOnce(mojibakeOnce(value));

export const orderStatusVariants = (canonicalStatus: string): string[] => {
  return Array.from(new Set([
    canonicalStatus,
    mojibakeOnce(canonicalStatus),
    mojibakeTwice(canonicalStatus),
    ...(BROKEN_MANUAL_VARIANTS[canonicalStatus] || []),
  ]));
};

export const orderStatusEquals = (actualStatus: string, canonicalStatus: string): boolean => {
  return orderStatusVariants(canonicalStatus).includes(String(actualStatus || ''));
};

export const orderStatusIn = (actualStatus: string, canonicalStatuses: string[]): boolean => {
  return canonicalStatuses.some((status) => orderStatusEquals(actualStatus, status));
};

export const deliveryAttemptResultVariants = (canonicalResult: string): string[] => {
  return Array.from(new Set([
    canonicalResult,
    mojibakeOnce(canonicalResult),
    mojibakeTwice(canonicalResult),
    ...(BROKEN_DELIVERY_ATTEMPT_RESULT_VARIANTS[canonicalResult] || []),
  ]));
};
