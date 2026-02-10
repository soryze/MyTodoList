const STORAGE_KEY = 'print_quote_orders_v1';
const PIN_HASH_KEY = 'print_quote_owner_pin_hash_v1';
const ROLE_KEY = 'print_quote_role_v1';
const IDLE_LIMIT_MS = 10 * 60 * 1000;

const state = {
  role: localStorage.getItem(ROLE_KEY) || 'staff',
  current: emptyOrder(),
  history: loadHistory(),
  loadedOrderId: null,
  lastActivity: Date.now(),
};

function emptyOrder() {
  return {
    id: crypto.randomUUID(),
    status: 'Nháp',
    customer: '', phone: '', address: '', date: today(), orderNo: '',
    shippingFee: 0, transportFee: 0, discount: 0,
    items: [emptyItem()],
    totals: {},
    createdAt: new Date().toISOString(),
  };
}
function emptyItem() {
  return { id: crypto.randomUUID(), name: '', width: 0, length: 0, qty: 1, unit: '', area: 0, sellPrice: 0, costPrice: 0, amount: 0, cost: 0, warnings: [] };
}
function today() { return new Date().toISOString().slice(0, 10); }
function loadHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
function saveHistory() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history)); }
function formatVND(v) { return `${Math.round(v || 0).toLocaleString('vi-VN')}đ`; }
const els = {};

init();

function init() {
  ['customer','phone','address','date','orderNo','shippingFee','transportFee','discount','itemsBody','warningBox','historyBody','historySearch','subtotal','afterDiscount','totalCost','profit','profitPercent','customerTotal','roleBadge','ownerBtn','logoutOwnerBtn','statsContent','pinDialog','pinForm','pinInput','pinError','printArea'].forEach(id => els[id] = document.getElementById(id));
  bindFormFields();
  document.getElementById('addRowBtn').onclick = () => { state.current.items.push(emptyItem()); renderItems(); recalc(); };
  document.getElementById('saveBtn').onclick = saveCurrentOrder;
  document.getElementById('duplicateBtn').onclick = duplicateCurrentOrder;
  document.getElementById('copyBtn').onclick = copyQuote;
  document.getElementById('printBtn').onclick = printQuote;
  document.getElementById('exportBtn').onclick = exportHistory;
  document.getElementById('deleteHistoryBtn').onclick = clearHistory;
  els.historySearch.oninput = renderHistory;
  els.ownerBtn.onclick = openPinDialog;
  els.logoutOwnerBtn.onclick = () => setRole('staff');
  els.pinForm.addEventListener('submit', handlePinSubmit);
  document.addEventListener('input', () => state.lastActivity = Date.now());
  setInterval(checkIdleTimeout, 15000);

  fillForm();
  renderItems();
  recalc();
  renderHistory();
  renderRole();
}

function bindFormFields() {
  ['customer','phone','address','date','orderNo'].forEach(k => els[k].oninput = e => state.current[k] = e.target.value);
  ['shippingFee','transportFee','discount'].forEach(k => els[k].oninput = e => { state.current[k] = Number(e.target.value) || 0; recalc(); });
}
function fillForm() { Object.keys(state.current).forEach(k => { if (els[k]) els[k].value = state.current[k]; }); }
function isPaper(item) { return (item.name || '').toLowerCase().includes('giấy'); }

