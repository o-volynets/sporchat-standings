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
  // Supabase зберігає starts_at як UTC/timestamptz.
  // Netlify виконує функції в UTC, тому обовʼязково форсуємо Europe/Kyiv,
  // інакше в Telegram може показувати 01:00 замість 04:00.
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value)).replace(',', '');
}

function buildMessage(match, predictions) {
  const lines = [];
  lines.push('⏰ За 5 хв матч:');
  lines.push(match.match_name);
  lines.push('Початок: ' + formatKyivTime(match.starts_at));
  lines.push('');
  lines.push('Прогнози гравців:');

  let p1 = 0;
  let draw = 0;
  let p2 = 0;
  let missing = 0;

  for (const item of predictions) {
    if (!item.has_prediction) {
      missing += 1;
      lines.push(`${item.player} — не зробив прогноз`);
      continue;
    }
    if (item.predicted_result === 'П1') p1 += 1;
    if (item.predicted_result === 'Н') draw += 1;
    if (item.predicted_result === 'П2') p2 += 1;
    lines.push(`${item.player} — ${item.score}`);
  }

  lines.push('');
  lines.push('Статистика:');
  lines.push(`П1: ${p1}`);
  lines.push(`Н: ${draw}`);
  lines.push(`П2: ${p2}`);
  lines.push(`Без прогнозу: ${missing}`);
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
  const dueMatches = await supabaseFetch('/rest/v1/rpc/telegram_due_matches', {
    method: 'POST',
    body: JSON.stringify({ p_window_start_minutes: 3, p_window_end_minutes: 7 })
  });

  const results = [];
  for (const match of dueMatches || []) {
    const claimed = await supabaseFetch('/rest/v1/rpc/telegram_claim_notification', {
      method: 'POST',
      body: JSON.stringify({ p_match_id: match.match_id, p_notification_type: 'predictions_30m' })
    });

    if (claimed !== true) {
      results.push({ match: match.match_name, skipped: true, reason: 'already claimed or sent' });
      continue;
    }

    try {
      const predictions = await supabaseFetch('/rest/v1/rpc/telegram_predictions_for_match', {
        method: 'POST',
        body: JSON.stringify({ p_match_id: match.match_id })
      });
      const message = buildMessage(match, predictions || []);

      if (!dryRun) {
        await sendTelegramMessage(message);
        await supabaseFetch('/rest/v1/rpc/telegram_mark_sent', {
          method: 'POST',
          body: JSON.stringify({ p_match_id: match.match_id, p_notification_type: 'predictions_30m' })
        });
      }
      results.push({ match: match.match_name, sent: !dryRun, dryRun, message });
    } catch (error) {
      await supabaseFetch('/rest/v1/rpc/telegram_mark_failed', {
        method: 'POST',
        body: JSON.stringify({ p_match_id: match.match_id, p_error: error.message || String(error), p_notification_type: 'predictions_30m' })
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
    return jsonResponse(200, { ok: true, scheduledSyntax: 'esm_config', publishWindow: '3-7 minutes before match', checkedAt: new Date().toISOString(), dueCount: results.length, results });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || String(error) });
  }
}
