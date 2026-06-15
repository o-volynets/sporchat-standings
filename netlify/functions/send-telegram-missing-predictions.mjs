export const config = {
  schedule: '*/5 * * * *'
};

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}

async function supabaseFetch(path, options = {}) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error(`Supabase returned non-JSON: ${text.slice(0, 200)}`);
    }
  }

  if (!response.ok) {
    throw new Error(data && data.message ? data.message : `Supabase HTTP ${response.status}`);
  }

  return data;
}

function formatKyivTime(value) {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function buildMessage(match, missingPlayers) {
  const withUsernames = missingPlayers.filter(p => p.telegram_username);
  const withoutUsernames = missingPlayers.filter(p => !p.telegram_username);

  const mentions = withUsernames.map(p => p.telegram_username).join(' ');
  const lines = [];

  if (mentions) lines.push(mentions);
  lines.push(`⏰ За годину почнеться матч: ${match.match_name}`);
  lines.push(`Початок: ${formatKyivTime(match.starts_at)}`);
  lines.push('');
  lines.push(withUsernames.length === 1 ? 'Зроби прогноз.' : 'Зробіть прогноз.');

  if (withoutUsernames.length > 0) {
    lines.push('');
    lines.push('Без Telegram username: ' + withoutUsernames.map(p => p.player).join(', '));
  }

  return lines.join('\n');
}

async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
  });

  const data = await response.json();
  if (!response.ok || data.ok !== true) {
    throw new Error(data && data.description ? data.description : `Telegram HTTP ${response.status}`);
  }
  return data;
}

async function processDueMatches({ dryRun = false } = {}) {
  const dueMatches = await supabaseFetch('/rest/v1/rpc/telegram_due_missing_prediction_matches', {
    method: 'POST',
    body: JSON.stringify({
      p_window_start_minutes: 55,
      p_window_end_minutes: 65
    })
  });

  const results = [];

  for (const match of dueMatches || []) {
    const missingPlayers = await supabaseFetch('/rest/v1/rpc/telegram_missing_predictions_for_match', {
      method: 'POST',
      body: JSON.stringify({ p_match_id: match.match_id })
    });

    if (!missingPlayers || missingPlayers.length === 0) {
      results.push({ match: match.match_name, skipped: true, reason: 'no_missing_predictions' });
      continue;
    }

    const claimed = await supabaseFetch('/rest/v1/rpc/telegram_claim_missing_prediction_reminder', {
      method: 'POST',
      body: JSON.stringify({
        p_match_id: match.match_id,
        p_notification_type: 'missing_predictions_1h'
      })
    });

    if (claimed !== true) {
      results.push({ match: match.match_name, skipped: true, reason: 'already claimed or sent' });
      continue;
    }

    try {
      const message = buildMessage(match, missingPlayers);

      if (!dryRun) {
        await sendTelegramMessage(message);
        await supabaseFetch('/rest/v1/rpc/telegram_mark_missing_prediction_reminder_sent', {
          method: 'POST',
          body: JSON.stringify({
            p_match_id: match.match_id,
            p_notification_type: 'missing_predictions_1h'
          })
        });
      }

      results.push({ match: match.match_name, sent: !dryRun, dryRun, missingCount: missingPlayers.length, message });
    } catch (error) {
      await supabaseFetch('/rest/v1/rpc/telegram_mark_missing_prediction_reminder_failed', {
        method: 'POST',
        body: JSON.stringify({
          p_match_id: match.match_id,
          p_error: error.message || String(error),
          p_notification_type: 'missing_predictions_1h'
        })
      });
      results.push({ match: match.match_name, sent: false, error: error.message || String(error) });
    }
  }

  return results;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return jsonResponse(204, {});

  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dryRun') === '1' || url.searchParams.get('dryRun') === 'true';
    const results = await processDueMatches({ dryRun });

    return jsonResponse(200, {
      ok: true,
      type: 'missing_predictions_1h',
      checkedAt: new Date().toISOString(),
      dueCount: results.length,
      results
    });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || String(error) });
  }
}
