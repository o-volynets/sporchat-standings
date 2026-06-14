const crypto = require('crypto');
const { jsonResponse } = require('./_supabase');
const { createAdminToken } = require('./_auth');

function safeCompare(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  if (event.httpMethod !== 'POST') return jsonResponse(405, { ok: false, error: 'Method not allowed' });

  try {
    const body = JSON.parse(event.body || '{}');
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    const expectedUsername = process.env.ADMIN_USERNAME || '';
    const expectedPassword = process.env.ADMIN_PASSWORD || '';

    if (!expectedUsername || !expectedPassword) {
      return jsonResponse(500, { ok: false, error: 'Admin credentials are not configured in Netlify environment variables' });
    }

    if (!safeCompare(username, expectedUsername) || !safeCompare(password, expectedPassword)) {
      return jsonResponse(401, { ok: false, error: 'Невірний логін або пароль' });
    }

    return jsonResponse(200, { ok: true, token: createAdminToken(username) });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || String(error) });
  }
};
