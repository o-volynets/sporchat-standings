const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoRxDW_AcGE__86CzrW8CEMPyPgWuBCqgQm98qNkbtPrcvdfAbSRUklRkEkkSNHk8JlQ/exec';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      ok: false,
      error: 'Method not allowed'
    });
  }

  try {
    const body = JSON.parse(event.body || '{}');

    const player = String(body.player || '').trim();
    const match = String(body.match || '').trim();
    const score = String(body.score || '').trim();

    if (!player || !match || !score) {
      return jsonResponse(400, {
        ok: false,
        error: 'Не заповнені всі поля'
      });
    }

    if (!/^\d+\s*-\s*\d+$/.test(score)) {
      return jsonResponse(400, {
        ok: false,
        error: 'Рахунок має бути у форматі 0-0, 1-2, 4-9'
      });
    }

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'submitPrediction',
        player,
        match,
        score
      })
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      return jsonResponse(502, {
        ok: false,
        error: 'Apps Script повернув не JSON',
        preview: text.slice(0, 200)
      });
    }

    return jsonResponse(response.ok ? 200 : 500, data);

  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error.message || String(error)
    });
  }
};

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(data)
  };
}
