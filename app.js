// ============================================================
// CONFIG — conta Google Ads (LATAM Brasil / Alliance Laundry)
// ============================================================
// IMPORTANTE: este ID precisa ser o account_id no FORMATO QUE O WINDSOR.AI
// RECONHECE (com hífens, ex: "502-613-1996"), e não o Customer ID puro do
// Google Ads (ex: "313434459904767"). Os dois formatos são diferentes —
// usar o errado faz o filtro de conta falhar silenciosamente e o dashboard
// passa a mostrar campanhas de OUTROS clientes (Amakha, Dabela, etc.).
// Confirmado em 2026-06-30 a partir dos dados retornados pela API.
const GOOGLE_ADS_ACCOUNT = '502-613-1996';
const CPL_GOAL = 35; // meta de CPL em USD, conforme o relatório semanal

// ============================================================
// AUTH (login simulado em 2 perfis — agência / cliente)
// ============================================================
let userType = 'agencia';
const USERS = {
  agencia: { user: 'modesto',  pass: 'modesto@2026',  name: 'Modesto GP',          role: 'Agência', avatar: 'M' },
  cliente: { user: 'alliance', pass: 'alliance@2026', name: 'Alliance Laundry BR', role: 'Cliente',  avatar: 'A' }
};
function setUser(t, btn) {
  userType = t;
  document.querySelectorAll('.user-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value.trim();
  const v = USERS[userType];
  if (u === v.user && p === v.pass) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').classList.add('visible');
    document.getElementById('sb-name').textContent = v.name;
    document.getElementById('sb-role').textContent = v.role;
    document.getElementById('sb-avatar').textContent = v.avatar;
    document.getElementById('topbar-date').textContent = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    setQuick(23, document.getElementById('q23'));
    loadData();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}
document.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
function doLogout() {
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-screen').style.display = 'flex';
}

// ============================================================
// NAV
// ============================================================
const TITLES = { bignumbers: 'Big Numbers', comparativo: 'Maio × Junho', otimizacoes: 'Otimizações', campanhas: 'Análise de Campanhas', proximos: 'Plano de Ação' };
function showPanel(id, el) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  el.classList.add('active');
  document.getElementById('page-title').textContent = TITLES[id];
}

// ============================================================
// DATES
// ============================================================
function toISO(d) { return d.toISOString().split('T')[0]; }
function setQuick(days, btn) {
  document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const to = new Date(); to.setDate(to.getDate() - 1);
  const from = new Date(to); from.setDate(from.getDate() - days + 1);
  document.getElementById('date-from').value = toISO(from);
  document.getElementById('date-to').value = toISO(to);
}
function fmtDateLabel(s) { const d = new Date(s + 'T12:00:00'); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); }

// Período anterior comparável (mesmo nº de dias, imediatamente antes do período selecionado)
function previousPeriod(dateFrom, dateTo) {
  const from = new Date(dateFrom + 'T12:00:00');
  const to = new Date(dateTo + 'T12:00:00');
  const days = Math.round((to - from) / 86400000) + 1;
  const prevTo = new Date(from); prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - days + 1);
  return { from: toISO(prevFrom), to: toISO(prevTo) };
}

// Mês corrente (01 até dateTo) e mês anterior completo — para o painel 02
function monthRanges(dateTo) {
  const to = new Date(dateTo + 'T12:00:00');
  const curStart = new Date(to.getFullYear(), to.getMonth(), 1);
  const prevMonthEnd = new Date(to.getFullYear(), to.getMonth(), 0);
  const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1);
  return {
    curr: { from: toISO(curStart), to: dateTo },
    prev: { from: toISO(prevMonthStart), to: toISO(prevMonthEnd) }
  };
}

// ============================================================
// LOADING UI
// ============================================================
function showLoad(msg) { document.getElementById('loading-text').textContent = msg || 'Buscando dados...'; document.getElementById('loading-overlay').classList.add('show'); document.getElementById('apply-btn').disabled = true; }
function hideLoad() { document.getElementById('loading-overlay').classList.remove('show'); document.getElementById('apply-btn').disabled = false; }

