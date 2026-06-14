const { jsonResponse, supabaseFetch } = require('./_supabase');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');

    const player = String(body.player || '').trim();
    const match = String(body.match || '').trim();
    const score = String(body.score || '').trim();

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
