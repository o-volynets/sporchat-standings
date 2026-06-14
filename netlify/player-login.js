const { jsonResponse, supabaseFetch } = require('./_supabase');
const { createPlayerToken } = require('./_playerAuth');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!username || !password) {
      return jsonResponse(400, { ok: false, error: 'Введи логін і пароль' });
    }

    const rows = await supabaseFetch('/rest/v1/rpc/player_authenticate', {
      method: 'POST',
      body: JSON.stringify({
        p_username: username,
        p_password: password
      })
    });

    if (!Array.isArray(rows) || rows.length === 0) {
      return jsonResponse(401, { ok: false, error: 'Невірний логін або пароль' });
    }

    const user = rows[0];

    return jsonResponse(200, {
      ok: true,
      player: user.player,
      username: user.username,
      token: createPlayerToken(user.player, user.username)
    });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || String(error) });
  }
};
