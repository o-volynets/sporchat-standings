const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoRxDW_AcGE__86CzrW8CEMPyPgWuBCqgQm98qNkbtPrcvdfAbSRUklRkEkkSNHk8JlQ/exec';

exports.handler = async function () {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Apps Script returned ${response.status}`);
    }

    const data = await response.json();

    return jsonResponse(200, data);
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error.message || String(error)
    });
  }
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(body)
  };
}
