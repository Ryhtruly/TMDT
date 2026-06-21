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

const WIN1252_EXTRA: Record<number, number> = {
  0x80: 0x20ac,
  0x82: 0x201a,
  0x83: 0x0192,
  0x84: 0x201e,
  0x85: 0x2026,
  0x86: 0x2020,
  0x87: 0x2021,
  0x88: 0x02c6,
  0x89: 0x2030,
  0x8a: 0x0160,
  0x8b: 0x2039,
  0x8c: 0x0152,
  0x8e: 0x017d,
  0x91: 0x2018,
  0x92: 0x2019,
  0x93: 0x201c,
  0x94: 0x201d,
  0x95: 0x2022,
  0x96: 0x2013,
  0x97: 0x2014,
  0x98: 0x02dc,
  0x99: 0x2122,
  0x9a: 0x0161,
  0x9b: 0x203a,
  0x9c: 0x0153,
  0x9e: 0x017e,
  0x9f: 0x0178,
};

const UNICODE_TO_WIN1252 = Object.fromEntries(
  Object.entries(WIN1252_EXTRA).map(([byte, codePoint]) => [codePoint, Number(byte)])
);

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder('utf-8');

const decodeWin1252Byte = (byte: number) => String.fromCharCode(WIN1252_EXTRA[byte] ?? byte);
const encodeWin1252Char = (char: string) => UNICODE_TO_WIN1252[char.charCodeAt(0)] ?? char.charCodeAt(0);

const toMojibake = (value: string) =>
  Array.from(utf8Encoder.encode(value))
    .map((byte: number) => decodeWin1252Byte(byte))
    .join('');

const repairMojibake = (value: string) => {
  try {
    const bytes = Uint8Array.from(Array.from(value).map((char) => encodeWin1252Char(char)));
    return utf8Decoder.decode(bytes);
  } catch {
    return value;
  }
};

const normalizeLoose = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

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

const STATUS_ALIASES: Record<OrderStatusKey, string[]> = {
  WAITING_PICKUP: ['WAITING_PICKUP', 'CHO LAY HANG', 'CHO LAY', ORDER_STATUS.WAITING_PICKUP],
  PICKED_UP: ['PICKED_UP', 'DA LAY HANG', 'DA LAY', ORDER_STATUS.PICKED_UP],
  IN_TRANSIT: ['IN_TRANSIT', 'DANG TRUNG CHUYEN', ORDER_STATUS.IN_TRANSIT],
  AT_WAREHOUSE: ['AT_WAREHOUSE', 'TAI KHO', 'T?I KHO', ORDER_STATUS.AT_WAREHOUSE],
  INBOUND_WAREHOUSE: ['INBOUND_WAREHOUSE', 'NHAP KHO', ORDER_STATUS.INBOUND_WAREHOUSE],
  DELIVERING: ['DELIVERING', 'DANG GIAO', ORDER_STATUS.DELIVERING],
  DELIVERED: ['DELIVERED', 'GIAO THANH CONG', ORDER_STATUS.DELIVERED],
  DELIVERY_FAILED: ['DELIVERY_FAILED', 'GIAO THAT BAI', ORDER_STATUS.DELIVERY_FAILED],
  PICKUP_FAILED: ['PICKUP_FAILED', 'LAY HANG THAT BAI', ORDER_STATUS.PICKUP_FAILED],
  RETURNING: ['RETURNING', 'DANG HOAN', ORDER_STATUS.RETURNING],
  RETURNED: ['RETURNED', 'HOAN HANG', ORDER_STATUS.RETURNED],
  RETURN_COMPLETED: ['RETURN_COMPLETED', 'DA TRA SHOP', ORDER_STATUS.RETURN_COMPLETED],
  CANCELLED: ['CANCELLED', 'DA HUY', ORDER_STATUS.CANCELLED],
};

const DELIVERY_ATTEMPT_RESULT_ALIASES: Record<string, string[]> = {
  [DELIVERY_ATTEMPT_RESULT.SUCCESS]: ['SUCCESS', 'THANH CONG', DELIVERY_ATTEMPT_RESULT.SUCCESS],
  [DELIVERY_ATTEMPT_RESULT.FAILED]: ['FAILED', 'THAT BAI', DELIVERY_ATTEMPT_RESULT.FAILED],
};

const expandAliases = (values: string[]) =>
  Array.from(
    new Set(
      values.flatMap((value) => [
        value,
        toMojibake(value),
        toMojibake(toMojibake(value)),
      ])
    )
  );

const resolveStatusKey = (value: string): OrderStatusKey | null => {
  const candidates = Array.from(new Set([String(value || ''), repairMojibake(String(value || ''))]));

  for (const candidate of candidates) {
    const normalized = normalizeLoose(candidate);
    for (const [key, aliases] of Object.entries(STATUS_ALIASES) as Array<[OrderStatusKey, string[]]>) {
      if (aliases.some((alias) => normalizeLoose(alias) === normalized)) {
        return key;
      }
    }
  }

  return null;
};

export const orderStatusVariants = (canonicalStatus: string): string[] => {
  const resolved = resolveStatusKey(canonicalStatus);
  return expandAliases(resolved ? STATUS_ALIASES[resolved] : [canonicalStatus]);
};

export const orderStatusEquals = (actualStatus: string, canonicalStatus: string): boolean => {
  const actualKey = resolveStatusKey(actualStatus);
  const canonicalKey = resolveStatusKey(canonicalStatus);
  return Boolean(actualKey && canonicalKey && actualKey === canonicalKey);
};

export const orderStatusIn = (actualStatus: string, canonicalStatuses: string[]): boolean => {
  return canonicalStatuses.some((status) => orderStatusEquals(actualStatus, status));
};

export const deliveryAttemptResultVariants = (canonicalResult: string): string[] => {
  return expandAliases(DELIVERY_ATTEMPT_RESULT_ALIASES[canonicalResult] || [canonicalResult]);
};
