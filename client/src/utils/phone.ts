const VIETNAM_MOBILE_PREFIXES = new Set([
  '032', '033', '034', '035', '036', '037', '038', '039',
  '052', '055', '056', '058', '059',
  '070', '076', '077', '078', '079',
  '081', '082', '083', '084', '085', '086', '087', '088', '089',
  '090', '091', '092', '093', '094',
  '096', '097', '098', '099',
]);

export const normalizeVietnamPhone = (value: unknown) => {
  let phone = String(value || '').trim().replace(/[\s.\-()]/g, '');
  if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith('84') && phone.length === 11) phone = `0${phone.slice(2)}`;
  return phone;
};

export const isValidVietnamPhone = (value: unknown) => {
  const phone = normalizeVietnamPhone(value);
  return /^\d{10}$/.test(phone) && VIETNAM_MOBILE_PREFIXES.has(phone.slice(0, 3));
};

export const vietnamPhoneError = 'Số điện thoại không hợp lệ. Nhập SĐT di động Việt Nam 10 số, ví dụ 0912345678 hoặc +84912345678.';
