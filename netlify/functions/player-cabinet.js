const { jsonResponse, supabaseFetch } = require('./_supabase');
const { verifyPlayerRequest } = require('./_playerAuth');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  const auth = verifyPlayerRequest(event);
  if (!auth.ok) return jsonResponse(401, { ok: false, error: auth.error });

  try {
    const player = auth.payload.player;

    const data = await supabaseFetch('/rest/v1/rpc/player_cabinet', {
      method: 'POST',
      body: JSON.stringify({ p_player: player })
    });

    return jsonResponse(200, {
      ok: true,
      player,
      data: (data || []).map(row => ({
        match: row.match_name,
        startsAt: row.starts_at,
        score: row.predicted_score,
        submittedAt: row.submitted_at,
        hasPrediction: Boolean(row.has_prediction),
        editable: Boolean(row.editable),
        lockReason: row.lock_reason || null
      }))
    });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || String(error) });
  }
};
