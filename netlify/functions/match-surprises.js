const { jsonResponse, supabaseFetch } = require('./_supabase');

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const data = await supabaseFetch('/rest/v1/rpc/match_surprises_list', {
      method: 'POST',
      body: JSON.stringify({})
    });

    return jsonResponse(200, {
      ok: true,
      data: (data || []).map(row => ({
        rank: Number(row.rank || 0),
        match: row.match_name,
        teamHome: row.team_home,
        teamAway: row.team_away,
        startsAt: row.starts_at,
        stageLabel: row.stage_label,
        score: row.score,
        homeScore: row.home_score === null ? null : Number(row.home_score),
        awayScore: row.away_score === null ? null : Number(row.away_score),
        actualResult: row.actual_result,
        playoffMultiplier: Number(row.playoff_multiplier || 1),
        predictionCount: Number(row.prediction_count || 0),
        avgPredictedScore: row.avg_predicted_score,
        avgPredictedHomeScore: row.avg_predicted_home_score === null ? null : Number(row.avg_predicted_home_score),
        avgPredictedAwayScore: row.avg_predicted_away_score === null ? null : Number(row.avg_predicted_away_score),
        pctP1: row.pct_p1 === null ? null : Number(row.pct_p1),
        pctDraw: row.pct_draw === null ? null : Number(row.pct_draw),
        pctP2: row.pct_p2 === null ? null : Number(row.pct_p2),
        unexpectedness: row.unexpectedness === null ? null : Number(row.unexpectedness)
      }))
    });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || String(error) });
  }
};
