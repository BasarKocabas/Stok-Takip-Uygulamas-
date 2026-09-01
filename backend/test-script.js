import fs from 'fs';

async function fetchApi(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`http://localhost:3001/api${path}`, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function login(email) {
  const res = await fetchApi('/auth/login', 'POST', { email, password: 'password123' });
  return res.data.token;
}

async function runTests() {
  console.log("Starting tests...");
  const adminToken = await login('admin@ansava.com');
  const managerToken = await login('manager@ansava.com');
  
  // Need to get work orders
  const woRes = await fetchApi('/work-orders', 'GET', null, adminToken);
  const wos = woRes.data.data;
  const pendingWo = wos.find(w => w.approval_status === 'pending');
  const approvedWo = wos.find(w => w.approval_status === 'approved');
  
  console.log(`Pending WO: ${pendingWo.id}`);
  console.log(`Approved WO: ${approvedWo.id}`);

  const productRes = await fetchApi('/products', 'GET', null, adminToken);
  const product = productRes.data.data[0];

  const eqRes = await fetchApi('/equipment', 'GET', null, adminToken);
  const eq = eqRes.data.data[0];

  console.log('--- Testing Pending WO ---');
  // Materials POST/PUT allowed
  let res = await fetchApi(`/work-orders/${pendingWo.id}/items`, 'POST', { product_id: product.id, requested_quantity: 1 }, managerToken);
  console.log(`Pending WO Materials POST: ${res.status} (Expected: 201)`);
  
  // Get item id
  const pWoDetail = await fetchApi(`/work-orders/${pendingWo.id}`, 'GET', null, managerToken);
  const itemId = pWoDetail.data.items[pWoDetail.data.items.length - 1].id;
  
  res = await fetchApi(`/work-orders/${pendingWo.id}/items/${itemId}`, 'PUT', { approved_quantity: 1 }, adminToken);
  console.log(`Pending WO Materials PUT (Admin): ${res.status} (Expected: 200)`);
  
  // Labor POST 409
  res = await fetchApi(`/work-orders/${pendingWo.id}/labor`, 'POST', {
    user_id: pWoDetail.data.created_by, date: '2026-09-01', hours_worked: 1, hourly_rate: 10
  }, managerToken);
  console.log(`Pending WO Labor POST: ${res.status} (Expected: 409)`);

  // Equipment POST 409
  res = await fetchApi(`/work-orders/${pendingWo.id}/equipment`, 'POST', {
    equipment_name: 'Test', date: '2026-09-01', hours_used: 1
  }, managerToken);
  console.log(`Pending WO Equipment POST: ${res.status} (Expected: 409)`);

  // WO-linked OUT approval 400
  const stockRes = await fetchApi('/stock-movements', 'GET', null, adminToken);
  const pendingOut = stockRes.data.data.find(m => m.work_order_id === pendingWo.id && !m.is_approved && !m.is_rejected && m.movement_type === 'OUT');
  
  if (pendingOut) {
    res = await fetchApi(`/stock-movements/${pendingOut.id}/approve`, 'POST', null, adminToken);
    console.log(`Pending WO OUT approval: ${res.status} (Expected: 400)`);
  } else {
    console.log(`Pending WO OUT approval: Movement not found`);
  }
  
  // cost-by-client excluded
  res = await fetchApi('/reports/cost-by-client', 'GET', null, adminToken);
  console.log(`Pending WO cost-by-client check: ${JSON.stringify(res.data)}`);

  // work-order-costs allowed
  res = await fetchApi(`/reports/work-order-costs/${pendingWo.id}`, 'GET', null, adminToken);
  console.log(`Pending WO work-order-costs: ${res.status} (Expected: 200)`);

  console.log('--- Testing Dangerous Sequence ---');
  // As admin: reject pending WO
  res = await fetchApi(`/work-orders/${pendingWo.id}/reject`, 'POST', null, adminToken);
  console.log(`Admin reject pending WO: ${res.status} (Expected: 200)`);
  
  // Try to approve movement again
  if (pendingOut) {
    res = await fetchApi(`/stock-movements/${pendingOut.id}/approve`, 'POST', null, adminToken);
    console.log(`Rejected WO OUT approval attempt: ${res.status} (Expected: 400 - "Bu hareket zaten reddedilmiş" or similar)`);
  }

  // work-order-costs on rejected WO 409
  res = await fetchApi(`/reports/work-order-costs/${pendingWo.id}`, 'GET', null, adminToken);
  console.log(`Rejected WO work-order-costs: ${res.status} (Expected: 409)`);

  console.log('--- Testing Approved WO ---');
  // Labor POST 201
  res = await fetchApi(`/work-orders/${approvedWo.id}/labor`, 'POST', {
    user_id: pWoDetail.data.created_by, date: '2026-09-01', hours_worked: 1, hourly_rate: 10, description: 'Test'
  }, managerToken);
  console.log(`Approved WO Labor POST: ${res.status} (Expected: 201)`);
  
  // Eq Assignment POST 201
  res = await fetchApi(`/work-orders/${approvedWo.id}/equipment-assignments`, 'POST', {
    equipment_id: eq.id, start_date: '2026-09-01', rate_unit: 'fixed', cost: 10
  }, managerToken);
  console.log(`Approved WO Eq Assign POST: ${res.status} (Expected: 201)`);

  console.log("Done.");
  process.exit(0);
}

runTests().catch(console.error);
