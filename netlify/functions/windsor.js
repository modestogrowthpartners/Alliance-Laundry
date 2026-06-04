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

  const params = new URLSearchParams();
  params.append('api_key', apiKey);
  params.append('connector', connector);
  params.append('fields', Array.isArray(fields) ? fields.join(',') : fields);
  params.append('date_from', date_from);
  params.append('date_to', date_to);
  if (accounts) params.append('accounts', Array.isArray(accounts) ? accounts.join(',') : accounts);

  const url = `https://connectors.windsor.ai/all?${params.toString()}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      return { statusCode: res.status, headers: HEADERS, body: JSON.stringify({ error: `Windsor returned ${res.status}`, detail: text.slice(0, 500) }) };
    }
    return { statusCode: 200, headers: HEADERS, body: text };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
