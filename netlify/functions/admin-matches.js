const { jsonResponse, supabaseFetch } = require('./_supabase');
const { verifyAdminRequest } = require('./_auth');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  if (event.httpMethod !== 'GET') return jsonResponse(405, { ok: false, error: 'Method not allowed' });

  const auth = verifyAdminRequest(event);
  if (!auth.ok) return jsonResponse(401, { ok: false, error: auth.error });

  try {
    const data = await supabaseFetch('/rest/v1/matches?select=match_name,starts_at,home_score,away_score,actual_result&order=starts_at.asc.nullslast,match_name.asc');

    return jsonResponse(200, {
      ok: true,
      data: data.map(row => ({
        match: row.match_name,
        startsAt: row.starts_at,
        homeScore: row.home_score,
        awayScore: row.away_score,
        result: row.actual_result
      }))
    });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || String(error) });
  }
};
