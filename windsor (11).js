// api/windsor.js
//
// VERCEL SERVERLESS FUNCTION — equivalente ao antigo netlify/functions/windsor.js
//
// Na Vercel, qualquer arquivo dentro da pasta /api na raiz do projeto vira
// automaticamente um endpoint serverless. Esse arquivo responde em:
//   /api/windsor?connector=google_ads&date_from=...&date_to=...&account=502-613-1996
//
// A WINDSOR_API_KEY continua protegida — configure-a em:
// Vercel Dashboard → seu projeto → Settings → Environment Variables
//
// IMPORTANTE — ISOLAMENTO DE DADOS ENTRE CLIENTES
// =================================================
// O parâmetro account_id enviado para a API do Windsor.ai nem sempre filtra
// os dados corretamente (já causou vazamento de campanhas de um cliente
// para o dashboard de outro). Por isso, filtramos as linhas retornadas
// NOVAMENTE aqui no servidor, comparando account_id de cada linha com o
// account_id pedido — isso garante isolamento mesmo se a API externa falhar.

module.exports = async function handler(req, res) {
  // CORS — equivalente ao header que existia na function da Netlify
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const { connector, date_from, date_to, account } = req.query;

    if (!connector || !date_from || !date_to) {
      res.status(400).json({ error: 'Parâmetros obrigatórios: connector, date_from, date_to' });
      return;
    }

    const apiKey = process.env.WINDSOR_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'WINDSOR_API_KEY não configurada nas variáveis de ambiente da Vercel.' });
      return;
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
      res.status(resp.status).json({ error: `Windsor.ai respondeu ${resp.status}`, detail: text.slice(0, 500) });
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      res.status(502).json({ error: 'Resposta inválida do Windsor.ai', detail: text.slice(0, 500) });
      return;
    }

    // Detecta o padrão de erro do Windsor disfarçado de dado válido (200 OK
    // mas com mensagens tipo "Uh-oh! You've connected more accounts than
    // your Trial plan allows..." nos campos em vez de números/IDs reais).
    const rawRows = Array.isArray(data) ? data : (data.data || data.rows || []);
    const windsorErrorRow = rawRows.find(r =>
      typeof r.account_id === 'string' && /upgrade here/i.test(r.account_id)
    );
    if (windsorErrorRow) {
      res.status(402).json({
        error: 'Limite do plano Windsor.ai atingido.',
        detail: windsorErrorRow.account_id
      });
      return;
    }

    // ----------------------------------------------------------------
    // FILTRO DE SEGURANÇA NO SERVIDOR — isolamento por cliente
    // ----------------------------------------------------------------
    let rows = rawRows;
    if (account) {
      const before = rows.length;
      rows = rows.filter(r => String(r.account_id) === String(account));
      console.log(`[api/windsor] account=${account} | linhas recebidas=${before} | linhas após filtro=${rows.length}`);
    }

    res.status(200).json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
