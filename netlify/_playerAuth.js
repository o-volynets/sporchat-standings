const crypto = require('crypto');

function getSecret() {
  return process.env.PLAYER_TOKEN_SECRET || process.env.ADMIN_TOKEN_SECRET;
}

function base64Url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function sign(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createPlayerToken(player, username) {
  const secret = getSecret();
  if (!secret) throw new Error('Missing PLAYER_TOKEN_SECRET');

  const payload = {
    role: 'player',
    player,
    username,
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  };

  const body = base64Url(JSON.stringify(payload));
  const signature = sign(body, secret);

  return `${body}.${signature}`;
}

function verifyPlayerToken(token) {
  const secret = getSecret();
  if (!secret) return { ok: false, error: 'Missing PLAYER_TOKEN_SECRET' };
  if (!token || !token.includes('.')) return { ok: false, error: 'Missing player token' };

  const [body, signature] = token.split('.');
  const expected = sign(body, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: 'Invalid player token' };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch (error) {
    return { ok: false, error: 'Invalid token payload' };
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: 'Player session expired' };
  }

  if (payload.role !== 'player' || !payload.player) {
    return { ok: false, error: 'Invalid player role' };
  }

  return { ok: true, payload };
}

function verifyPlayerRequest(event) {
  const header = event.headers.authorization || event.headers.Authorization || '';
  if (!header.startsWith('Bearer ')) return { ok: false, error: 'Missing Authorization header' };
  return verifyPlayerToken(header.slice('Bearer '.length).trim());
}

module.exports = {
  createPlayerToken,
  verifyPlayerToken,
  verifyPlayerRequest
};
