const { jsonResponse, supabaseFetch } = require('./_supabase');
const { verifyPlayerToken } = require('./_playerAuth');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');

    let player = String(body.player || '').trim();
    const match = String(body.match || '').trim();
    const score = String(body.score || '').trim();

    const header = event.headers.authorization || event.headers.Authorization || '';
    if (header.startsWith('Bearer ')) {
      const auth = verifyPlayerToken(header.slice('Bearer '.length).trim());
      if (!auth.ok) return jsonResponse(401, { ok: false, error: auth.error });
      player = auth.payload.player;
    }

    if (!player || !match || !score) {
      return jsonResponse(400, { ok: false, error: 'Не заповнені всі поля' });
    }

    const result = await supabaseFetch('/rest/v1/rpc/submit_prediction', {
      method: 'POST',
      body: JSON.stringify({
        p_player: player,
        p_match: match,
        p_score: score
      })
    });

    return jsonResponse(result && result.ok === false ? 400 : 200, result);
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || String(error) });
  }
};
