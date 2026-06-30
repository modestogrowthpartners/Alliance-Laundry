// ============================================================
// CONFIG — conta Google Ads (LATAM Brasil / Alliance Laundry)
// ============================================================
// IMPORTANTE: este ID precisa ser o account_id no FORMATO QUE O WINDSOR.AI
// RECONHECE (com hífens, ex: "502-613-1996"), e não o Customer ID puro do
// Google Ads. Confirmado em 2026-06-30 a partir dos dados retornados pela API.
const GOOGLE_ADS_ACCOUNT = '502-613-1996';
const CPL_GOAL = 35; // meta de CPL em USD, conforme o relatório semanal
const CLIENT_NAME = 'Alliance Laundry Systems · Brasil';

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
    initScrollSpy();
    loadData();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}
document.addEventListener('keydown', e => { if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') doLogin(); });
function doLogout() {
  document.getElementById('app').classList.remove('visible');
  document.getElementById('login-screen').style.display = 'flex';
}

// ============================================================
// NAV — single page com scroll-to-section + scrollspy
// ============================================================
function scrollToSection(id, el) {
  document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function initScrollSpy() {
  const sections = document.querySelectorAll('.report-section');
  const navItems = document.querySelectorAll('.nav-item');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navItems.forEach(n => n.classList.remove('active'));
        const match = document.querySelector(`.nav-item[data-target="${entry.target.id}"]`);
        if (match) match.classList.add('active');
      }
    });
  }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
  sections.forEach(s => observer.observe(s));
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

function previousPeriod(dateFrom, dateTo) {
  const from = new Date(dateFrom + 'T12:00:00');
  const to = new Date(dateTo + 'T12:00:00');
  const days = Math.round((to - from) / 86400000) + 1;
  const prevTo = new Date(from); prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - days + 1);
  return { from: toISO(prevFrom), to: toISO(prevTo) };
}
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
// FETCH
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
const gold = '#C2A24A', green = '#4A7C59', red = '#B5483A', muted = '#9C957F';
const baseGrid = { color: 'rgba(26,26,26,.05)' };
const baseTicks = { font: { size: 10 }, color: '#9C957F' };
const bOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: baseGrid, ticks: baseTicks }, y: { grid: baseGrid, ticks: baseTicks } } };
function mk(id, type, data, extra = {}) {
  const el = document.getElementById(id); if (!el) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(el, { type, data, options: { ...bOpts, ...extra } });
}

// ============================================================
// STATE — guarda o último resultado calculado para a exportação PPTX usar
// ============================================================
window.reportState = null;

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

    document.getElementById('filter-info').textContent = `Atualizado ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${periodStr}`;

    // ---------- 03 OTIMIZAÇÕES (geradas por regras) ----------
    const optimizations = buildOptimizations(camps, cur, pre, cpl, cplPrev);
    renderOptimizations(optimizations);

    // ---------- 05 PLANO DE AÇÃO (gerado por regras) ----------
    const actions = buildActionPlan(camps, cpl, ctr, dCPL, dLabels);
    renderActionPlan(actions);

    // ---------- GUARDA ESTADO PARA EXPORTAÇÃO ----------
    window.reportState = {
      periodStr, dateFrom, dateTo, daysCount,
      cur, pre, cpl, cplPrev, cvr, cvrPrev, cpc, cpcPrev, ctr, ctrPrev,
      compRows, prevMonthName, currMonthName,
      camps, top8,
      dLabels, dSpend, dCPL,
      optimizations, actions
    };

    hideLoad();
  } catch (err) {
    hideLoad();
    console.error(err);
    document.getElementById('filter-info').textContent = 'Erro: ' + err.message;
    alert('Erro ao buscar dados do Windsor.ai: ' + err.message);
  }
}

