// Netlify Function — proxy seguro para Windsor.ai
// A chave fica em variável de ambiente, nunca exposta no browser

const WINDSOR_API = 'https://connectors.windsor.ai/';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  const { connector, fields, date_from, date_to, accounts } = JSON.parse(event.body || '{}');

  const params = new URLSearchParams({
    api_key: apiKey,
    connector,
    fields: Array.isArray(fields) ? fields.join(',') : fields,
    date_from,
    date_to,
  });
  if (accounts) params.append('accounts', Array.isArray(accounts) ? accounts.join(',') : accounts);

  try {
    const res = await fetch(`${WINDSOR_API}?${params}`);
    const data = await res.json();
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
