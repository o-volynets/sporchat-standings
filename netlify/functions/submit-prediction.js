const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoRxDW_AcGE__86CzrW8CEMPyPgWuBCqgQm98qNkbtPrcvdfAbSRUklRkEkkSNHk8JlQ/exec';

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ''
    };
  }

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
    const score = String(body.score || '')
      .trim()
      .replace(/[–—−]/g, '-')
      .replace(/\s+/g, '');

    if (!player || !match || !score) {
      return jsonResponse(400, {
        ok: false,
        error: 'Не заповнені всі поля'
      });
    }

    if (!/^\d{1,2}-\d{1,2}$/.test(score)) {
      return jsonResponse(400, {
        ok: false,
        error: 'Рахунок має бути у форматі 0-0, 1-2, 10-9'
      });
    }

    // Пишемо через GET до Apps Script, бо цей шлях стабільніше повертає JSON у зв'язці Netlify → Apps Script.
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('action', 'submitPrediction');
    url.searchParams.set('player', player);
    url.searchParams.set('match', match);
    url.searchParams.set('score', score);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      return jsonResponse(502, {
        ok: false,
        error: 'Apps Script повернув не JSON',
        status: response.status,
        preview: text.slice(0, 300)
      });
    }

    return jsonResponse(data.ok ? 200 : 400, data);

  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error.message || String(error)
    });
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(body)
  };
}