function renderItems() {
  els.itemsBody.innerHTML = '';
  state.current.items.forEach((item, i) => {
    const paper = isPaper(item);
    if (paper && !item.unit) item.unit = 'Cuộn';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input data-k="name" data-i="${i}" value="${esc(item.name)}"><div class="inline-warn" data-err="${i}"></div></td>
      <td><input data-k="width" data-i="${i}" type="number" step="0.01" value="${item.width||''}" class="${paper?'':'disabled'}" ${paper?'':'disabled'}></td>
      <td><input data-k="length" data-i="${i}" type="number" step="0.01" value="${item.length||''}" class="${paper?'':'disabled'}" ${paper?'':'disabled'}></td>
      <td><input data-k="qty" data-i="${i}" type="number" step="0.01" value="${item.qty||0}"></td>
      <td><input data-k="unit" data-i="${i}" value="${esc(item.unit)}"></td>
      <td><input data-k="area" data-i="${i}" value="${item.area?item.area.toFixed(3):''}" class="disabled" disabled></td>
      <td><input data-k="sellPrice" data-i="${i}" type="number" step="100" value="${item.sellPrice||0}"></td>
      <td class="owner-only"><input data-k="costPrice" data-i="${i}" type="number" step="100" value="${item.costPrice||0}"></td>
      <td>${formatVND(item.amount || 0)}</td>
      <td><button class="btn" data-del="${i}">X</button></td>`;
    els.itemsBody.appendChild(tr);
  });
  els.itemsBody.querySelectorAll('input').forEach(input => input.addEventListener('input', onItemInput));
  els.itemsBody.querySelectorAll('button[data-del]').forEach(btn => btn.onclick = () => {
    state.current.items.splice(Number(btn.dataset.del), 1);
    if (!state.current.items.length) state.current.items.push(emptyItem());
    renderItems(); recalc();
  });
  renderRole();
}
function onItemInput(e) {
  const i = Number(e.target.dataset.i);
  const k = e.target.dataset.k;
  state.current.items[i][k] = ['name','unit'].includes(k) ? e.target.value : Number(e.target.value) || 0;
  if (k === 'name') {
    const item = state.current.items[i];
    if (isPaper(item) && !item.unit) item.unit = 'Cuộn';
    if (!isPaper(item)) { item.width = 0; item.length = 0; item.area = 0; }
    renderItems();
  }
  recalc();
}

function recalc() {
  let subtotal = 0, totalCost = 0;
  const warnings = [];
  let hasPaper = false;
  state.current.items.forEach((item, idx) => {
    item.warnings = [];
    const paper = isPaper(item);
    if (paper) {
      hasPaper = true;
      item.area = (Number(item.width)||0) * (Number(item.length)||0) * (Number(item.qty)||0);
      item.amount = item.area * (Number(item.sellPrice)||0);
      item.cost = item.area * (Number(item.costPrice)||0);
      if (!(item.width > 0) || !(item.length > 0)) item.warnings.push('Thiếu Q.cách/C.dài cho mặt hàng giấy.');
    } else {
      item.area = 0;
      item.amount = (Number(item.qty)||0) * (Number(item.sellPrice)||0);
      item.cost = (Number(item.qty)||0) * (Number(item.costPrice)||0);
    }
    if ((Number(item.sellPrice)||0) < (Number(item.costPrice)||0)) item.warnings.push('Giá bán thấp hơn giá nhập.');
    if (item.amount <= 0) item.warnings.push('Thành tiền = 0. Không thể in/copy.');

    subtotal += item.amount;
    totalCost += item.cost;
    if (item.warnings.length) warnings.push(`Dòng ${idx + 1}: ${item.warnings.join(' ')}`);
  });

  const afterDiscount = subtotal * (1 - (Number(state.current.discount)||0)/100);
  const profit = afterDiscount - totalCost - (Number(state.current.shippingFee)||0);
  const customerTotal = afterDiscount + (Number(state.current.shippingFee)||0) + (Number(state.current.transportFee)||0);
  const profitPercent = afterDiscount > 0 ? (profit/afterDiscount)*100 : 0;
  state.current.totals = { subtotal, afterDiscount, totalCost, profit, customerTotal, profitPercent, hasPaper };

  els.subtotal.textContent = formatVND(subtotal);
  els.afterDiscount.textContent = formatVND(afterDiscount);
  els.totalCost.textContent = formatVND(totalCost);
  els.profit.textContent = formatVND(profit);
  els.customerTotal.textContent = formatVND(customerTotal);
  els.profitPercent.textContent = `${profitPercent.toFixed(2)}%`;

  renderWarnings(warnings);
}

function renderWarnings(warnings) {
  els.warningBox.innerHTML = warnings.map(w => `<div class="inline-warn">• ${esc(w)}</div>`).join('');
  state.current.items.forEach((item, idx) => {
    const slot = els.itemsBody.querySelector(`[data-err="${idx}"]`);
    if (slot) slot.textContent = item.warnings.join(' ');
  });
}

function ensureCanShareOrPrint(isPrint=false) {
  recalc();
  const zeroLine = state.current.items.some(i => (i.amount || 0) <= 0);
  if (zeroLine) return { ok: false, msg: 'Có dòng thành tiền = 0.' };
  const badPaper = state.current.items.some(i => isPaper(i) && (!(i.width > 0) || !(i.length > 0)));
  if (badPaper) return { ok: false, msg: 'Mặt hàng giấy thiếu Q.cách/C.dài.' };
  const priceLower = state.current.items.some(i => (Number(i.sellPrice)||0) < (Number(i.costPrice)||0));
  if (priceLower && isPrint && !confirm('Có dòng giá bán < giá nhập. Xác nhận tiếp tục in?')) return { ok: false, msg: 'Đã huỷ in.' };
  return { ok: true };
}

function saveCurrentOrder() {
  recalc();
  const clone = structuredClone(state.current);
  clone.updatedAt = new Date().toISOString();
  const idx = state.history.findIndex(o => o.id === clone.id);
  if (idx >= 0) state.history[idx] = clone; else state.history.unshift(clone);
  saveHistory();
  renderHistory();
  renderStats();
}
function duplicateCurrentOrder() {
  saveCurrentOrder();
  const cloned = structuredClone(state.current);
  cloned.id = crypto.randomUUID();
  cloned.date = today();
  cloned.orderNo = '';
  cloned.status = 'Nháp';
  state.current = cloned;
  fillForm(); renderItems(); recalc();
}
function orderLineText(item) {
  if (isPaper(item)) return `- ${item.name}: ${item.area.toFixed(3)} m² × ${formatVND(item.sellPrice)} = ${formatVND(item.amount)}`;
  return `- ${item.name}: ${item.qty} ${item.unit || ''} × ${formatVND(item.sellPrice)} = ${formatVND(item.amount)}`;
}
async function copyQuote() {
  const gate = ensureCanShareOrPrint(false); if (!gate.ok) return renderWarnings([gate.msg]);
  const lines = [
    `BÁO GIÁ: ${state.current.customer || '(Chưa ghi khách)'}`,
    `Ngày: ${state.current.date}`,
    ...state.current.items.map(orderLineText),
    `Tổng thanh toán: ${formatVND(state.current.totals.customerTotal)}`,
    `${state.current.address ? `Giao: ${state.current.address}` : ''}`
  ].filter(Boolean);
  await navigator.clipboard.writeText(lines.join('\n'));
}
function printQuote() {
  const gate = ensureCanShareOrPrint(true); if (!gate.ok) return renderWarnings([gate.msg]);
  const { hasPaper } = state.current.totals;
  const header = hasPaper
    ? '<tr><th>Mô tả</th><th>Q.cách</th><th>C.dài</th><th>SL</th><th>ĐVT</th><th>m²</th><th>Đơn giá</th><th>Tổng giá</th></tr>'
    : '<tr><th>Mô tả</th><th>Số lượng</th><th>Đơn giá</th><th>Tổng giá</th></tr>';
  const rows = state.current.items.map(item => hasPaper
    ? `<tr><td>${esc(item.name)}</td><td>${isPaper(item)?item.width:''}</td><td>${isPaper(item)?item.length:''}</td><td>${item.qty}</td><td>${esc(item.unit)}</td><td>${isPaper(item)?item.area.toFixed(3):''}</td><td>${formatVND(item.sellPrice)}</td><td>${formatVND(item.amount)}</td></tr>`
    : `<tr><td>${esc(item.name)}</td><td>${item.qty} ${esc(item.unit)}</td><td>${formatVND(item.sellPrice)}</td><td>${formatVND(item.amount)}</td></tr>`).join('');
  els.printArea.innerHTML = `<h3>BẢNG BÁO GIÁ</h3><div>Khách: ${esc(state.current.customer)}</div><div>Ngày: ${esc(state.current.date)} ${state.current.orderNo ? ' - Số đơn: ' + esc(state.current.orderNo) : ''}</div><table><thead>${header}</thead><tbody>${rows}</tbody></table><p>Tổng thanh toán: <strong>${formatVND(state.current.totals.customerTotal)}</strong></p>`;
  setTimeout(() => window.print(), 250);
}

function renderHistory() {
  const kw = (els.historySearch.value || '').toLowerCase();
  const list = state.history.filter(o => (`${o.customer} ${o.orderNo}`).toLowerCase().includes(kw));
  els.historyBody.innerHTML = list.map(o => `<tr>
    <td>${esc(o.date || '')}</td><td>${esc(o.customer || '')}</td><td>${formatVND(o.totals?.customerTotal || 0)}</td>
    <td class="owner-only">${formatVND(o.totals?.profit || 0)}</td>
    <td>
      <button class="btn" data-open="${o.id}">Mở</button>
      <button class="btn" data-copy="${o.id}">Copy</button>
      <button class="btn" data-print="${o.id}">In</button>
      <button class="btn" data-dup="${o.id}">Nhân bản</button>
    </td></tr>`).join('');
  ['open','copy','print','dup'].forEach(action => {
    els.historyBody.querySelectorAll(`[data-${action}]`).forEach(btn => btn.onclick = () => historyAction(action, btn.dataset[action]));
  });
  renderRole();
}
function historyAction(action, id) {
  const found = state.history.find(o => o.id === id); if (!found) return;
  if (action === 'open') { state.current = structuredClone(found); fillForm(); renderItems(); recalc(); return; }
  if (action === 'dup') {
    state.current = structuredClone(found);
    state.current.id = crypto.randomUUID(); state.current.date = today(); state.current.orderNo = ''; state.current.status = 'Nháp';
    fillForm(); renderItems(); recalc(); return;
  }
  const backup = state.current;
  state.current = structuredClone(found); fillForm(); renderItems(); recalc();
  if (action === 'copy') copyQuote();
  if (action === 'print') printQuote();
  state.current = backup; fillForm(); renderItems(); recalc();
}

function renderStats() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const inMonth = state.history.filter(o => (o.date || '').startsWith(monthKey));
  const revenue = inMonth.reduce((s,o) => s + (o.totals?.customerTotal || 0), 0);
  const profit = inMonth.reduce((s,o) => s + (o.totals?.profit || 0), 0);
  const byCustomer = {};
  inMonth.forEach(o => { const c = o.customer || '(Khách lẻ)'; byCustomer[c] = (byCustomer[c] || 0) + (o.totals?.customerTotal || 0); });
  const top5 = Object.entries(byCustomer).sort((a,b) => b[1]-a[1]).slice(0,5);
  els.statsContent.innerHTML = `
    <div>Doanh thu tháng: <strong>${formatVND(revenue)}</strong></div>
    <div>Lợi nhuận tháng: <strong>${formatVND(profit)}</strong></div>
    <div>Số đơn: <strong>${inMonth.length}</strong></div>
    <div>Top 5 khách: <strong>${top5.map(([n,v]) => `${esc(n)} (${formatVND(v)})`).join(', ') || '-'}</strong></div>`;
}

function setRole(role) {
  state.role = role;
  localStorage.setItem(ROLE_KEY, role);
  renderRole();
}
function renderRole() {
  const owner = state.role === 'owner';
  els.roleBadge.textContent = owner ? 'Chủ shop' : 'Nhân viên';
  els.ownerBtn.classList.toggle('hidden', owner);
  els.logoutOwnerBtn.classList.toggle('hidden', !owner);
  document.querySelectorAll('.owner-only').forEach(el => el.classList.toggle('hidden', !owner));
  renderStats();
}

function openPinDialog() { els.pinError.textContent = ''; els.pinInput.value = ''; els.pinDialog.showModal(); }
async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function handlePinSubmit(e) {
  e.preventDefault();
  if (e.submitter?.value === 'cancel') return els.pinDialog.close();
  const pin = els.pinInput.value.trim();
  if (!/^\d{4,6}$/.test(pin)) { els.pinError.textContent = 'PIN phải 4-6 số.'; return; }
  const hash = await sha256(pin);
  const savedHash = localStorage.getItem(PIN_HASH_KEY);
  if (!savedHash) localStorage.setItem(PIN_HASH_KEY, hash);
  else if (savedHash !== hash) { els.pinError.textContent = 'PIN không đúng.'; return; }
  els.pinDialog.close();
  setRole('owner');
}
function checkIdleTimeout() {
  if (state.role === 'owner' && Date.now() - state.lastActivity > IDLE_LIMIT_MS) setRole('staff');
}

function exportHistory() {
  const blob = new Blob([JSON.stringify(state.history, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `bao-gia-export-${today()}.json`; a.click();
  URL.revokeObjectURL(a.href);
}
function clearHistory() {
  if (state.role !== 'owner') return;
  state.history = []; saveHistory(); renderHistory(); renderStats();
}
function esc(v){ return String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