// ============================================================
// FORMAT
// ============================================================
function fmt$(n) { if (n === null || n === undefined || isNaN(n)) return '—'; return '$' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtN(n) { if (n === null || n === undefined || isNaN(n)) return '—'; return Math.round(n).toLocaleString('pt-BR'); }
function fmtPct(n) { if (n === null || n === undefined || isNaN(n)) return '—'; return n.toFixed(2).replace('.', ',') + '%'; }
function pctChange(curr, prev) { if (!prev) return null; return ((curr - prev) / prev) * 100; }
function changeHTML(curr, prev, lowerIsBetter, suffix) {
  const ch = pctChange(curr, prev);
  if (ch === null) return 'sem dado comparável';
  const sign = ch >= 0 ? '+' : '';
  const good = lowerIsBetter ? ch < 0 : ch > 0;
  const cls = good ? 'up' : 'down';
  return `<span class="${cls}">${sign}${ch.toFixed(2).replace('.', ',')}${suffix || '%'}</span> vs período anterior`;
}

// ============================================================
// FETCH — chama o backend próprio (Netlify Function) que fala com o Windsor.ai
// Ver /netlify/functions/windsor.js — a API key do Windsor fica só no servidor.
// O filtro por account_id é aplicado tanto na query quanto novamente dentro
// da function (defesa em profundidade contra vazamento entre clientes).
// ============================================================
async function fetchW(connector, dateFrom, dateTo, account) {
  const params = new URLSearchParams({ connector, date_from: dateFrom, date_to: dateTo, account: account || GOOGLE_ADS_ACCOUNT });
  const r = await fetch(`/api/windsor?${params.toString()}`);
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`HTTP ${r.status} ao buscar ${connector}: ${text || r.statusText}`);
  }
  const j = await r.json();
  return j.rows || [];
}

// ============================================================
// AGGREGATE HELPERS
// ============================================================
function sumRows(rows, fields) {
  const out = {}; fields.forEach(f => out[f] = 0);
  rows.forEach(r => fields.forEach(f => { out[f] += parseFloat(r[f]) || 0; }));
  return out;
}
function aggByDate(rows, dateF, fields) {
  const map = {};
  rows.forEach(r => {
    const d = r[dateF]; if (!d) return;
    if (!map[d]) { map[d] = { date: d }; fields.forEach(f => map[d][f] = 0); }
    fields.forEach(f => { map[d][f] += parseFloat(r[f]) || 0; });
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}
// Campos que são taxas/percentuais (não somáveis dia a dia) — precisam de média
// ponderada por impressões, em vez de soma simples.
const SHARE_FIELDS = ['search_impression_share', 'search_budget_lost_impression_share', 'search_rank_lost_impression_share'];

function aggByCamp(rows, campF, fields) {
  const map = {};
  rows.forEach(r => {
    const c = r[campF] || '(sem nome)';
    if (!map[c]) {
      map[c] = { name: c, _shareWeighted: {} };
      fields.forEach(f => map[c][f] = 0);
      SHARE_FIELDS.forEach(f => map[c]._shareWeighted[f] = 0);
    }
    const impr = parseFloat(r.impressions) || 0;
    fields.forEach(f => {
      if (SHARE_FIELDS.includes(f)) {
        // acumula ponderado por impressões; resolvido em média no final
        map[c]._shareWeighted[f] += (parseFloat(r[f]) || 0) * impr;
      } else {
        map[c][f] += parseFloat(r[f]) || 0;
      }
    });
  });
  const out = Object.values(map).map(c => {
    SHARE_FIELDS.forEach(f => {
      if (fields.includes(f)) c[f] = c.impressions > 0 ? c._shareWeighted[f] / c.impressions : 0;
    });
    delete c._shareWeighted;
    return c;
  });
  return out.sort((a, b) => b.spend - a.spend);
}

// ============================================================
// CHARTS
// ============================================================
let charts = {};
function killCharts() { Object.values(charts).forEach(c => { try { c.destroy(); } catch (e) {} }); charts = {}; }
const gold = '#C2A24A', green = '#5C9A6E', red = '#C2614A', muted = '#80785F';
const baseGrid = { color: 'rgba(244,239,228,.05)' };
const baseTicks = { font: { size: 10 }, color: '#80785F' };
const bOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: baseGrid, ticks: baseTicks }, y: { grid: baseGrid, ticks: baseTicks } } };
function mk(id, type, data, extra = {}) {
  const el = document.getElementById(id); if (!el) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(el, { type, data, options: { ...bOpts, ...extra } });
}

