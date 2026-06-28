const { jsonResponse, supabaseFetch } = require('./_supabase');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const params = new URLSearchParams(event.rawQuery || event.queryStringParameters || {});
    const limitRaw = params.get ? params.get('limit') : (event.queryStringParameters && event.queryStringParameters.limit);
    // For playoffs the database function ignores the limit and returns the whole current stage.
    // For non-playoff / fallback mode it still uses the limit.
    const limit = Math.max(1, Math.min(Number(limitRaw || 10) || 10, 50));

    const data = await supabaseFetch('/rest/v1/rpc/available_matches_for_prediction', {
      method: 'POST',
      body: JSON.stringify({ p_limit: limit })
    });

    return jsonResponse(200, {
      ok: true,
      data: (data || []).map(row => ({
        match: row.match_name,
        startsAt: row.starts_at
      }))
    });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || String(error) });
  }
};
