/**
 * TEST SCRIPT - ALL API ENDPOINTS
 * Run: npx ts-node test_api.ts
 * Requires: Server at localhost:3000
 */

const BASE_URL = 'http://localhost:3000/api';

let shopToken = '';
let shipperToken = '';
let stockkeeperToken = '';
let adminToken = '';

let passed = 0;
let failed = 0;
const errors: string[] = [];

async function api(method: string, path: string, body?: any, token?: string): Promise<any> {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, data: await res.json() };
  } catch (e: any) {
    return { status: 0, data: { message: e.message } };
  }
}

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    passed++;
  } else {
    console.log(`  [FAIL] ${name} -> ${detail || 'FAILED'}`);
    failed++;
    errors.push(name);
  }
}

async function run() {
  console.log('\n=== START TESTING ALL API ===\n');

  // 1. AUTH
  console.log('\n--- 1. AUTH ---');
  let r = await api('POST', '/auth/login', { phone: '0901234567', password: 'Admin@123' });
  assert('Admin login', r.status === 200 && r.data.accessToken != null);
  adminToken = r.data.accessToken || '';

  r = await api('POST', '/auth/login', { phone: '0987654321', password: 'Shop1@123' });
  assert('Shop login', r.status === 200 && r.data.accessToken != null);
  shopToken = r.data.accessToken || '';

  r = await api('POST', '/auth/login', { phone: '0933445566', password: 'Shipper1@123' });
  assert('Shipper login', r.status === 200 && r.data.accessToken != null);
  shipperToken = r.data.accessToken || '';

  r = await api('POST', '/auth/login', { phone: '0977889900', password: 'Stock1@123' });
  assert('Stockkeeper login', r.status === 200 && r.data.accessToken != null);
  stockkeeperToken = r.data.accessToken || '';

  r = await api('POST', '/auth/login', { phone: '0901234567', password: 'wrongpass' });
  assert('Wrong password -> 401', r.status === 401);

  // 2. ADMIN
  console.log('\n--- 2. ADMIN ---');
  r = await api('GET', '/admin/dashboard-stats', null, adminToken);
  assert('Dashboard stats', r.status === 200 && r.data.data != null);

  r = await api('GET', '/admin/infrastructure', null, adminToken);
  assert('Infrastructure list', r.status === 200, `status=${r.status} msg=${JSON.stringify(r.data)}`);

  r = await api('GET', '/admin/roles', null, adminToken);
  assert('Roles list', r.status === 200 && Array.isArray(r.data.data));

  r = await api('GET', '/admin/dashboard-stats', null, shopToken);
  assert('Shop calls admin -> 403', r.status === 403);

  // 3. SHOP
  console.log('\n--- 3. SHOP ---');
  r = await api('GET', '/shop/profile', null, shopToken);
  assert('Shop profile', r.status === 200 && r.data.data != null);

  r = await api('GET', '/shop/stores', null, shopToken);
  assert('Shop stores', r.status === 200 && Array.isArray(r.data.data));

  r = await api('GET', '/shop/banks', null, shopToken);
  assert('Shop banks', r.status === 200);

  r = await api('GET', '/shop/wallet', null, shopToken);
  assert('Shop wallet', r.status === 200 && r.data.data != null);

  r = await api('GET', '/shop/orders/service-types', null, shopToken);
  assert('Service types', r.status === 200 && Array.isArray(r.data.data));

  r = await api('POST', '/shop/orders/preview-fee', {
    id_store: 1, id_dest_area: 1, id_service_type: 1,
    weight: 2000, item_value: 500000, cod_amount: 500000
  }, shopToken);
  assert('Preview fee', r.status === 200, `status=${r.status}`);

  r = await api('GET', '/shop/orders', null, shopToken);
  assert('My orders', r.status === 200);

  r = await api('GET', '/shop/cashflow', null, shopToken);
  assert('Cashflow report', r.status === 200);

  // 4. TRACKING
  console.log('\n--- 4. TRACKING ---');
  r = await api('GET', '/orders/track/GHN_000000005');
  assert('Track existing order', r.status === 200);

  r = await api('GET', '/orders/track/FAKE_CODE123');
  assert('Track non-existing -> 404', r.status === 404);

  // 5. SHIPPER
  console.log('\n--- 5. SHIPPER ---');
  r = await api('GET', '/shipper/cod-summary?date=2026-04-03', null, shipperToken);
  assert('Shipper COD summary', r.status === 200 && r.data.data != null);

  r = await api('GET', '/shipper/income', null, shipperToken);
  assert('Shipper income', r.status === 200, `status=${r.status} body=${JSON.stringify(r.data).substring(0,100)}`);

  r = await api('GET', '/shipper/income/history', null, shipperToken);
  assert('Shipper income history', r.status === 200);

  // 6. ROUTING
  console.log('\n--- 6. ROUTING ---');
  r = await api('POST', '/routes/resolve', { id_store: 1, id_dest_area: 3, service_type: 'Standard' }, shopToken);
  assert('Resolve route INTER_HUB', r.status === 200, `type=${r.data.data?.route_type}`);

  r = await api('POST', '/routes/resolve', { id_store: 1, id_dest_area: 1, service_type: 'Hỏa tốc' }, shopToken);
  assert('Resolve route EXPRESS (hoa toc)', r.status === 200 && r.data.data?.route_type === 'EXPRESS', `type=${r.data.data?.route_type}`);

  r = await api('GET', '/routes', null, adminToken);
  assert('Admin get all routes', r.status === 200);

  // 7. PROMOTIONS
  console.log('\n--- 7. PROMOTIONS ---');
  r = await api('GET', '/promotions');
  assert('Public promos', r.status === 200 && Array.isArray(r.data.data));

  r = await api('POST', '/promotions/apply', { code: 'FREESHIP_HN', shipping_fee: 120000 }, shopToken);
  assert('Apply promo FREESHIP_HN', r.status === 200, `discount=${r.data.data?.discount}`);

  r = await api('POST', '/promotions/apply', { code: 'INVALIDCODE', shipping_fee: 100000 }, shopToken);
  assert('Apply invalid promo -> 400', r.status === 400);

  // 8. COD PAYOUT
  console.log('\n--- 8. COD PAYOUT ---');
  r = await api('GET', '/cod/my-payouts', null, shopToken);
  assert('Shop payouts history', r.status === 200);

  r = await api('GET', '/cod/pending', null, adminToken);
  assert('Admin pending payouts', r.status === 200);

  // 9. INCIDENTS
  console.log('\n--- 9. INCIDENTS ---');
  r = await api('GET', '/incidents', null, adminToken);
  assert('Admin get incidents', r.status === 200);

  // 10. NOTIFICATIONS & FEEDBACKS
  console.log('\n--- 10. NOTIFICATIONS & FEEDBACKS ---');
  r = await api('GET', '/notifications', null, shopToken);
  assert('Shop notifications', r.status === 200);

  r = await api('PUT', '/notifications/read-all', null, shopToken);
  assert('Mark all read', r.status === 200);

  r = await api('POST', '/feedbacks', { title: 'Test', content: 'Test feedback' }, shopToken);
  assert('Submit feedback', r.status === 201);

  r = await api('GET', '/feedbacks', null, adminToken);
  assert('Admin get feedbacks', r.status === 200);

  // 11. OPERATIONS REPORT & SEARCH
  console.log('\n--- 11. OPERATIONS REPORT & SEARCH ---');
  r = await api('GET', '/shop/operations-report', null, shopToken);
  assert('Operations report', r.status === 200, `data=${JSON.stringify(r.data.data).substring(0,80)}`);

  r = await api('GET', '/shop/search-orders?tracking_code=GHN', null, shopToken);
  assert('Search by tracking_code', r.status === 200 && Array.isArray(r.data.data));

  // 12. SAFE DELETE
  console.log('\n--- 12. SAFE DELETE ---');
  r = await api('GET', '/admin/hub/2/safe-delete', null, adminToken);
  assert('Safe delete Hub 2 (has orders)', r.status === 409 || r.status === 200, `status=${r.status}`);

  // 13. AUDIT LOG
  console.log('\n--- 13. AUDIT LOG ---');
  r = await api('GET', '/admin/audit-log', null, adminToken);
  assert('Admin audit log', r.status === 200, `status=${r.status} count=${r.data.data?.length}`);

  // 14. ADMIN SET SHIPPER SALARY
  console.log('\n--- 14. ADMIN SHIPPER SALARY ---');
  r = await api('POST', '/admin/shipper-salary', {
    id_user: 5, period: '2026-04', base_salary: 5000000, penalty: 0
  }, adminToken);
  assert('Set shipper salary', r.status === 200, `status=${r.status}`);

  // 15. AUTHORIZATION
  console.log('\n--- 15. AUTHORIZATION ---');
  r = await api('GET', '/admin/dashboard-stats');
  assert('No token -> 401', r.status === 401);

  r = await api('GET', '/admin/audit-log', null, shopToken);
  assert('Shop -> admin audit-log -> 403', r.status === 403);

  r = await api('GET', '/shipper/income', null, shopToken);
  assert('Shop -> shipper income -> 403', r.status === 403);

  r = await api('POST', '/bags', { origin_hub_id: 1, dest_hub_id: 2, order_ids: [1] }, shopToken);
  assert('Shop create bag -> 403', r.status === 403);

  // RESULT
  console.log('\n' + '='.repeat(50));
  console.log(`\nRESULT: ${passed} PASSED | ${failed} FAILED | Total: ${passed + failed}\n`);
  if (errors.length > 0) {
    console.log('FAILED TESTS:');
    errors.forEach(e => console.log(`  - ${e}`));
  } else {
    console.log('ALL TESTS PASSED!\n');
  }
}

run().catch(console.error);
