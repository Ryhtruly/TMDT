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

const decodeWin1252Byte = (byte: number) => String.fromCharCode(WIN1252_EXTRA[byte] ?? byte);

const encodeWin1252Char = (char: string) => {
  const codePoint = char.charCodeAt(0);
  return UNICODE_TO_WIN1252[codePoint] ?? codePoint;
};

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder('utf-8');

const VN = {
  WAITING_PICKUP: '\u0043\u0048\u1EDC \u004C\u1EA4\u0059 \u0048\u00C0\u004E\u0047',
  PICKED_UP: '\u0110\u00C3 \u004C\u1EA4\u0059 \u0048\u00C0\u004E\u0047',
  DELIVERING: '\u0110\u0041\u004E\u0047 \u0047\u0049\u0041\u004F',
  DELIVERED: '\u0047\u0049\u0041\u004F \u0054\u0048\u00C0\u004E\u0048 \u0043\u00D4\u004E\u0047',
  DELIVERY_FAILED: '\u0047\u0049\u0041\u004F \u0054\u0048\u1EA4\u0054 \u0042\u1EA0\u0049',
  IN_TRANSIT: '\u0110\u0041\u004E\u0047 \u0054\u0052\u0055\u004E\u0047 \u0043\u0048\u0055\u0059\u1EC2\u004E',
  RETURNING: '\u0110\u0041\u004E\u0047 \u0048\u004F\u00C0\u004E',
  RETURNED: '\u0048\u004F\u00C0\u004E \u0048\u00C0\u004E\u0047',
  AT_WAREHOUSE: '\u0054\u1EA0\u0049 \u004B\u0048\u004F',
  INBOUND_WAREHOUSE: '\u004E\u0048\u1EACP \u004B\u0048\u004F',
} as const;

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

const buildAliases = (...values: string[]) => {
  const expanded = values.flatMap((value) => [value, toMojibake(value)]);
  return Array.from(new Set(expanded));
};

const STATUS_ALIASES = {
  WAITING_PICKUP: buildAliases('WAITING_PICKUP', 'CHO LAY HANG', 'CHO LAY', VN.WAITING_PICKUP),
  PICKED_UP: buildAliases('PICKED_UP', 'DA LAY HANG', 'DA LAY', VN.PICKED_UP),
  DELIVERING: buildAliases('DELIVERING', 'DANG GIAO', VN.DELIVERING),
  DELIVERED: buildAliases('DELIVERED', 'GIAO THANH CONG', VN.DELIVERED),
  DELIVERY_FAILED: buildAliases('DELIVERY_FAILED', 'GIAO THAT BAI', VN.DELIVERY_FAILED),
  IN_TRANSIT: buildAliases('IN_TRANSIT', 'DANG TRUNG CHUYEN', VN.IN_TRANSIT),
  RETURNING: buildAliases('RETURNING', 'DANG HOAN', 'HOAN HANG', VN.RETURNING, VN.RETURNED),
  AT_WAREHOUSE: buildAliases('AT_WAREHOUSE', 'TAI KHO', VN.AT_WAREHOUSE),
  INBOUND_WAREHOUSE: buildAliases('INBOUND_WAREHOUSE', 'NHAP KHO', VN.INBOUND_WAREHOUSE),
} as const;

export const ORDER_STATUS = {
  WAITING_PICKUP: 'WAITING_PICKUP',
  PICKED_UP: 'PICKED_UP',
  DELIVERING: 'DELIVERING',
  DELIVERED: 'DELIVERED',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  IN_TRANSIT: 'IN_TRANSIT',
  RETURNING: 'RETURNING',
  AT_WAREHOUSE: 'AT_WAREHOUSE',
  INBOUND_WAREHOUSE: 'INBOUND_WAREHOUSE',
} as const;

type OrderStatusKey = keyof typeof STATUS_ALIASES;

const normalizeLoose = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const resolveKey = (status: string): OrderStatusKey | null => {
  const candidates = Array.from(new Set([String(status || ''), repairMojibake(String(status || ''))]));

  for (const candidate of candidates) {
    const normalized = normalizeLoose(candidate);

    if ((Object.keys(STATUS_ALIASES) as OrderStatusKey[]).includes(normalized as OrderStatusKey)) {
      return normalized as OrderStatusKey;
    }

    for (const [key, aliases] of Object.entries(STATUS_ALIASES) as Array<[OrderStatusKey, readonly string[]]>) {
      if (aliases.some((alias) => normalizeLoose(alias) === normalized)) {
        return key;
      }
    }
  }

  return null;
};

export const orderStatusVariants = (statusKey: keyof typeof ORDER_STATUS) => {
  const aliases = STATUS_ALIASES[statusKey];
  return Array.from(new Set([ORDER_STATUS[statusKey], ...aliases]));
};

export const orderStatusEquals = (value: string, statusKey: keyof typeof ORDER_STATUS) =>
  resolveKey(value) === statusKey;

export const orderStatusIn = (value: string, statusKeys: Array<keyof typeof ORDER_STATUS>) => {
  const resolved = resolveKey(value);
  return resolved ? statusKeys.includes(resolved) : false;
};