// ============================================================
// MAIN LOAD
// ============================================================
async function loadData() {
  const dateFrom = document.getElementById('date-from').value;
  const dateTo = document.getElementById('date-to').value;
  if (!dateFrom || !dateTo) { alert('Selecione as datas.'); return; }

  showLoad('Buscando dados do Google Ads via Windsor.ai...');
  killCharts();

  try {
    const prev = previousPeriod(dateFrom, dateTo);
    const months = monthRanges(dateTo);

    const [curRows, prevRows, currMonthRows, prevMonthRows] = await Promise.all([
      fetchW('google_ads', dateFrom, dateTo),
      fetchW('google_ads', prev.from, prev.to),
      fetchW('google_ads', months.curr.from, months.curr.to),
      fetchW('google_ads', months.prev.from, months.prev.to)
    ]);

    // ---------- 01 BIG NUMBERS ----------
    const fields = ['spend', 'impressions', 'clicks', 'conversions'];
    const cur = sumRows(curRows, fields);
    const pre = sumRows(prevRows, fields);

    const cpl = cur.conversions > 0 ? cur.spend / cur.conversions : null;
    const cplPrev = pre.conversions > 0 ? pre.spend / pre.conversions : null;
    const cvr = cur.clicks > 0 ? (cur.conversions / cur.clicks * 100) : null;
    const cvrPrev = pre.clicks > 0 ? (pre.conversions / pre.clicks * 100) : null;
    const cpc = cur.clicks > 0 ? cur.spend / cur.clicks : null;
    const cpcPrev = pre.clicks > 0 ? pre.spend / pre.clicks : null;
    const ctr = cur.impressions > 0 ? (cur.clicks / cur.impressions * 100) : null;
    const ctrPrev = pre.impressions > 0 ? (pre.clicks / pre.impressions * 100) : null;

    const periodStr = `${fmtDateLabel(dateFrom)} → ${fmtDateLabel(dateTo)}`;
    const daysCount = Math.round((new Date(dateTo) - new Date(dateFrom)) / 86400000) + 1;

    document.getElementById('bn-eyebrow').textContent = `01 · BIG NUMBERS · ${dateFrom.split('-').reverse().slice(0,2).join('/')} → ${dateTo.split('-').reverse().slice(0,2).join('/')}`;
    document.getElementById('bn-note').textContent = `${daysCount} dias de dados — conta LATAM Brasil.`;
    document.getElementById('bn-period-label').textContent = periodStr;

    document.getElementById('k-invest').textContent = fmt$(cur.spend);
    document.getElementById('k-invest-sub').innerHTML = changeHTML(cur.spend, pre.spend, true);
    document.getElementById('k-conv').textContent = cur.conversions.toFixed(0);
    document.getElementById('k-conv-sub').innerHTML = changeHTML(cur.conversions, pre.conversions, false);
    document.getElementById('k-cpl').textContent = cpl !== null ? fmt$(cpl) : '—';
    document.getElementById('k-cpl-sub').innerHTML = `Meta $${CPL_GOAL} · ` + changeHTML(cpl, cplPrev, true);
    document.getElementById('k-cvr').textContent = cvr !== null ? fmtPct(cvr) : '—';
    document.getElementById('k-cvr-sub').innerHTML = changeHTML(cvr, cvrPrev, false);
    document.getElementById('k-impr').textContent = fmtN(cur.impressions);
    document.getElementById('k-impr-sub').innerHTML = changeHTML(cur.impressions, pre.impressions, false);
    document.getElementById('k-clicks').textContent = fmtN(cur.clicks);
    document.getElementById('k-clicks-sub').innerHTML = changeHTML(cur.clicks, pre.clicks, false);
    document.getElementById('k-cpc').textContent = cpc !== null ? fmt$(cpc) : '—';
    document.getElementById('k-cpc-sub').innerHTML = changeHTML(cpc, cpcPrev, true);
    document.getElementById('k-ctr').textContent = ctr !== null ? fmtPct(ctr) : '—';
    document.getElementById('k-ctr-sub').innerHTML = changeHTML(ctr, ctrPrev, false, 'pp');

    document.getElementById('opt-cpl-impact').textContent = `CPL médio: ${cpl !== null ? fmt$(cpl) : '—'}`;

    // CPL diário chart
    const daily = aggByDate(curRows, 'date', ['spend', 'conversions']);
    const dLabels = daily.map(d => d.date.slice(5).replace('-', '/'));
    const dSpend = daily.map(d => +d.spend.toFixed(2));
    const dCPL = daily.map(d => d.conversions > 0 ? +(d.spend / d.conversions).toFixed(2) : null);
    document.getElementById('cpl-chart-sub').textContent = `${periodStr} · Conta LATAM Brasil · Meta de CPL: $${CPL_GOAL}`;
    mk('c-cpl-daily', 'bar', {
      labels: dLabels,
      datasets: [
        { label: 'Investimento', data: dSpend, backgroundColor: 'rgba(194,162,74,.55)', borderRadius: 3, yAxisID: 'y' },
        { label: 'CPL ($)', data: dCPL, type: 'line', borderColor: green, backgroundColor: green, tension: .35, pointRadius: 3, yAxisID: 'y1', spanGaps: true },
        { label: 'Meta', data: dLabels.map(() => CPL_GOAL), type: 'line', borderColor: red, borderDash: [4, 4], pointRadius: 0, yAxisID: 'y1' }
      ]
    }, {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: baseGrid, ticks: { ...baseTicks, maxRotation: 60, minRotation: 60 } },
        y: { position: 'left', grid: baseGrid, ticks: { ...baseTicks, callback: v => '$' + v } },
        y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { ...baseTicks, callback: v => '$' + v } }
      }
    });

    // ---------- 02 COMPARATIVO MENSAL ----------
    const fieldsM = ['spend', 'impressions', 'clicks', 'conversions'];
    const currM = sumRows(currMonthRows, fieldsM);
    const prevM = sumRows(prevMonthRows, fieldsM);
    const currM_cpl = currM.conversions > 0 ? currM.spend / currM.conversions : null;
    const prevM_cpl = prevM.conversions > 0 ? prevM.spend / prevM.conversions : null;
    const currM_ctr = currM.impressions > 0 ? currM.clicks / currM.impressions * 100 : null;
    const prevM_ctr = prevM.impressions > 0 ? prevM.clicks / prevM.impressions * 100 : null;
    const currM_cpc = currM.clicks > 0 ? currM.spend / currM.clicks : null;
    const prevM_cpc = prevM.clicks > 0 ? prevM.spend / prevM.clicks : null;
    const currM_cvr = currM.clicks > 0 ? currM.conversions / currM.clicks * 100 : null;
    const prevM_cvr = prevM.clicks > 0 ? prevM.conversions / prevM.clicks * 100 : null;

    const prevMonthName = new Date(months.prev.from + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long' });
    const currMonthName = new Date(months.curr.from + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long' });
    document.getElementById('comp-h-prev').textContent = `${prevMonthName.toUpperCase()} (completo)`;
    document.getElementById('comp-h-curr').textContent = `${currMonthName.toUpperCase()} (01–${dateTo.split('-')[2]})`;
    document.getElementById('comp-note').textContent = `${currMonthName} (até ${fmtDateLabel(dateTo)}) vs ${prevMonthName} (mês completo).`;

    const compRows = [
      { label: 'Investimento', prev: fmt$(prevM.spend), curr: fmt$(currM.spend), delta: pctChange(currM.spend, prevM.spend), lowerBetter: null },
      { label: 'Impressões', prev: fmtN(prevM.impressions), curr: fmtN(currM.impressions), delta: pctChange(currM.impressions, prevM.impressions), lowerBetter: null },
      { label: 'Cliques', prev: fmtN(prevM.clicks), curr: fmtN(currM.clicks), delta: pctChange(currM.clicks, prevM.clicks), lowerBetter: null },
      { label: 'Conversões GA', prev: fmtN(prevM.conversions), curr: fmtN(currM.conversions), delta: pctChange(currM.conversions, prevM.conversions), lowerBetter: false },
      { label: 'CPL (Conv. GA)', prev: fmt$(prevM_cpl), curr: fmt$(currM_cpl), delta: pctChange(currM_cpl, prevM_cpl), lowerBetter: true },
      { label: 'CTR', prev: fmtPct(prevM_ctr), curr: fmtPct(currM_ctr), delta: pctChange(currM_ctr, prevM_ctr), lowerBetter: false },
      { label: 'CPC médio', prev: fmt$(prevM_cpc), curr: fmt$(currM_cpc), delta: pctChange(currM_cpc, prevM_cpc), lowerBetter: true },
      { label: 'CVR', prev: fmtPct(prevM_cvr), curr: fmtPct(currM_cvr), delta: pctChange(currM_cvr, prevM_cvr), lowerBetter: false }
    ];
    document.getElementById('comp-tbody').innerHTML = compRows.map(r => {
      let deltaHTML;
      if (r.delta !== null && !isNaN(r.delta) && r.lowerBetter !== null) {
        const good = r.lowerBetter ? r.delta < 0 : r.delta > 0;
        const arrow = r.delta >= 0 ? '▲' : '▼';
        const cls = good ? 'pos' : 'neg';
        deltaHTML = `<td class="${cls}">${arrow} ${Math.abs(r.delta).toFixed(0)}%</td>`;
      } else {
        deltaHTML = '<td>—</td>';
      }
      return `<tr><td class="campaign-name">${r.label}</td><td>${r.prev}</td><td>${r.curr}</td>${deltaHTML}</tr>`;
    }).join('');
    document.getElementById('comp-callout').textContent = `Comparativo calculado automaticamente via Windsor.ai: ${currMonthName} (01 a ${fmtDateLabel(dateTo)}) vs ${prevMonthName} (mês completo).`;

    // ---------- 04 CAMPANHAS ----------
    const campFields = ['spend', 'clicks', 'impressions', 'conversions', 'search_impression_share', 'search_budget_lost_impression_share'];
    const camps = aggByCamp(curRows, 'campaign', campFields);
    const ctb = document.getElementById('camp-tbody');
    if (camps.length === 0) {
      ctb.innerHTML = '<tr><td colspan="7" class="no-data">Sem dados de campanha no período</td></tr>';
    } else {
      ctb.innerHTML = camps.map(c => {
        const cCPA = c.conversions > 0 ? c.spend / c.conversions : null;
        const cCTR = c.impressions > 0 ? c.clicks / c.impressions * 100 : null;
        const isShare = c.search_impression_share > 0 ? (c.search_impression_share <= 1 ? c.search_impression_share * 100 : c.search_impression_share) : null;
        const isLost = c.search_budget_lost_impression_share > 0 ? (c.search_budget_lost_impression_share <= 1 ? c.search_budget_lost_impression_share * 100 : c.search_budget_lost_impression_share) : null;
        const cpaCls = cCPA !== null && cCPA < 20 ? 'pos' : '';
        const lostCls = isLost !== null && isLost >= 40 ? 'neg' : '';
        return `<tr>
          <td class="campaign-name" title="${c.name}">${c.name}</td>
          <td>${fmt$(c.spend)}</td>
          <td>${c.conversions.toFixed(1)}</td>
          <td class="${cpaCls}">${cCPA !== null ? fmt$(cCPA) : '—'}</td>
          <td>${cCTR !== null ? fmtPct(cCTR) : '—'}</td>
          <td>${isShare !== null ? isShare.toFixed(1) + '%' : '—'}</td>
          <td class="${lostCls}">${isLost !== null ? isLost.toFixed(1) + '%' : '—'}</td>
        </tr>`;
      }).join('');
    }

    const top8 = camps.slice(0, 8);
    mk('c-cpa-camp', 'bar', {
      labels: top8.map(c => c.name.length > 22 ? c.name.slice(0, 22) + '…' : c.name),
      datasets: [{ data: top8.map(c => c.conversions > 0 ? +(c.spend / c.conversions).toFixed(2) : 0), backgroundColor: top8.map(c => { const v = c.conversions > 0 ? c.spend / c.conversions : 0; return v < 20 ? green : v < 35 ? gold : red; }), borderRadius: 4 }]
    }, { indexAxis: 'y', scales: { x: { grid: baseGrid, ticks: { ...baseTicks, callback: v => '$' + v } }, y: { grid: { display: false }, ticks: baseTicks } } });

    mk('c-camp-pie', 'doughnut', {
      labels: top8.map(c => (c.name.length > 18 ? c.name.slice(0, 18) + '…' : c.name)),
      datasets: [{ data: top8.map(c => c.spend), backgroundColor: ['#C2A24A', '#5C9A6E', '#6E9BC2', '#C2614A', '#9A7FB0', '#B0925A', '#5C8A9A', '#A05C7A'], borderWidth: 0 }]
    }, { plugins: { legend: { display: true, position: 'bottom', labels: { font: { size: 9 }, color: '#B8AE98', boxWidth: 9, padding: 6 } } }, scales: {} });

    document.getElementById('filter-info').textContent = `Atualizado ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${periodStr}`;

    // ---------- 05 ALERTAS ----------
    const alerts = [];
    if (camps.length > 0) {
      const top = camps[0];
      alerts.push({ type: 'success', title: `✅ Top campanha: ${top.name.length > 35 ? top.name.slice(0, 35) + '…' : top.name}`, body: `${fmt$(top.spend)} investidos com ${top.conversions.toFixed(1)} conversões no período.` });
    }
    const cplsByDay = dCPL.filter(v => v !== null);
    if (cplsByDay.length) {
      const maxCPL = Math.max(...cplsByDay);
      const maxIdx = dCPL.indexOf(maxCPL);
      if (maxCPL > CPL_GOAL) alerts.push({ type: 'danger', title: `🔴 CPL acima da meta em ${dLabels[maxIdx]}: ${fmt$(maxCPL)}`, body: `Meta é $${CPL_GOAL}. Revisar lances e criativos desse dia.` });
      const minCPL = Math.min(...cplsByDay);
      const minIdx = dCPL.indexOf(minCPL);
      alerts.push({ type: 'success', title: `✅ Melhor CPL: ${fmt$(minCPL)} em ${dLabels[minIdx]}`, body: 'Analisar condições desse dia para replicar a performance.' });
    }
    const highLost = camps.filter(c => c.search_budget_lost_impression_share > 0.4);
    if (highLost.length) alerts.push({ type: 'danger', title: `🔴 ${highLost.length} campanha(s) com IS perdida ≥ 40%`, body: `Budget insuficiente pode estar limitando: ${highLost.slice(0, 2).map(c => c.name).join(', ')}.` });
    alerts.push({ type: 'info', title: `ℹ️ Período: ${periodStr}`, body: `Total: ${fmt$(cur.spend)} · ${fmtN(cur.clicks)} cliques · ${cur.conversions.toFixed(0)} conversões.` });
    document.getElementById('alerts-container').innerHTML = alerts.map(a => `<div class="alert-card ${a.type}"><div class="alert-title">${a.title}</div><div class="alert-body">${a.body}</div></div>`).join('');

    hideLoad();
  } catch (err) {
    hideLoad();
    console.error(err);
    document.getElementById('filter-info').textContent = 'Erro: ' + err.message;
    alert('Erro ao buscar dados do Windsor.ai: ' + err.message + '\n\nVerifique se a Netlify Function /api/windsor está configurada com a sua WINDSOR_API_KEY.');
  }
}

function filterTable(inp, tbodyId) {
  const q = inp.value.toLowerCase();
  document.querySelectorAll('#' + tbodyId + ' tr').forEach(r => {
    r.style.display = r.cells[0] && r.cells[0].textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}
