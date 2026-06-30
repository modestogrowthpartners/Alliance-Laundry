// netlify/functions/windsor.js
//
// Endpoint: /api/windsor?connector=google_ads&date_from=2026-06-01&date_to=2026-06-23&account=502-613-1996
//
// Esta function roda no servidor da Netlify, nunca no navegador — por isso a
// WINDSOR_API_KEY fica protegida (configurada como variável de ambiente no
// painel da Netlify, nunca escrita no código ou no HTML).
//
// Documentação da API do Windsor.ai: https://onboard.windsor.ai/connectors-and-fields
// Endpoint de dados: https://connectors.windsor.ai/{connector}
//
// IMPORTANTE — ISOLAMENTO DE DADOS ENTRE CLIENTES
// =================================================
// Descobrimos que o parâmetro account_id enviado para a API do Windsor.ai
// nem sempre filtra os dados corretamente (ou o formato do ID não bate com
// o que o Windsor espera) — isso já causou vazamento de campanhas de um
// cliente (Amakha Paris) aparecendo no dashboard de outro (Alliance Laundry).
//
// Por isso, além de mandar o account_id na query pro Windsor, SEMPRE
// filtramos as linhas retornadas no servidor, comparando account_id (e/ou
// account_name) de cada linha com a conta esperada. Isso garante isolamento
// mesmo se a API externa falhar em filtrar.
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

    // Detecta o padrão de erro do Windsor disfarçado de dado válido (200 OK
    // mas com mensagens tipo "Uh-oh! You've connected more accounts than
    // your Trial plan allows..." nos campos em vez de números/IDs reais).
    // Sem isso, esse tipo de erro passa batido pro front-end como se fosse
    // dado real, e o dashboard mostra "$0,00" sem explicação nenhuma.
    const rawRows = Array.isArray(data) ? data : (data.data || data.rows || []);
    const windsorErrorRow = rawRows.find(r =>
      typeof r.account_id === 'string' && /upgrade here/i.test(r.account_id)
    );
    if (windsorErrorRow) {
      return {
        statusCode: 402,
        headers,
        body: JSON.stringify({
          error: 'Limite do plano Windsor.ai atingido.',
          detail: windsorErrorRow.account_id
        })
      };
    }

    // ----------------------------------------------------------------
    // FILTRO DE SEGURANÇA NO SERVIDOR — isolamento por cliente
    // ----------------------------------------------------------------
    // Mesmo que o Windsor já tenha tentado filtrar por account_id na query,
    // filtramos de novo aqui comparando o account_id de cada linha com o
    // account_id pedido. Isso é o que efetivamente garante que o dashboard
    // de um cliente nunca mostre dado de outro.
    let rows = rawRows;
    if (account) {
      const before = rows.length;
      rows = rows.filter(r => String(r.account_id) === String(account));
      // Log interno (aparece nos Function logs da Netlify) — ajuda a
      // diagnosticar rapidamente se o Windsor não estava filtrando.
      console.log(`[windsor.js] account=${account} | linhas recebidas=${before} | linhas após filtro=${rows.length}`);
    }

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
