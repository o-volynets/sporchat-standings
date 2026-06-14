const { jsonResponse, supabaseFetch } = require('./_supabase');

exports.config = {
  schedule: '*/5 * * * *'
};

function formatKyivTime(value) {
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function buildMessage(match, predictions) {
  const lines = [];

  lines.push('⏰ За 30 хв матч:');
  lines.push(match.match_name);
  lines.push('Початок: ' + formatKyivTime(match.starts_at));
  lines.push('');
  lines.push('Прогнози гравців:');

  let p1 = 0;
  let draw = 0;
  let p2 = 0;
  let missing = 0;

  predictions.forEach(item => {
    if (!item.has_prediction) {
      missing += 1;
      lines.push(`${item.player} — не зробив прогноз`);
      return;
    }

    if (item.predicted_result === 'П1') p1 += 1;
    if (item.predicted_result === 'Н') draw += 1;
    if (item.predicted_result === 'П2') p2 += 1;

    lines.push(`${item.player} — ${item.score}`);
  });

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
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
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
    body: JSON.stringify({
      p_window_start_minutes: 25,
      p_window_end_minutes: 35
    })
  });

  const results = [];

  for (const match of dueMatches || []) {
    const claimed = await supabaseFetch('/rest/v1/rpc/telegram_claim_notification', {
      method: 'POST',
      body: JSON.stringify({
        p_match_id: match.match_id,
        p_notification_type: 'predictions_30m'
      })
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
          body: JSON.stringify({
            p_match_id: match.match_id,
            p_notification_type: 'predictions_30m'
          })
        });
      }

      results.push({ match: match.match_name, sent: !dryRun, dryRun, message });
    } catch (error) {
      await supabaseFetch('/rest/v1/rpc/telegram_mark_failed', {
        method: 'POST',
        body: JSON.stringify({
          p_match_id: match.match_id,
          p_error: error.message || String(error),
          p_notification_type: 'predictions_30m'
        })
      });

      results.push({ match: match.match_name, sent: false, error: error.message || String(error) });
    }
  }

  return results;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return jsonResponse(204, {});

  try {
    const params = event.queryStringParameters || {};
    const dryRun = params.dryRun === '1' || params.dryRun === 'true';
    const results = await processDueMatches({ dryRun });

    return jsonResponse(200, {
      ok: true,
      checkedAt: new Date().toISOString(),
      dueCount: results.length,
      results
    });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error.message || String(error) });
  }
};
