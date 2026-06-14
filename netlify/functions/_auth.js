const crypto = require('crypto');

function base64Url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signPayload(payloadJson, secret) {
  return crypto.createHmac('sha256', secret).update(payloadJson).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createAdminToken(username) {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (!secret) throw new Error('Missing ADMIN_TOKEN_SECRET');

  const payload = { sub: username, role: 'admin', exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60 };
  const body = base64Url(JSON.stringify(payload));
  const signature = signPayload(body, secret);
  return `${body}.${signature}`;
}

function verifyAdminToken(token) {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  if (!secret) return { ok: false, error: 'Missing ADMIN_TOKEN_SECRET' };
  if (!token || !token.includes('.')) return { ok: false, error: 'Missing admin token' };

  const [body, signature] = token.split('.');
  const expected = signPayload(body, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, error: 'Invalid admin token' };

  let payload;
  try { payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); }
  catch (error) { return { ok: false, error: 'Invalid token payload' }; }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, error: 'Admin session expired' };
  if (payload.role !== 'admin') return { ok: false, error: 'Invalid role' };
  return { ok: true, payload };
}

function verifyAdminRequest(event) {
  const header = event.headers.authorization || event.headers.Authorization || '';
  if (!header.startsWith('Bearer ')) return { ok: false, error: 'Missing Authorization header' };
  return verifyAdminToken(header.slice('Bearer '.length).trim());
}
module.exports = { createAdminToken, verifyAdminRequest };
