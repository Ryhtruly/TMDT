const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[.\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeProvinceName = (value: string): string => {
  let normalized = normalizeText(value).replace(/^(thanh pho|tp|tinh)\s*/, '');

  if (['ho chi minh', 'hcm', 'tphcm', 'sai gon'].includes(normalized)) return 'ho chi minh';
  if (['ha noi', 'hn'].includes(normalized)) return 'ha noi';
  if (['da nang', 'dn'].includes(normalized)) return 'da nang';

  return normalized;
};

export const normalizeDistrictName = (value: string): string => {
  let normalized = normalizeText(value);

  normalized = normalized.replace(/^(quan|q)\s*/, '');
  normalized = normalized.replace(/^(huyen|h)\s*/, '');
  normalized = normalized.replace(/^(thi xa|tx)\s*/, '');
  normalized = normalized.replace(/^(thi tran|tt)\s*/, '');
  normalized = normalized.replace(/^(thanh pho|tp)\s*/, '');

  return normalized.trim();
};

export const normalizeWardName = (value: string): string => {
  let normalized = normalizeText(value);

  normalized = normalized.replace(/^(phuong|p)\s*/, '');
  normalized = normalized.replace(/^(xa)\s*/, '');
  normalized = normalized.replace(/^(thi tran|tt)\s*/, '');

  return normalized.trim();
};

export const extractProvinceDistrictFromAddress = (address: string): { province: string; district: string } | null => {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;

  return {
    district: parts[parts.length - 2],
    province: parts[parts.length - 1],
  };
};

export const extractProvinceDistrictWardFromAddress = (
  address: string
): { province: string; district: string; ward: string } | null => {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 3) return null;

  return {
    ward: parts[parts.length - 3],
    district: parts[parts.length - 2],
    province: parts[parts.length - 1],
  };
};

export const isSameArea = (
  provinceA: string,
  districtA: string,
  provinceB: string,
  districtB: string
): boolean =>
  normalizeProvinceName(provinceA) === normalizeProvinceName(provinceB) &&
  normalizeDistrictName(districtA) === normalizeDistrictName(districtB);

export const isSameWardArea = (
  provinceA: string,
  districtA: string,
  wardA: string,
  provinceB: string,
  districtB: string,
  wardB: string
): boolean =>
  normalizeProvinceName(provinceA) === normalizeProvinceName(provinceB) &&
  normalizeDistrictName(districtA) === normalizeDistrictName(districtB) &&
  normalizeWardName(wardA) === normalizeWardName(wardB);

export const getRegionByProvince = (province: string): 'north' | 'central' | 'south' | 'unknown' => {
  const normalized = normalizeProvinceName(province);

  const south = new Set(['ho chi minh', 'binh duong', 'dong nai', 'long an', 'tay ninh', 'ba ria vung tau', 'can tho']);
  const central = new Set(['da nang', 'quang nam', 'thua thien hue', 'quang ngai', 'binh dinh', 'khanh hoa']);
  const north = new Set(['ha noi', 'bac ninh', 'hai phong', 'quang ninh', 'hung yen', 'hai duong', 'ha nam', 'nam dinh']);

  if (south.has(normalized)) return 'south';
  if (central.has(normalized)) return 'central';
  if (north.has(normalized)) return 'north';

  return 'unknown';
};
