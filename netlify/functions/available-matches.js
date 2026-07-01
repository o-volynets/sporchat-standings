const { jsonResponse, supabaseFetch } = require('./_supabase');

function toKyivLabel(isoString) {
  const date = new Date(isoString);
  const parts = new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.day}.${parts.month}, ${parts.hour}:${parts.minute}`;
}

exports.handler = async function () {
  try {
    const nowIso = new Date().toISOString();

    // Беремо найближчі майбутні матчі з запасом, а потім фільтруємо ті,
    // по яких прогнози вже опубліковані в Telegram.
    const matches = await supabaseFetch(
      `/rest/v1/matches?select=id,match_name,starts_at&starts_at=gt.${encodeURIComponent(nowIso)}&order=starts_at.asc&limit=60`
    );

    if (!Array.isArray(matches) || matches.length === 0) {
      return jsonResponse(200, { ok: true, matches: [] });
    }

    const ids = matches.map((m) => m.id);
    const idList = ids.map((id) => `"${id}"`).join(',');

    const sentNotifications = await supabaseFetch(
      `/rest/v1/telegram_notifications?select=match_id&notification_type=eq.predictions_30m&status=eq.sent&match_id=in.(${encodeURIComponent(idList)})`
    );

    const publishedMatchIds = new Set((sentNotifications || []).map((n) => n.match_id));

    const available = matches
      .filter((m) => !publishedMatchIds.has(m.id))
      .map((m) => ({
        id: m.id,
        match_name: m.match_name,
        starts_at: m.starts_at,
        label: `${toKyivLabel(m.starts_at)} — ${m.match_name}`,
      }));

    return jsonResponse(200, {
      ok: true,
      count: available.length,
      matches: available,
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error.message || 'Failed to load available matches',
    });
  }
};
