const { jsonResponse, supabaseFetch } = require('./_supabase');
const { verifyAdminRequest } = require('./_auth');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  if (event.httpMethod !== 'POST') return jsonResponse(405, { ok: false, error: 'Method not allowed' });

  const auth = verifyAdminRequest(event);
  if (!auth.ok) return jsonResponse(401, { ok: false, error: auth.error });

  try {
    const body = JSON.parse(event.body || '{}');
    const match = String(body.match || '').trim();
    const score = String(body.score || '').trim();
    const multiplier = Number(body.playoffMultiplier || 1);
    const advancingTeam = String(body.advancingTeam || '').trim();

    if (!match) return jsonResponse(400, { ok: false, error: 'Не обрано матч' });
    if (!/^\d+\s*-\s*\d+$/.test(score)) {
      return jsonResponse(400, { ok: false, error: 'Рахунок має бути у форматі 0-0, 2-1, 4-3' });
    }

    const [home, away] = score.replace(/\s+/g, '').split('-').map(Number);

    const result = await supabaseFetch('/rest/v1/rpc/update_match_result', {
      method: 'POST',
      body: JSON.stringify({
        p_match: match,
        p_home_score: home,
        p_away_score: away,
        p_playoff_multiplier: Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1,
        p_advancing_team: advancingTeam || null
      })
    });

    return jsonResponse(result && result.ok === false ? 400 : 200, result);
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || String(error) });
  }
};
