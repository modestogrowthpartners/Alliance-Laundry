// ============================================================
// EXPORT PPTX — gera a apresentação semanal completa no padrão
// visual da Modesto Growth Partners, a partir dos dados já
// calculados em window.reportState (preenchido por loadData()
// em app.js).
// ============================================================

// Paleta de cores (sem "#", conforme exigido pelo PptxGenJS)
const PPTX_COLORS = {
  bg: 'F4EFE4',
  bgWhite: 'FFFFFF',
  ink: '1A1A1A',
  inkSoft: '6B6458',
  gold: 'C2A24A',
  goldDeep: '9C7F33',
  green: '4A7C59',
  greenSoft: 'EAF3EC',
  red: 'B5483A',
  redSoft: 'FBEEEC',
  line: 'ECE6D9'
};

function shadow() {
  return { type: 'outer', color: '000000', blur: 6, offset: 2, angle: 90, opacity: 0.08 };
}

let pptxShapeRef = null;

async function exportPresentation() {
  const state = window.reportState;
  if (!state) { alert('Carregue os dados do dashboard antes de exportar.'); return; }

  const btn = document.getElementById('export-btn');
  btn.disabled = true;
  btn.textContent = 'Gerando apresentação...';

  try {
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_WIDE'; // 13.3 x 7.5
    pres.author = 'Modesto Growth Partners';
    pres.title = `Weekly Report — ${CLIENT_NAME}`;
    pptxShapeRef = pres.shapes;

    const W = 13.3, H = 7.5;
    const periodLabel = `${state.dateFrom.split('-').reverse().join('/')} → ${state.dateTo.split('-').reverse().join('/')}`;
    const todayLabel = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }).toUpperCase();

    // ---------- FOOTER HELPER ----------
    function addFooter(slide, dark) {
      slide.addText(`MODESTO GROWTH PARTNERS · ${CLIENT_NAME.toUpperCase()} · ${todayLabel}`, {
        x: 0.5, y: H - 0.45, w: W - 1, h: 0.3, fontSize: 8.5,
        color: dark ? '9C957F' : PPTX_COLORS.inkSoft, fontFace: 'Calibri'
      });
    }

    // =========================================================
    // SLIDE 1 — CAPA
    // =========================================================
    let s1 = pres.addSlide();
    s1.background = { color: PPTX_COLORS.ink };
    s1.addText('GOOGLE ADS · ANÁLISE SEMANAL · BRASIL', {
      x: 0.8, y: 2.1, w: W - 1.6, h: 0.4, fontSize: 12, charSpacing: 3,
      color: PPTX_COLORS.gold, fontFace: 'Calibri', bold: true
    });
    s1.addText(`Weekly ${formatWeeklyTag(state.dateTo)}`, {
      x: 0.8, y: 2.6, w: W - 1.6, h: 1.1, fontSize: 48, bold: true,
      color: 'FFFFFF', fontFace: 'Cambria'
    });
    s1.addText(CLIENT_NAME, {
      x: 0.8, y: 3.7, w: W - 1.6, h: 0.5, fontSize: 20,
      color: 'E8E2D4', fontFace: 'Cambria'
    });
    s1.addText(periodLabel, {
      x: 0.8, y: 4.3, w: W - 1.6, h: 0.4, fontSize: 13,
      color: '9C957F', fontFace: 'Calibri'
    });
    s1.addText(`CONFIDENCIAL — USO INTERNO · MODESTO GROWTH PARTNERS · ${todayLabel}`, {
      x: 0.8, y: H - 0.6, w: W - 1.6, h: 0.3, fontSize: 9,
      color: '6B6458', fontFace: 'Calibri'
    });

    // =========================================================
    // SLIDE 2 — AGENDA
    // =========================================================
    let s2 = pres.addSlide();
    s2.background = { color: PPTX_COLORS.bg };
    s2.addText('AGENDA', { x: 0.7, y: 0.5, w: 6, h: 0.4, fontSize: 12, charSpacing: 2, bold: true, color: PPTX_COLORS.goldDeep, fontFace: 'Calibri' });
    s2.addText('Estrutura desta análise. Foco exclusivo Brasil.', { x: 0.7, y: 0.9, w: 10, h: 0.5, fontSize: 22, bold: true, color: PPTX_COLORS.ink, fontFace: 'Cambria' });

    const agendaItems = [
      ['01', 'Big Numbers', `KPIs do período ${state.dateFrom.split('-').slice(1).reverse().join('/')} → ${state.dateTo.split('-').slice(1).reverse().join('/')}`],
      ['02', 'Resultados ' + state.prevMonthName.charAt(0).toUpperCase() + state.prevMonthName.slice(1) + ' × ' + state.currMonthName.charAt(0).toUpperCase() + state.currMonthName.slice(1), 'Comparativo mensal'],
      ['03', 'Otimizações Realizadas', 'O que identificamos e o impacto'],
      ['04', 'Análise de Campanhas', `Performance por campanha — ${periodLabel}`],
      ['05', 'Plano de Ação', 'Próximos passos']
    ];
    let ay = 1.8;
    agendaItems.forEach(([num, title, desc]) => {
      s2.addText(num, { x: 0.7, y: ay, w: 0.6, h: 0.5, fontSize: 18, bold: true, color: PPTX_COLORS.gold, fontFace: 'Cambria' });
      s2.addText(title, { x: 1.3, y: ay, w: 8, h: 0.4, fontSize: 16, bold: true, color: PPTX_COLORS.ink, fontFace: 'Calibri' });
      s2.addText(desc, { x: 1.3, y: ay + 0.38, w: 8, h: 0.35, fontSize: 11, color: PPTX_COLORS.inkSoft, fontFace: 'Calibri' });
      ay += 1.0;
    });
    addFooter(s2, false);

    // =========================================================
    // SLIDE 3 — DIVIDER 01 BIG NUMBERS
    // =========================================================
    addDividerSlide(pres, '01', 'Big Numbers', `Os números de ${periodLabel}.`,
      `${state.daysCount} dias · ${state.cur.conversions.toFixed(0)} conv. GA · CPL ${fmt$(state.cpl)} · CVR médio ${fmtPct(state.cvr)}`);

    // =========================================================
    // SLIDE 4 — 01 BIG NUMBERS (KPI cards)
    // =========================================================
    let s4 = pres.addSlide();
    s4.background = { color: PPTX_COLORS.bg };
    addSectionHeader(s4, '01 · BIG NUMBERS · ' + periodLabel, 'KPIs do período — conta Brasil completa',
      `${state.daysCount} dias de dados.\nComparativo mensal no capítulo seguinte.`);

    const kpis = [
      ['INVESTIMENTO', fmt$(state.cur.spend), `${periodLabel} · USD`, PPTX_COLORS.gold],
      ['CONVERSÕES GA', state.cur.conversions.toFixed(0), kpiSub(state.cur.conversions, state.pre.conversions, false), PPTX_COLORS.green],
      ['CPL MÉDIO', fmt$(state.cpl), `Meta $${CPL_GOAL} · ` + kpiSub(state.cpl, state.cplPrev, true, true), PPTX_COLORS.green],
      ['CVR MÉDIO', fmtPct(state.cvr), kpiSub(state.cvr, state.cvrPrev, false, true), PPTX_COLORS.green],
      ['IMPRESSÕES', fmtN(state.cur.impressions), kpiSub(state.cur.impressions, state.pre.impressions, false), PPTX_COLORS.ink],
      ['CLIQUES', fmtN(state.cur.clicks), kpiSub(state.cur.clicks, state.pre.clicks, false), PPTX_COLORS.ink],
      ['CPC MÉDIO', fmt$(state.cpc), kpiSub(state.cpc, state.cpcPrev, true, true), PPTX_COLORS.ink],
      ['CTR', fmtPct(state.ctr), kpiSub(state.ctr, state.ctrPrev, false, true), PPTX_COLORS.ink]
    ];
    drawKpiGrid(s4, kpis, 1.95);
    s4.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: 5.55, w: W - 1.4, h: 0.55, rectRadius: 0.06, fill: { color: PPTX_COLORS.greenSoft } });
    s4.addText('📊 Dados extraídos em tempo real do Google Ads via Windsor.ai (conta LATAM Brasil).', {
      x: 0.95, y: 5.55, w: W - 1.9, h: 0.55, fontSize: 11, color: '2F5740', fontFace: 'Calibri', valign: 'middle'
    });
    addFooter(s4, false);

    // =========================================================
    // SLIDE 5 — DIVIDER 02 COMPARATIVO
    // =========================================================
    addDividerSlide(pres, '02', 'Comparativo Mensal',
      `${capitalize(state.prevMonthName)} × ${capitalize(state.currMonthName)}.`,
      `Fechamento completo ${capitalize(state.prevMonthName)} · período parcial de ${capitalize(state.currMonthName)}`);

    // =========================================================
    // SLIDE 6 — 02 TABELA COMPARATIVA
    // =========================================================
    let s6 = pres.addSlide();
    s6.background = { color: PPTX_COLORS.bg };
    addSectionHeader(s6, `02 · COMPARATIVO ${state.prevMonthName.toUpperCase()} × ${state.currMonthName.toUpperCase()}`,
      `${capitalize(state.prevMonthName)} (completo) vs ${capitalize(state.currMonthName)} (parcial)`,
      `Comparativo do mês completo vs status atual.`);

    const tableRows = [
      [{ text: 'Métrica', options: headCell() }, { text: state.prevMonthName.toUpperCase(), options: headCell() }, { text: state.currMonthName.toUpperCase(), options: headCell() }, { text: 'Variação', options: headCell() }]
    ];
    state.compRows.forEach((r, i) => {
      let deltaText = '—', deltaColor = PPTX_COLORS.inkSoft;
      if (r.delta !== null && !isNaN(r.delta) && r.lowerBetter !== null) {
        const good = r.lowerBetter ? r.delta < 0 : r.delta > 0;
        deltaColor = good ? PPTX_COLORS.green : PPTX_COLORS.red;
        deltaText = (r.delta >= 0 ? '▲ +' : '▼ ') + Math.abs(r.delta).toFixed(0) + '%';
      }
      const fillColor = i % 2 === 0 ? PPTX_COLORS.bgWhite : 'FBF9F3';
      tableRows.push([
        { text: r.label, options: { fill: { color: fillColor }, color: PPTX_COLORS.ink, bold: true, fontSize: 12 } },
        { text: r.prev, options: { fill: { color: fillColor }, color: PPTX_COLORS.inkSoft, fontSize: 12 } },
        { text: r.curr, options: { fill: { color: fillColor }, color: PPTX_COLORS.ink, fontSize: 12 } },
        { text: deltaText, options: { fill: { color: fillColor }, color: deltaColor, bold: true, fontSize: 12 } }
      ]);
    });
    s6.addTable(tableRows, {
      x: 0.7, y: 1.85, w: W - 1.4, colW: [(W - 1.4) * 0.4, (W - 1.4) * 0.2, (W - 1.4) * 0.2, (W - 1.4) * 0.2],
      border: { pt: 0.5, color: PPTX_COLORS.line }, autoPage: false, rowH: 0.42
    });
    addFooter(s6, false);

    // =========================================================
    // SLIDE 7 — CPL Diário chart
    // =========================================================
    let s7 = pres.addSlide();
    s7.background = { color: PPTX_COLORS.bg };
    s7.addText('CPL Diário × Volume de Investimento', { x: 0.7, y: 0.55, w: 10, h: 0.5, fontSize: 22, bold: true, color: PPTX_COLORS.ink, fontFace: 'Cambria' });
    s7.addText(`${periodLabel} · Conta LATAM Brasil · Meta de CPL: $${CPL_GOAL}`, { x: 0.7, y: 1.05, w: 10, h: 0.35, fontSize: 11, color: PPTX_COLORS.inkSoft, fontFace: 'Calibri' });

    s7.addChart(pres.charts.BAR, [{ name: 'Investimento', labels: state.dLabels, values: state.dSpend }], {
      x: 0.7, y: 1.6, w: W - 1.4, h: 5,
      barDir: 'col', chartColors: [PPTX_COLORS.gold],
      chartArea: { fill: { color: PPTX_COLORS.bgWhite } },
      catAxisLabelColor: PPTX_COLORS.inkSoft, valAxisLabelColor: PPTX_COLORS.inkSoft,
      valGridLine: { color: PPTX_COLORS.line, size: 0.5 }, catGridLine: { style: 'none' },
      showLegend: false, catAxisLabelFontSize: 8
    });
    addFooter(s7, false);

    // =========================================================
    // SLIDE 8 — DIVIDER 04 CAMPANHAS
    // =========================================================
    addDividerSlide(pres, '04', 'Análise por Campanha', `Performance ${periodLabel}.`,
      `${state.camps.length} campanhas BR · ${fmt$(state.cur.spend)} investidos · ${state.cur.conversions.toFixed(1)} conv.`);

    // =========================================================
    // SLIDE 9 — TABELA DE CAMPANHAS
    // =========================================================
    let s9 = pres.addSlide();
    s9.background = { color: PPTX_COLORS.bg };
    addSectionHeader(s9, `04 · RESUMO POR CAMPANHA — ${periodLabel}`, 'Performance por campanha', 'Vermelho = atenção · Verde = destaque positivo.');

    const campHead = ['Campanha', 'Custo', 'Conv.', 'CPA', 'CTR', 'IS', 'IS Perda'].map(h => ({ text: h, options: headCell(9) }));
    const campTableRows = [campHead];
    state.camps.slice(0, 12).forEach((c, i) => {
      const cCPA = c.conversions > 0 ? c.spend / c.conversions : null;
      const cCTR = c.impressions > 0 ? c.clicks / c.impressions * 100 : null;
      const isShare = c.search_impression_share > 0 ? (c.search_impression_share <= 1 ? c.search_impression_share * 100 : c.search_impression_share) : null;
      const isLost = c.search_budget_lost_impression_share > 0 ? (c.search_budget_lost_impression_share <= 1 ? c.search_budget_lost_impression_share * 100 : c.search_budget_lost_impression_share) : null;
      const fillColor = i % 2 === 0 ? PPTX_COLORS.bgWhite : 'FBF9F3';
      const cpaColor = cCPA !== null && cCPA < 20 ? PPTX_COLORS.green : PPTX_COLORS.ink;
      const lostColor = isLost !== null && isLost >= 40 ? PPTX_COLORS.red : PPTX_COLORS.ink;
      campTableRows.push([
        { text: trunc(c.name, 32), options: { fill: { color: fillColor }, color: PPTX_COLORS.ink, bold: true, fontSize: 9 } },
        { text: fmt$(c.spend), options: { fill: { color: fillColor }, color: PPTX_COLORS.ink, fontSize: 9 } },
        { text: c.conversions.toFixed(1), options: { fill: { color: fillColor }, color: PPTX_COLORS.ink, fontSize: 9 } },
        { text: cCPA !== null ? fmt$(cCPA) : '—', options: { fill: { color: fillColor }, color: cpaColor, bold: true, fontSize: 9 } },
        { text: cCTR !== null ? fmtPct(cCTR) : '—', options: { fill: { color: fillColor }, color: PPTX_COLORS.ink, fontSize: 9 } },
        { text: isShare !== null ? isShare.toFixed(0) + '%' : '—', options: { fill: { color: fillColor }, color: PPTX_COLORS.ink, fontSize: 9 } },
        { text: isLost !== null ? isLost.toFixed(0) + '%' : '—', options: { fill: { color: fillColor }, color: lostColor, bold: true, fontSize: 9 } }
      ]);
    });
    s9.addTable(campTableRows, {
      x: 0.7, y: 1.85, w: W - 1.4, colW: [3.4, 1.4, 1.2, 1.2, 1.2, 1.0, 1.2],
      border: { pt: 0.5, color: PPTX_COLORS.line }, autoPage: false, rowH: 0.36
    });
    addFooter(s9, false);

    // =========================================================
    // SLIDE 10 — DIVIDER 03 OTIMIZAÇÕES
    // =========================================================
    addDividerSlide(pres, '03', 'Otimizações Identificadas', 'O que os dados mostram.',
      `${state.optimizations.length} ponto(s) de atenção identificados automaticamente`);

    // =========================================================
    // SLIDE 11 — 03 OTIMIZAÇÕES (cards)
    // =========================================================
    let s11 = pres.addSlide();
    s11.background = { color: PPTX_COLORS.bg };
    addSectionHeader(s11, '03 · OTIMIZAÇÕES IDENTIFICADAS', 'O que os dados mostram', 'Gerado automaticamente a partir da performance do período.');

    let oy = 1.9;
    const tagColors = { budget: PPTX_COLORS.green, keyword: PPTX_COLORS.goldDeep, channel: '3A6491' };
    state.optimizations.slice(0, 3).forEach(o => {
      s11.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: oy, w: W - 1.4, h: 1.35, rectRadius: 0.05, fill: { color: PPTX_COLORS.bgWhite }, shadow: shadow() });
      s11.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.95, y: oy + 0.2, w: 1.7, h: 0.4, rectRadius: 0.2, fill: { color: tagColors[o.tag] || PPTX_COLORS.green } });
      s11.addText(o.tagLabel, { x: 0.95, y: oy + 0.2, w: 1.7, h: 0.4, fontSize: 9, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: 'Calibri' });
      s11.addText(o.title, { x: 2.85, y: oy + 0.18, w: 6.8, h: 0.4, fontSize: 13.5, bold: true, color: PPTX_COLORS.ink, fontFace: 'Calibri' });
      s11.addText(o.desc, { x: 2.85, y: oy + 0.6, w: 6.8, h: 0.6, fontSize: 10.5, color: PPTX_COLORS.inkSoft, fontFace: 'Calibri' });
      if (o.impactVal) {
        s11.addText(o.impactLabel.toUpperCase(), { x: W - 2.7, y: oy + 0.25, w: 1.9, h: 0.3, fontSize: 8.5, color: PPTX_COLORS.inkSoft, align: 'right', fontFace: 'Calibri' });
        s11.addText(o.impactVal, { x: W - 2.7, y: oy + 0.55, w: 1.9, h: 0.5, fontSize: 18, bold: true, color: PPTX_COLORS.green, align: 'right', fontFace: 'Calibri' });
      }
      oy += 1.55;
    });
    addFooter(s11, false);

    // =========================================================
    // SLIDE 12 — DIVIDER 05 PLANO DE AÇÃO
    // =========================================================
    addDividerSlide(pres, '05', "What's next?", 'Próximos Passos.',
      `${state.actions.length} ação(ões) recomendadas com base na performance do período`);

    // =========================================================
    // SLIDE 13 — 05 PLANO DE AÇÃO (cards)
    // =========================================================
    let s13 = pres.addSlide();
    s13.background = { color: PPTX_COLORS.bg };
    addSectionHeader(s13, '05 · PLANO DE AÇÃO', 'Próximos passos recomendados', 'Priorização automática baseada em performance.');

    let py = 1.9;
    const prioColors = { high: PPTX_COLORS.red, medium: PPTX_COLORS.goldDeep, low: '5A6B7D' };
    const prioBg = { high: PPTX_COLORS.redSoft, medium: 'FBF3E2', low: 'EEF1F4' };
    state.actions.slice(0, 4).forEach(a => {
      s13.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.7, y: py, w: W - 1.4, h: 1.05, rectRadius: 0.05, fill: { color: PPTX_COLORS.bgWhite }, shadow: shadow() });
      s13.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.95, y: py + 0.18, w: 1.1, h: 0.32, rectRadius: 0.04, fill: { color: prioBg[a.priority] } });
      s13.addText(a.priorityLabel, { x: 0.95, y: py + 0.18, w: 1.1, h: 0.32, fontSize: 8.5, bold: true, color: prioColors[a.priority], align: 'center', valign: 'middle', fontFace: 'Calibri' });
      s13.addText(a.title, { x: 2.25, y: py + 0.12, w: W - 3.2, h: 0.4, fontSize: 13, bold: true, color: PPTX_COLORS.ink, fontFace: 'Calibri' });
      s13.addText(a.desc, { x: 2.25, y: py + 0.5, w: W - 3.2, h: 0.5, fontSize: 9.5, color: PPTX_COLORS.inkSoft, fontFace: 'Calibri' });
      py += 1.25;
    });
    addFooter(s13, false);

    // =========================================================
    // SLIDE 14 — FECHAMENTO
    // =========================================================
    let s14 = pres.addSlide();
    s14.background = { color: PPTX_COLORS.ink };
    s14.addText('MODESTO GROWTH PARTNERS', { x: 0.8, y: 1.6, w: W - 1.6, h: 0.4, fontSize: 13, charSpacing: 2, bold: true, color: PPTX_COLORS.gold, fontFace: 'Calibri' });
    s14.addText('Obrigado.', { x: 0.8, y: 2.0, w: W - 1.6, h: 1.0, fontSize: 44, bold: true, color: 'FFFFFF', fontFace: 'Cambria' });
    s14.addText(`Weekly ${formatWeeklyTag(state.dateTo)} · ${CLIENT_NAME}`, { x: 0.8, y: 3.0, w: W - 1.6, h: 0.4, fontSize: 14, color: '9C957F', fontFace: 'Calibri' });

    const closingStats = [
      [`${state.cur.conversions.toFixed(0)}`, 'Conversões GA', periodLabel],
      [fmt$(state.cpl), 'CPL', `vs ${fmt$(state.cplPrev)} anterior`],
      [fmtPct(state.ctr), 'CTR', `${capitalize(state.prevMonthName)}: ${fmtPct(state.ctrPrev)}`],
      [`${state.actions.length}`, 'Ações', 'Plano de otimização']
    ];
    let cx = 0.8;
    const cw = (W - 1.6 - 0.6) / 4;
    closingStats.forEach(([val, label, sub]) => {
      s14.addText(val, { x: cx, y: 4.0, w: cw, h: 0.6, fontSize: 30, bold: true, color: PPTX_COLORS.gold, fontFace: 'Cambria' });
      s14.addText(label, { x: cx, y: 4.65, w: cw, h: 0.3, fontSize: 12, bold: true, color: 'FFFFFF', fontFace: 'Calibri' });
      s14.addText(sub, { x: cx, y: 4.95, w: cw, h: 0.3, fontSize: 9.5, color: '9C957F', fontFace: 'Calibri' });
      cx += cw + 0.2;
    });
    s14.addText(`CONFIDENCIAL — USO INTERNO · MODESTO GROWTH PARTNERS · ${todayLabel}`, {
      x: 0.8, y: H - 0.6, w: W - 1.6, h: 0.3, fontSize: 9, color: '6B6458', fontFace: 'Calibri'
    });

    const fileName = `Weekly_${formatWeeklyTag(state.dateTo)}_${CLIENT_NAME.split(' ')[0]}_MGP.pptx`;
    await pres.writeFile({ fileName });

  } catch (err) {
    console.error(err);
    alert('Erro ao gerar a apresentação: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '⬇ Exportar Apresentação';
  }
}

