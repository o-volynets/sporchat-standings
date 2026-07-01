const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  };
}

async function supabaseGet(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }

  return data;
}

exports.handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  try {
    const nowIso = new Date().toISOString();

    // 1) Беремо майбутні матчі напряму з таблиці matches.
    // Не використовуємо складний PostgREST not-in фільтр, бо саме він часто дає порожній результат.
    const matches = await supabaseGet(
      `/rest/v1/matches?select=id,match_name,starts_at,home_score,away_score&starts_at=gt.${encodeURIComponent(nowIso)}&order=starts_at.asc&limit=100`
    );

    // 2) Окремо беремо матчі, по яких уже опубліковано всі прогнози в Telegram.
    const notifications = await supabaseGet(
      `/rest/v1/telegram_notifications?select=match_id&notification_type=eq.predictions_30m&status=eq.sent`
    );

    const publishedMatchIds = new Set((notifications || []).map((n) => n.match_id));

    // 3) Фільтруємо в JS: показуємо тільки матчі, де прогнози ще НЕ опубліковані.
    const availableMatches = (matches || [])
      .filter((match) => !publishedMatchIds.has(match.id))
      .map((match) => ({
        // Даємо кілька назв полів для сумісності зі старим фронтом.
        id: match.id,
        match_id: match.id,
        match_name: match.match_name,
        name: match.match_name,
        starts_at: match.starts_at,
        home_score: match.home_score,
        away_score: match.away_score,
      }));

    return json(200, {
      ok: true,
      now: nowIso,
      count: availableMatches.length,
      matches: availableMatches,
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message || String(error),
    });
  }
};
