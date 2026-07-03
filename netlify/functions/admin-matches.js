const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function splitTeams(matchName) {
  const parts = String(matchName || '').split(' - ');
  return {
    homeTeam: (parts[0] || '').trim() || null,
    awayTeam: (parts[1] || '').trim() || null,
  };
}

function mapMatch(row) {
  const fallbackTeams = splitTeams(row.match_name);

  return {
    match: row.match_name,
    startsAt: row.starts_at,
    homeScore: row.home_score ?? null,
    awayScore: row.away_score ?? null,
    result: row.actual_result ?? null,
    windowGroup: row.window_group ?? null,
    isPlayoff: Boolean(row.is_playoff),
    matchNo: row.match_no ?? null,
    homeTeam: row.home_team || fallbackTeams.homeTeam,
    awayTeam: row.away_team || fallbackTeams.awayTeam,
    advancingTeam: row.advancing_team ?? null,
    playoffMultiplier: Number(row.playoff_multiplier ?? 1),
  };
}

async function callAdminMatchesWindow(params) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_matches_window`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch (_) {
    payload = text;
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error || text || 'Supabase request failed';
    throw new Error(message);
  }

  return Array.isArray(payload) ? payload : [];
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { ok: false, error: 'Missing Supabase environment variables' });
  }

  try {
    let rows;

    try {
      rows = await callAdminMatchesWindow({
        p_past_count: 5,
        p_future_count: 10,
      });
    } catch (firstError) {
      rows = await callAdminMatchesWindow({
        p_past_limit: 5,
        p_future_limit: 10,
      });
    }

    return json(200, {
      ok: true,
      data: rows.map(mapMatch),
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message || 'Помилка запиту',
    });
  }
};
