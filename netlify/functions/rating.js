const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxoRxDW_AcGE__86CzrW8CEMPyPgWuBCqgQm98qNkbtPrcvdfAbSRUklRkEkkSNHk8JlQ/exec';

exports.handler = async function () {
  try {
    const response = await fetch(APPS_SCRIPT_URL);

    if (!response.ok) {
      throw new Error(`Apps Script returned ${response.status}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: false,
        error: error.message || String(error)
      })
    };
  }
};