// ============================================================
// 03 — GERAÇÃO AUTOMÁTICA DE "OTIMIZAÇÕES REALIZADAS" POR REGRAS
// ============================================================
function buildOptimizations(camps, cur, pre, cpl, cplPrev) {
  const out = [];

  // Regra 1: campanhas com IS perdida alta por orçamento -> sugestão de budget
  const highBudgetLoss = camps.filter(c => c.search_budget_lost_impression_share > 0.4 && c.spend > 50);
  if (highBudgetLoss.length > 0) {
    const names = highBudgetLoss.slice(0, 3).map(c => c.name).join(', ');
    out.push({
      tag: 'budget', tagLabel: 'ORÇAMENTO',
      title: `Oportunidade de redistribuição de budget`,
      desc: `${highBudgetLoss.length} campanha(s) perdendo impression share por orçamento limitado: ${names}.`,
      impactLabel: 'IS perdida média',
      impactVal: fmtPct(highBudgetLoss.reduce((a, c) => a + c.search_budget_lost_impression_share, 0) / highBudgetLoss.length * 100)
    });
  }

  // Regra 2: campanhas com CPA muito bom (<20) -> candidatas a escalar
  const lowCPA = camps.filter(c => c.conversions > 0 && (c.spend / c.conversions) < 20 && c.spend > 30);
  if (lowCPA.length > 0) {
    const best = lowCPA[0];
    out.push({
      tag: 'keyword', tagLabel: 'PERFORMANCE',
      title: `Campanhas com CPA abaixo da meta — candidatas a escalar`,
      desc: `${lowCPA.length} campanha(s) com CPA < $20, destaque para "${best.name}".`,
      impactLabel: 'Melhor CPA',
      impactVal: fmt$(best.spend / best.conversions)
    });
  }

  // Regra 3: CPL geral vs período anterior
  if (cpl !== null && cplPrev !== null) {
    const change = ((cpl - cplPrev) / cplPrev) * 100;
    out.push({
      tag: 'channel', tagLabel: 'RESULTADO GERAL',
      title: change < 0 ? 'CPL em queda no período' : 'CPL em alta no período — atenção',
      desc: `CPL médio passou de ${fmt$(cplPrev)} para ${fmt$(cpl)} (meta $${CPL_GOAL}).`,
      impactLabel: 'Variação CPL',
      impactVal: (change >= 0 ? '+' : '') + change.toFixed(0) + '%'
    });
  }

  if (out.length === 0) {
    out.push({
      tag: 'channel', tagLabel: 'INFO',
      title: 'Sem otimizações automáticas identificadas neste período',
      desc: 'Os dados do período não atingiram os limiares para sugestões automáticas.',
      impactLabel: '', impactVal: ''
    });
  }
  return out;
}
function renderOptimizations(list) {
  document.getElementById('opt-container').innerHTML = list.map(o => `
    <div class="opt-card">
      <span class="opt-tag ${o.tag}">${o.tagLabel}</span>
      <div class="opt-body">
        <div class="opt-title">${o.title}</div>
        <div class="opt-desc">${o.desc}</div>
      </div>
      ${o.impactVal ? `<div class="opt-impact"><div class="opt-impact-label">${o.impactLabel}</div><div class="opt-impact-val">${o.impactVal}</div></div>` : ''}
    </div>
  `).join('');
}

// ============================================================
// 05 — GERAÇÃO AUTOMÁTICA DE "PLANO DE AÇÃO" POR REGRAS
// ============================================================
function buildActionPlan(camps, cpl, ctr, dCPL, dLabels) {
  const out = [];

  const highLost = camps.filter(c => c.search_budget_lost_impression_share > 0.4);
  if (highLost.length) {
    out.push({
      priority: 'high', priorityLabel: 'ALTA',
      title: `Revisar orçamento de ${highLost.length} campanha(s) com IS perdida ≥ 40%`,
      desc: `Campanhas afetadas: ${highLost.slice(0, 3).map(c => c.name).join(', ')}. Budget insuficiente está limitando o alcance dessas campanhas.`,
      meta: 'Meta: reduzir IS perdida para < 20%'
    });
  }

  const negCandidates = camps.filter(c => c.spend > 30 && c.conversions === 0);
  if (negCandidates.length) {
    out.push({
      priority: 'medium', priorityLabel: 'MÉDIA',
      title: `Revisar ${negCandidates.length} campanha(s) com gasto sem conversão`,
      desc: `Campanhas consumindo orçamento sem gerar conversões no período: ${negCandidates.slice(0, 3).map(c => c.name).join(', ')}.`,
      meta: 'Meta: reduzir desperdício de budget'
    });
  }

  if (cpl !== null && cpl > CPL_GOAL) {
    out.push({
      priority: 'high', priorityLabel: 'ALTA',
      title: 'CPL acima da meta — revisar lances e segmentação',
      desc: `CPL médio do período (${fmt$(cpl)}) está acima da meta de $${CPL_GOAL}.`,
      meta: `Meta: CPL ≤ $${CPL_GOAL}`
    });
  }

  const topCampaign = camps[0];
  if (topCampaign) {
    out.push({
      priority: 'low', priorityLabel: 'BAIXA',
      title: `Avaliar escala de "${topCampaign.name}"`,
      desc: `Maior investimento do período (${fmt$(topCampaign.spend)}). Avaliar oportunidade de aumento de budget se CPA estiver saudável.`,
      meta: 'Meta: identificar headroom de escala'
    });
  }

  if (out.length === 0) {
    out.push({
      priority: 'low', priorityLabel: 'INFO',
      title: 'Sem ações críticas identificadas neste período',
      desc: 'Performance dentro dos parâmetros esperados.',
      meta: ''
    });
  }
  return out;
}
function renderActionPlan(list) {
  document.getElementById('action-container').innerHTML = list.map(a => `
    <div class="action-card">
      <div class="action-top">
        <span class="priority-tag ${a.priority}">${a.priorityLabel}</span>
        <span class="action-title">${a.title}</span>
      </div>
      <div class="action-desc">${a.desc}</div>
      ${a.meta ? `<div class="action-meta">${a.meta}</div>` : ''}
    </div>
  `).join('');
}

function filterTable(inp, tbodyId) {
  const q = inp.value.toLowerCase();
  document.querySelectorAll('#' + tbodyId + ' tr').forEach(r => {
    r.style.display = r.cells[0] && r.cells[0].textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}