// ============================================================
// HELPERS DE LAYOUT PPTX
// ============================================================
function addDividerSlide(pres, num, title, subtitle, stat) {
  const W = 13.3, H = 7.5;
  let s = pres.addSlide();
  s.background = { color: PPTX_COLORS.ink };
  s.addText(num, { x: 0.8, y: 2.6, w: 3, h: 1.5, fontSize: 90, bold: true, color: PPTX_COLORS.gold, fontFace: 'Cambria' });
  s.addText(title, { x: 0.8, y: 4.1, w: W - 1.6, h: 0.7, fontSize: 32, bold: true, color: 'FFFFFF', fontFace: 'Cambria' });
  s.addText(subtitle, { x: 0.8, y: 4.75, w: W - 1.6, h: 0.5, fontSize: 16, color: 'E8E2D4', fontFace: 'Cambria' });
  if (stat) s.addText(stat, { x: 0.8, y: 5.3, w: W - 1.6, h: 0.4, fontSize: 12, color: '9C957F', fontFace: 'Calibri' });
}

function addSectionHeader(slide, eyebrow, title, note) {
  const W = 13.3;
  slide.addText(eyebrow, { x: 0.7, y: 0.5, w: 8, h: 0.35, fontSize: 11, charSpacing: 1.5, bold: true, color: PPTX_COLORS.goldDeep, fontFace: 'Calibri' });
  slide.addText(title, { x: 0.7, y: 0.85, w: 8, h: 0.6, fontSize: 24, bold: true, color: PPTX_COLORS.ink, fontFace: 'Cambria' });
  if (note) slide.addText(note, { x: W - 5.2, y: 0.55, w: 4.5, h: 0.8, fontSize: 10.5, color: PPTX_COLORS.inkSoft, align: 'right', fontFace: 'Calibri' });
}

