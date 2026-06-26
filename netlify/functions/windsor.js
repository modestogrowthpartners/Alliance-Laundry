// netlify/functions/windsor.js
//
// Endpoint: /api/windsor?connector=google_ads&date_from=2026-06-01&date_to=2026-06-23&account=313434459904767
//
// Esta function roda no servidor da Netlify, nunca no navegador — por isso a
// WINDSOR_API_KEY fica protegida (configurada como variável de ambiente no
// painel da Netlify, nunca escrita no código ou no HTML).
//
// Documentação da API do Windsor.ai: https://onboard.windsor.ai/connectors-and-fields
// Endpoint de dados: https://connectors.windsor.ai/{connector}

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const { connector, date_from, date_to, account } = event.queryStringParameters || {};

    if (!connector || !date_from || !date_to) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Parâmetros obrigatórios: connector, date_from, date_to' })
      };
    }

    const apiKey = process.env.WINDSOR_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'WINDSOR_API_KEY não configurada nas variáveis de ambiente da Netlify.' })
      };
    }

    // Campos pedidos por conector — ajuste aqui se quiser trazer mais colunas.
    const FIELD_SETS = {
      google_ads: [
        'date', 'campaign', 'campaign_id', 'spend', 'impressions', 'clicks',
        'conversions', 'ctr', 'cpc', 'cost_per_conversion', 'conversion_rate',
        'search_impression_share', 'search_budget_lost_impression_share',
        'search_rank_lost_impression_share', 'account_id', 'account_name'
      ],
      facebook: [
        'date', 'campaign', 'spend', 'impressions', 'clicks', 'reach', 'ctr', 'cpc', 'cpm'
      ]
    };
    const fields = (FIELD_SETS[connector] || ['date', 'campaign', 'spend', 'impressions', 'clicks']).join(',');

    const url = new URL(`https://connectors.windsor.ai/${connector}`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('date_from', date_from);
    url.searchParams.set('date_to', date_to);
    url.searchParams.set('fields', fields);
    if (account) url.searchParams.set('account_id', account);

    const resp = await fetch(url.toString());
    const text = await resp.text();

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        headers,
        body: JSON.stringify({ error: `Windsor.ai respondeu ${resp.status}`, detail: text.slice(0, 500) })
      };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Resposta inválida do Windsor.ai', detail: text.slice(0, 500) }) };
    }

    // A API do Windsor normalmente retorna { data: [...] } — normalizamos para sempre `rows`.
    const rows = Array.isArray(data) ? data : (data.data || data.rows || []);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ rows })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
