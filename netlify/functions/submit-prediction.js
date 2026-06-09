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
    const payload = JSON.parse(event.body || '{}');

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        action: 'submitPrediction',
        player: payload.player,
        match: payload.match,
        score: payload.score
      })
    });

    if (!response.ok) {
      throw new Error(`Apps Script returned ${response.status}`);
    }

    const data = await response.json();
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
