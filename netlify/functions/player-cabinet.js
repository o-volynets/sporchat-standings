const { jsonResponse, supabaseFetch } = require('./_supabase');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const player = String((event.queryStringParameters || {}).player || '').trim();

    if (!player) {
      return jsonResponse(400, { ok: false, error: 'Не вказано гравця' });
    }

    const data = await supabaseFetch('/rest/v1/rpc/player_cabinet', {
      method: 'POST',
      body: JSON.stringify({ p_player: player })
    });

    return jsonResponse(200, {
      ok: true,
      data: (data || []).map(row => ({
        match: row.match_name,
        startsAt: row.starts_at,
        score: row.predicted_score,
        submittedAt: row.submitted_at,
        hasPrediction: Boolean(row.has_prediction),
        editable: Boolean(row.editable)
      }))
    });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || String(error) });
  }
};
