import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
const WHATSAPP_STORE_NUMBER = process.env.WHATSAPP_STORE_NUMBER || '5543984244532';
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || '';
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const FILES = {
  products: path.join(DATA_DIR, 'products.json'),
  users: path.join(DATA_DIR, 'users.json'),
  orders: path.join(DATA_DIR, 'orders.json'),
  sessions: path.join(DATA_DIR, 'sessions.json')
};
const ADMIN_ORDER_STATUSES = ['aguardando_processamento', 'em_producao', 'enviado', 'entregue', 'cancelado'];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
function writeJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function products() { return readJson(FILES.products); }
function users() { return readJson(FILES.users); }
function orders() { return readJson(FILES.orders); }
function sessions() { return readJson(FILES.sessions); }
function saveUsers(data) { writeJson(FILES.users, data); }
function saveOrders(data) { writeJson(FILES.orders, data); }
function saveSessions(data) { writeJson(FILES.sessions, data); }

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('base64');
  return `scrypt$${salt}$${derived}`;
}
function verifyPassword(password, stored) {
  const [algo, salt, hash] = String(stored || '').split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('base64');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(derived));
}
function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    lastAdminSeenAt: user.lastAdminSeenAt || null
  };
}
function createSession(userId) {
  const token = uuidv4();
  const all = sessions();
  all.push({ token, userId, createdAt: new Date().toISOString() });
  saveSessions(all);
  return token;
}
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  const session = sessions().find(item => item.token === token);
  if (!session) return res.status(401).json({ error: 'Sessão inválida.' });
  const user = users().find(item => item.id === session.userId);
  if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });
  req.user = user;
  req.token = token;
  next();
}
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
  next();
}
function ensureAdminTrackingFields() {
  const allUsers = users();
  let changedUsers = false;
  for (const user of allUsers) {
    if (user.role === 'admin' && !('lastAdminSeenAt' in user)) {
      user.lastAdminSeenAt = null;
      changedUsers = true;
    }
  }
  if (changedUsers) saveUsers(allUsers);

  const allOrders = orders();
  let changedOrders = false;
  for (const order of allOrders) {
    const normalized = normalizeAdminOrder(order);
    if (JSON.stringify(normalized) !== JSON.stringify(order)) {
      Object.assign(order, normalized);
      changedOrders = true;
    }
  }
  if (changedOrders) saveOrders(allOrders);
}
function normalizeOrderStatus(status, fallback = 'aguardando_processamento') {
  const clean = String(status || '').trim();
  return ADMIN_ORDER_STATUSES.includes(clean) ? clean : fallback;
}
function normalizeAdminOrder(order) {
  const normalizedStatus = normalizeOrderStatus(
    order.orderStatus === 'pago' ? 'aguardando_processamento' : order.orderStatus,
    normalizeOrderStatus(order.shippingStatus, 'aguardando_processamento')
  );
  return {
    ...order,
    orderStatus: normalizedStatus,
    shippingStatus: normalizedStatus,
    adminPopupSeenAt: order.adminPopupSeenAt || null,
    lastStatusChangeAt: order.lastStatusChangeAt || order.updatedAt || order.createdAt || new Date().toISOString()
  };
}
function cepToRegion(cepRaw) {
  const cep = String(cepRaw || '').replace(/\D/g, '');
  if (cep.length !== 8) throw new Error('Informe um CEP válido com 8 dígitos.');
  const prefix2 = Number(cep.slice(0, 2));
  const prefix1 = Number(cep[0]);
  let region = 'sudeste';
  let state = 'SP';
  if (prefix2 >= 80 && prefix2 <= 87) { region = 'sul'; state = 'PR'; }
  else if ((prefix2 >= 88 && prefix2 <= 89) || (prefix2 >= 90 && prefix2 <= 99)) { region = 'sul'; state = prefix2 <= 89 ? 'SC' : 'RS'; }
  else if ((prefix2 >= 10 && prefix2 <= 19) || (prefix2 >= 20 && prefix2 <= 28)) { region = 'sudeste'; state = prefix2 <= 19 ? 'SP' : 'RJ'; }
  else if (prefix2 >= 30 && prefix2 <= 39) { region = 'sudeste'; state = 'MG'; }
  else if (prefix2 >= 29 && prefix2 <= 29) { region = 'sudeste'; state = 'ES'; }
  else if (prefix2 >= 70 && prefix2 <= 79) { region = 'centro-oeste'; state = prefix2 <= 72 ? 'DF' : 'GO'; }
  else if (prefix2 >= 60 && prefix2 <= 69) { region = 'norte'; state = 'AM'; }
  else if (prefix1 === 4 || prefix1 === 5) { region = 'nordeste'; state = 'BA'; }
  else if (prefix1 === 1 && prefix2 >= 68) { region = 'norte'; state = 'PA'; }
  else if (prefix1 === 0) { region = 'sudeste'; state = 'SP'; }
  return { cep, region, state };
}
function shippingQuote(cep, items) {
  const productMap = new Map(products().map(item => [item.id, item]));
  const totalWeight = items.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    return sum + ((product?.weightKg || 0.3) * Number(item.quantity || 1));
  }, 0);

  const subtotal = items.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    return sum + ((product?.price || 0) * Number(item.quantity || 1));
  }, 0);

  const pickupOption = {
    id: 'pickup',
    label: 'Retirar na loja',
    price: 0,
    days: 1,
    regionLabel: 'Retirada em Londrina/PR'
  };

  if (!cep || !String(cep).replace(/\D/g, '')) {
    return { origin: 'Londrina/PR', region: 'pickup', state: 'PR', options: [pickupOption] };
  }

  const { region, state } = cepToRegion(cep);
  const regionBase = {
    sul: { pac: 17.9, sedex: 28.9, pacDays: 4, sedexDays: 2 },
    sudeste: { pac: 22.9, sedex: 34.9, pacDays: 6, sedexDays: 3 },
    'centro-oeste': { pac: 24.9, sedex: 39.9, pacDays: 6, sedexDays: 3 },
    nordeste: { pac: 29.9, sedex: 46.9, pacDays: 8, sedexDays: 4 },
    norte: { pac: 34.9, sedex: 54.9, pacDays: 10, sedexDays: 5 }
  }[region];

  const weightFactor = Math.max(0, totalWeight - 0.5) * 9.5;
  const insuranceFactor = subtotal > 150 ? 4.5 : 0;

  return {
    origin: 'Londrina/PR',
    region,
    state,
    options: [
      pickupOption,
      {
        id: 'pac',
        label: 'Entrega econômica (base Correios)',
        price: Number((regionBase.pac + weightFactor + insuranceFactor).toFixed(2)),
        days: regionBase.pacDays,
        regionLabel: `${state} • saída de Londrina/PR`
      },
      {
        id: 'sedex',
        label: 'Entrega rápida (base Correios)',
        price: Number((regionBase.sedex + weightFactor + insuranceFactor).toFixed(2)),
        days: regionBase.sedexDays,
        regionLabel: `${state} • saída de Londrina/PR`
      }
    ]
  };
}
function recalcOrder(order) {
  const subtotal = order.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const shippingPrice = order.shipping?.price || 0;
  order.subtotal = Number(subtotal.toFixed(2));
  order.total = Number((subtotal + shippingPrice).toFixed(2));
  return order;
}
function whatsappOrderUrl(order) {
  if (!WHATSAPP_STORE_NUMBER) return null;
  const number = String(WHATSAPP_STORE_NUMBER).replace(/\D/g, '');
  const items = order.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
  const message = [
    `Olá! Acabei de concluir uma compra na Artize 🎉`,
    `Pedido: ${order.id.slice(0, 8)}`,
    `Cliente: ${order.customer.name}`,
    `Itens: ${items}`,
    `Entrega: ${order.shipping?.label || '-'}`,
    `Total: R$ ${order.total.toFixed(2).replace('.', ',')}`,
    '',
    'Pode me confirmar se ficou tudo certo com o pedido?'
  ].join('\n');
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
async function mpGetJson(url) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) throw new Error(`Mercado Pago respondeu ${response.status}`);
  return response.json();
}
async function fetchPaymentById(paymentId) {
  if (!paymentId || !MP_ACCESS_TOKEN) return null;
  return mpGetJson(`https://api.mercadopago.com/v1/payments/${paymentId}`);
}
async function searchPaymentsByExternalReference(externalReference) {
  if (!externalReference || !MP_ACCESS_TOKEN) return [];
  const query = new URLSearchParams({ external_reference: externalReference, sort: 'date_created', criteria: 'desc' });
  const data = await mpGetJson(`https://api.mercadopago.com/v1/payments/search?${query.toString()}`);
  return Array.isArray(data?.results) ? data.results : [];
}
function applyPaymentToOrder(order, payment) {
  if (!payment) return order;
  const status = payment.status || payment.status_detail || order.paymentStatus || 'pending';
  order.paymentStatus = status;
  order.paymentId = String(payment.id || order.paymentId || '');
  if (status === 'approved') {
    if (!ADMIN_ORDER_STATUSES.includes(order.orderStatus)) order.orderStatus = 'aguardando_processamento';
    if (!ADMIN_ORDER_STATUSES.includes(order.shippingStatus)) order.shippingStatus = 'aguardando_processamento';
  } else if (status === 'rejected' || status === 'cancelled' || status === 'cancelado') {
    order.orderStatus = 'cancelado';
    order.shippingStatus = 'cancelado';
  }
  order.updatedAt = new Date().toISOString();
  return normalizeAdminOrder(order);
}
async function syncOrderPayment(order, explicitPaymentId = null) {
  let payment = null;
  if (explicitPaymentId) {
    try { payment = await fetchPaymentById(explicitPaymentId); } catch {}
  }
  if (!payment) {
    try {
      const found = await searchPaymentsByExternalReference(order.id);
      payment = found[0] || null;
    } catch {}
  }
  if (payment) applyPaymentToOrder(order, payment);
  return normalizeAdminOrder(order);
}
function getUnseenSalesForAdmin(adminUser) {
  const lastSeenAt = adminUser?.lastAdminSeenAt ? new Date(adminUser.lastAdminSeenAt).getTime() : 0;
  return orders()
    .filter(order => (order.paymentStatus === 'approved' || order.paymentStatus === 'accredited' || order.orderStatus !== 'aguardando_pagamento'))
    .filter(order => new Date(order.createdAt || 0).getTime() > lastSeenAt)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

ensureAdminTrackingFields();

app.get('/api/health', (req, res) => res.json({ ok: true, envConfigured: Boolean(MP_ACCESS_TOKEN) }));
app.get('/api/products', (req, res) => res.json(products()));
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
  const allUsers = users();
  if (allUsers.some(user => user.email.toLowerCase() === String(email).toLowerCase())) return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
  const user = {
    id: uuidv4(),
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    passwordHash: hashPassword(String(password)),
    role: 'customer',
    createdAt: new Date().toISOString()
  };
  allUsers.push(user);
  saveUsers(allUsers);
  const token = createSession(user.id);
  res.status(201).json({ token, user: safeUser(user) });
});
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = users().find(item => item.email.toLowerCase() === String(email).trim().toLowerCase());
  if (!user || !verifyPassword(String(password), user.passwordHash)) return res.status(401).json({ error: 'Credenciais inválidas.' });
  const token = createSession(user.id);
  res.json({ token, user: safeUser(user) });
});
app.get('/api/auth/me', auth, (req, res) => res.json({ user: safeUser(req.user) }));
app.post('/api/shipping/quote', (req, res) => {
  try {
    const { cep, items } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Carrinho vazio.' });
    res.json(shippingQuote(cep, items));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
app.post('/api/checkout/create-preference', auth, async (req, res) => {
  try {
    const { items, shipping, cep } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Carrinho vazio.' });
    if (!shipping?.label || typeof shipping?.price !== 'number') return res.status(400).json({ error: 'Frete inválido.' });
    if (!MP_ACCESS_TOKEN) return res.status(500).json({ error: 'Configure o MP_ACCESS_TOKEN antes de criar pagamentos.' });
    const productMap = new Map(products().map(item => [item.id, item]));
    const orderItems = items.map(item => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Produto não encontrado: ${item.productId}`);
      return {
        productId: product.id,
        name: product.name,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(product.price),
        image: product.image
      };
    });
    const order = normalizeAdminOrder(recalcOrder({
      id: uuidv4(),
      customer: { id: req.user.id, name: req.user.name, email: req.user.email },
      items: orderItems,
      shipping: { id: shipping.id, label: shipping.label, price: Number(shipping.price), days: shipping.days, cep: String(cep || ''), origin: 'Londrina/PR' },
      paymentStatus: 'pending',
      orderStatus: 'aguardando_pagamento',
      shippingStatus: 'aguardando_processamento',
      paymentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    const allOrders = orders();
    allOrders.unshift(order);
    saveOrders(allOrders);

    const mpItems = order.items.map(item => ({ id: item.productId, title: item.name, quantity: item.quantity, currency_id: 'BRL', unit_price: item.unitPrice }));
    mpItems.push({ id: `shipping-${order.shipping.id}`, title: order.shipping.label, quantity: 1, currency_id: 'BRL', unit_price: order.shipping.price });

    const client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    const preference = new Preference(client);
    const body = {
      items: mpItems,
      payer: { name: req.user.name, email: req.user.email },
      back_urls: {
        success: `${BASE_URL}/pages/resultado.html?order_id=${order.id}`,
        failure: `${BASE_URL}/pages/resultado.html?order_id=${order.id}`,
        pending: `${BASE_URL}/pages/resultado.html?order_id=${order.id}`
      },
      auto_return: 'approved',
      external_reference: order.id,
      notification_url: BASE_URL.startsWith('http://localhost') ? undefined : `${BASE_URL}/api/payments/webhook`
    };
    const response = await preference.create({ body });
    res.json({ orderId: order.id, initPoint: response.init_point, sandboxInitPoint: response.sandbox_init_point });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Não foi possível gerar o checkout.' });
  }
});
app.post('/api/orders/:id/return-update', async (req, res) => {
  const all = orders();
  const order = all.find(item => item.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
  const { paymentStatus, paymentId } = req.body || {};
  if (paymentStatus) order.paymentStatus = paymentStatus;
  if (paymentId) order.paymentId = String(paymentId);
  if (paymentStatus === 'approved' || paymentStatus === 'accredited') {
    order.orderStatus = normalizeOrderStatus(order.orderStatus, 'aguardando_processamento');
    order.shippingStatus = normalizeOrderStatus(order.shippingStatus, 'aguardando_processamento');
  }
  await syncOrderPayment(order, paymentId);
  saveOrders(all);
  res.json({ ok: true, order, whatsappUrl: order.paymentStatus === 'approved' ? whatsappOrderUrl(order) : null });
});
app.get('/api/orders/public/:id', async (req, res) => {
  const all = orders();
  const order = all.find(item => item.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
  await syncOrderPayment(order);
  saveOrders(all);
  res.json({ ...order, whatsappUrl: order.paymentStatus === 'approved' ? whatsappOrderUrl(order) : null });
});
app.get('/api/orders/my', auth, async (req, res) => {
  const all = orders();
  const mine = all.filter(item => item.customer.id === req.user.id);
  for (const order of mine.filter(item => item.paymentStatus !== 'approved')) {
    await syncOrderPayment(order);
  }
  saveOrders(all);
  res.json(mine.map(order => ({ ...normalizeAdminOrder(order), whatsappUrl: order.paymentStatus === 'approved' ? whatsappOrderUrl(order) : null })));
});
app.post('/api/orders/:id/sync-payment', async (req, res) => {
  const all = orders();
  const order = all.find(item => item.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
  const paymentId = req.body?.paymentId || req.query?.paymentId || null;
  await syncOrderPayment(order, paymentId);
  saveOrders(all);
  res.json({ order, whatsappUrl: order.paymentStatus === 'approved' ? whatsappOrderUrl(order) : null });
});
app.get('/api/admin/orders', auth, adminOnly, async (req, res) => {
  const selectedStatus = String(req.query.status || 'todos');
  const all = orders();
  for (const order of all.filter(item => item.paymentStatus !== 'approved')) {
    await syncOrderPayment(order);
  }
  saveOrders(all);
  const normalized = all.map(order => ({ ...normalizeAdminOrder(order), whatsappUrl: order.paymentStatus === 'approved' ? whatsappOrderUrl(order) : null }));
  const filtered = selectedStatus === 'todos' ? normalized : normalized.filter(order => order.orderStatus === selectedStatus);
  res.json({ statuses: ADMIN_ORDER_STATUSES, orders: filtered, totalOrders: normalized.length });
});
app.patch('/api/admin/orders/:id/status', auth, adminOnly, (req, res) => {
  const requestedStatus = normalizeOrderStatus(req.body?.orderStatus || req.body?.shippingStatus, null);
  if (!requestedStatus) return res.status(400).json({ error: 'Status inválido.' });
  const all = orders();
  const order = all.find(item => item.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
  order.orderStatus = requestedStatus;
  order.shippingStatus = requestedStatus;
  if (requestedStatus === 'cancelado') order.paymentStatus = order.paymentStatus === 'approved' ? 'approved' : (order.paymentStatus || 'cancelled');
  order.lastStatusChangeAt = new Date().toISOString();
  order.updatedAt = new Date().toISOString();
  saveOrders(all);
  res.json(normalizeAdminOrder(order));
});
app.get('/api/admin/notifications/new-sales', auth, adminOnly, (req, res) => {
  const unseen = getUnseenSalesForAdmin(req.user).map(order => ({
    id: order.id,
    customerName: order.customer?.name || 'Cliente',
    total: order.total || 0,
    createdAt: order.createdAt,
    orderStatus: normalizeOrderStatus(order.orderStatus, 'aguardando_processamento')
  }));
  res.json({
    hasNewSales: unseen.length > 0,
    count: unseen.length,
    orders: unseen.slice(0, 5),
    lastAdminSeenAt: req.user.lastAdminSeenAt || null
  });
});
app.post('/api/admin/notifications/new-sales/ack', auth, adminOnly, (req, res) => {
  const allUsers = users();
  const admin = allUsers.find(item => item.id === req.user.id);
  if (!admin) return res.status(404).json({ error: 'Administrador não encontrado.' });
  admin.lastAdminSeenAt = new Date().toISOString();
  saveUsers(allUsers);
  res.json({ ok: true, lastAdminSeenAt: admin.lastAdminSeenAt });
});
app.post('/api/payments/webhook', express.json({ type: '*/*' }), async (req, res) => {
  try {
    const paymentId = req.body?.data?.id || req.query?.id || req.query?.['data.id'] || null;
    if (paymentId) {
      const payment = await fetchPaymentById(paymentId).catch(() => null);
      const externalReference = payment?.external_reference;
      if (externalReference) {
        const all = orders();
        const order = all.find(item => item.id === externalReference);
        if (order) {
          applyPaymentToOrder(order, payment);
          saveOrders(all);
        }
      }
    }
    res.status(200).send('ok');
  } catch {
    res.status(200).send('ok');
  }
});
app.get('*', (req, res) => {
  if (req.path === '/' || req.path === '') return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Artize rodando em ${BASE_URL}`));