function drawKpiGrid(slide, kpis, startY) {
  const W = 13.3;
  const cols = 4, gap = 0.2;
  const cardW = (W - 1.4 - gap * (cols - 1)) / cols;
  const cardH = 1.55;
  kpis.forEach((kpi, i) => {
    const [label, value, sub, valueColor] = kpi;
    const col = i % cols, row = Math.floor(i / cols);
    const x = 0.7 + col * (cardW + gap);
    const y = startY + row * (cardH + gap);

    slide.addShape(pptxShapeRef.ROUNDED_RECTANGLE, {
      x, y, w: cardW, h: cardH, rectRadius: 0.06,
      fill: { color: PPTX_COLORS.bgWhite }, shadow: shadow()
    });
    slide.addText(label, {
      x: x + 0.18, y: y + 0.15, w: cardW - 0.36, h: 0.3,
      fontSize: 9, charSpacing: 0.5, color: PPTX_COLORS.inkSoft, fontFace: 'Calibri'
    });
    slide.addText(value, {
      x: x + 0.18, y: y + 0.45, w: cardW - 0.36, h: 0.55,
      fontSize: 24, bold: true, color: valueColor, fontFace: 'Cambria'
    });
    slide.addText(sub, {
      x: x + 0.18, y: y + 1.05, w: cardW - 0.36, h: 0.4,
      fontSize: 8.5, color: PPTX_COLORS.inkSoft, fontFace: 'Calibri'
    });
  });
}

function trunc(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : s; }
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function headCell(size = 10) { return { fill: { color: 'F4EFE4' }, color: PPTX_COLORS.inkSoft, bold: true, fontSize: size }; }
function formatWeeklyTag(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}`;
}
function kpiSub(curr, prev, lowerIsBetter, isPct) {
  if (curr === null || prev === null || !prev) return 'sem dado comparável';
  const ch = ((curr - prev) / prev) * 100;
  const sign = ch >= 0 ? '+' : '';
  return `${sign}${ch.toFixed(0)}% vs período anterior`;
}
