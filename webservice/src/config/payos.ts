const { PayOS } = require('@payos/node');
const dotenv = require('dotenv');
// Force override để đảm bảo luôn nạp key mới nhất nếu .env bị cache
dotenv.config({ override: true });

const PAYOS_CLIENT_ID = (process.env.PAYOS_CLIENT_ID || '').replace(/['"]/g, '').trim();
const PAYOS_API_KEY = (process.env.PAYOS_API_KEY || '').replace(/['"]/g, '').trim();
const PAYOS_CHECKSUM_KEY = (process.env.PAYOS_CHECKSUM_KEY || '').replace(/['"]/g, '').trim();
export const isPayOSConfigured = Boolean(PAYOS_CLIENT_ID && PAYOS_API_KEY && PAYOS_CHECKSUM_KEY);

if (!isPayOSConfigured) {
  console.warn('Thiếu cấu hình PayOS trong file .env');
} else {
  console.log(`[PayOS Init] ClientID: ${PAYOS_CLIENT_ID.substring(0, 5)}... ChecksumKey length: ${PAYOS_CHECKSUM_KEY.length}`);
}

export const payOS = new PayOS({
  clientId: PAYOS_CLIENT_ID,
  apiKey: PAYOS_API_KEY,
  checksumKey: PAYOS_CHECKSUM_KEY
});
