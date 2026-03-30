// ── Tabela ANP ────────────────────────────────────────────────────────────
const CLASSES = {
  'I':        { max: 40,    kg: 'até 520 kg',         label: 'Classe I',        info: 'Capacidade de até 520 kg de GLP. Estoque máximo de 40 botijões P-13. Ideal para pequenos pontos de venda.' },
  'II':       { max: 120,   kg: 'até 1.560 kg',       label: 'Classe II',       info: 'Capacidade de até 1.560 kg de GLP. Estoque máximo de 120 botijões P-13.' },
  'III':      { max: 480,   kg: 'até 6.240 kg',       label: 'Classe III',      info: 'Capacidade de até 6.240 kg de GLP. Estoque máximo de 480 botijões P-13.' },
  'IV':       { max: 960,   kg: 'até 12.480 kg',      label: 'Classe IV',       info: 'Capacidade de até 12.480 kg de GLP. Estoque máximo de 960 botijões P-13.' },
  'V':        { max: 1920,  kg: 'até 24.960 kg',      label: 'Classe V',        info: 'Capacidade de até 24.960 kg de GLP. Estoque máximo de 1.920 botijões P-13.' },
  'VI':       { max: 3840,  kg: 'até 49.920 kg',      label: 'Classe VI',       info: 'Capacidade de até 49.920 kg de GLP. Estoque máximo de 3.840 botijões P-13.' },
  'VII':      { max: 7680,  kg: 'até 99.840 kg',      label: 'Classe VII',      info: 'Capacidade de até 99.840 kg de GLP. Estoque máximo de 7.680 botijões P-13.' },
  'Especial': { max: 99999, kg: 'acima de 99.840 kg', label: 'Classe Especial', info: 'Capacidade acima de 99.840 kg de GLP. Mais de 7.680 botijões P-13. Grandes distribuidoras.' },
};

// ── Formatação de moeda ───────────────────────────────────────────────────
function mascaraMoeda(el) {
  let v = el.value.replace(/\D/g, '');
  if (!v) { el.value = ''; return; }
  v = (parseInt(v) / 100).toFixed(2);
  el.value = v.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function mascaraMoedaBlur(el) {
  let v = el.value.replace(/\D/g, '');
  if (!v) { el.value = '0,00'; return; }
  v = (parseInt(v) / 100).toFixed(2);
  el.value = v.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseVal(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return parseFloat((el.value || '0').replace(/\./g, '').replace(',', '.')) || 0;
}

function fmtR(n) {
  return 'R$ ' + Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtN(n, d) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
}

// ── Classe ANP ────────────────────────────────────────────────────────────
function atualizarClasse() {
  const sel = document.getElementById('classe').value;

  // Destacar linha da tabela
  document.querySelectorAll('#anp_table tr[data-classe]').forEach(r => {
    r.classList.toggle('selected', r.dataset.classe === sel);
  });

  const wrap = document.getElementById('classe_badge_wrap');
  const info = document.getElementById('classe_info');
  const display = document.getElementById('estoque_max_display');

  if (!sel) {
    wrap.innerHTML = '';
    info.style.display = 'none';
    display.value = '';
    return;
  }

  const c = CLASSES[sel];
  const maxTxt = sel === 'Especial' ? 'Mais de 7.680' : fmtN(c.max, 0);
  display.value = maxTxt + ' botijões';
  wrap.innerHTML = `<span class="classe-badge">${c.label} — máx. ${maxTxt} botijões P-13</span>`;
  info.style.display = 'block';
  document.getElementById('classe_info_txt').textContent = c.info;

  const hint = document.getElementById('est_limite_hint');
  const maxEl = document.getElementById('est_max_qtd');
  if (hint) hint.textContent = `Máximo permitido: ${maxTxt} botijões`;
  if (maxEl) maxEl.value = maxTxt + ' botijões';

  calcularEstoque();
}

// ── Estoque inicial ───────────────────────────────────────────────────────
function calcularEstoque() {
  const sel = document.getElementById('classe').value;
  const qtdEl = document.getElementById('est_qtd');
  const qtd = parseInt(qtdEl.value) || 0;
  const custo = parseVal('est_custo_unit');
  const wrap = document.getElementById('est_total_wrap');

  if (!sel || !qtd || !custo) { wrap.style.display = 'none'; atualizarInvestimento(); return; }

  const max = CLASSES[sel].max;
  if (sel !== 'Especial' && qtd > max) qtdEl.value = max;
  const qtdFinal = sel !== 'Especial' ? Math.min(qtd, max) : qtd;

  document.getElementById('est_valor_display').textContent = fmtR(qtdFinal * custo);
  wrap.style.display = 'flex';
  atualizarInvestimento();
}

// ── Sincronizar custo de compra → custo variável ──────────────────────────
function sincronizarCustoCompra() {
  const val = document.getElementById('est_custo_unit').value;
  document.getElementById('cv_produto').value = val;
  calcularEstoque();
  atualizarReceita();
}

// ── Imposto Simples Nacional ──────────────────────────────────────────────
function calcularImposto(recMensal) {
  const anual = recMensal * 12;
  let aliquota;
  if      (anual <= 180000)  aliquota = 0.040;
  else if (anual <= 360000)  aliquota = 0.073;
  else if (anual <= 720000)  aliquota = 0.095;
  else if (anual <= 1800000) aliquota = 0.107;
  else                        aliquota = 0.143;
  return { aliquota, valor: recMensal * aliquota };
}

// ── Atualizar investimento ────────────────────────────────────────────────
function atualizarInvestimento() {
  const itens = parseVal('inv_reforma') + parseVal('inv_taxas') + parseVal('inv_equip') +
                parseVal('inv_veiculo') + parseVal('inv_escritorio') + parseVal('inv_mkt') +
                parseVal('inv_giro');

  const sel = document.getElementById('classe').value;
  const qtd = parseInt(document.getElementById('est_qtd').value) || 0;
  const custo = parseVal('est_custo_unit');
  const max = sel ? CLASSES[sel].max : 0;
  const qtdFinal = (sel && sel !== 'Especial') ? Math.min(qtd, max) : qtd;
  const estoque = qtdFinal * custo;

  const subtotal = itens + estoque;
  const outros = subtotal * 0.03;
  const total = subtotal + outros;

  document.getElementById('inv_outros').value = outros.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('total_inv_display').textContent = fmtR(total);
  return total;
}

// ── Encargos ──────────────────────────────────────────────────────────────
function atualizarEncargos() {
  const sal = parseVal('cf_salarios');
  document.getElementById('cf_encargos').value = (sal * 0.35).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  atualizarCF();
}

// ── Custos fixos ──────────────────────────────────────────────────────────
function atualizarCF() {
  const enc = parseFloat((document.getElementById('cf_encargos').value || '0').replace(/\./g, '').replace(',', '.')) || 0;
  const total = parseVal('cf_aluguel') + parseVal('cf_salarios') + enc +
                parseVal('cf_util') + parseVal('cf_comb') + parseVal('cf_sistema') + parseVal('cf_outros');
  document.getElementById('total_cf_display').textContent = fmtR(total);
  return total;
}

// ── Receita ───────────────────────────────────────────────────────────────
function atualizarReceita() {
  const vol = parseInt(document.getElementById('volume').value) || 0;
  const preco = parseVal('preco');
  const recB = vol * preco;

  document.getElementById('rec_bruta_display').textContent = fmtR(recB);
  document.getElementById('imp_receita_ref').value = fmtR(recB);

  const imp = calcularImposto(recB);
  document.getElementById('imp_aliquota_display').value = fmtN(imp.aliquota * 100, 1) + '%';
  document.getElementById('imp_valor_display').value = fmtR(imp.valor);

  const anual = recB * 12;
  let faixa;
  if      (anual <= 180000)  faixa = 'Faixa 1 — até R$ 180k/ano (4,0%)';
  else if (anual <= 360000)  faixa = 'Faixa 2 — até R$ 360k/ano (7,3%)';
  else if (anual <= 720000)  faixa = 'Faixa 3 — até R$ 720k/ano (9,5%)';
  else if (anual <= 1800000) faixa = 'Faixa 4 — até R$ 1,8M/ano (10,7%)';
  else                        faixa = 'Faixa 5 — acima de R$ 1,8M/ano (14,3%)';
  document.getElementById('imp_info').textContent = 'Simples Nacional — ' + faixa;
  return recB;
}

// ── Navegação ─────────────────────────────────────────────────────────────
function goTo(n) {
  document.querySelectorAll('.section').forEach((s, i) => s.classList.toggle('active', i === n));
  document.querySelectorAll('.step-btn').forEach((b, i) => {
    b.classList.toggle('active', i === n);
    i < n ? b.classList.add('done') : b.classList.remove('done');
  });

  if (n === 1) {
    const sel = document.getElementById('classe').value;
    document.getElementById('aviso_classe').style.display = sel ? 'none' : 'block';
    if (sel) {
      const max = CLASSES[sel].max;
      const maxTxt = sel === 'Especial' ? 'Mais de 7.680' : fmtN(max, 0);
      document.getElementById('est_max_qtd').value = maxTxt + ' botijões';
    }
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  atualizarInvestimento();
  atualizarEncargos();
  atualizarReceita();
}

// ── Novo estudo ───────────────────────────────────────────────────────────
function novoEstudo() {
  if (!confirm('Deseja iniciar um novo estudo? Os dados atuais serão perdidos.')) return;
  document.querySelectorAll('input[type="text"], input[type="number"]').forEach(el => {
    if (!el.classList.contains('calc-field') && !el.classList.contains('linked-field')) el.value = '';
  });
  document.getElementById('classe').value = '';
  document.getElementById('uf').value = 'SP';
  document.getElementById('status_estudo').value = 'Em análise';
  document.getElementById('data_estudo').value = new Date().toISOString().split('T')[0];
  document.getElementById('cv_produto').value = '';
  document.getElementById('est_total_wrap').style.display = 'none';
  document.getElementById('classe_badge_wrap').innerHTML = '';
  document.getElementById('classe_info').style.display = 'none';
  document.getElementById('estoque_max_display').value = '';
  document.querySelectorAll('#anp_table tr[data-classe]').forEach(r => r.classList.remove('selected'));
  atualizarInvestimento();
  atualizarEncargos();
  atualizarReceita();
  if (chartCenarios) { chartCenarios.destroy(); chartCenarios = null; }
  if (chartFluxo)    { chartFluxo.destroy();    chartFluxo    = null; }
  goTo(0);
}

// ── Cálculo de cenário ────────────────────────────────────────────────────
function calcCenario(multVol) {
  const vol = (parseInt(document.getElementById('volume').value) || 0) * multVol;
  const preco = parseVal('preco');
  const recB = vol * preco;
  const cvUnit = parseVal('cv_produto') + parseVal('cv_frete');
  const cv = cvUnit * vol + calcularImposto(recB).valor;
  const enc = parseFloat((document.getElementById('cf_encargos').value || '0').replace(/\./g, '').replace(',', '.')) || 0;
  const cf = parseVal('cf_aluguel') + parseVal('cf_salarios') + enc +
             parseVal('cf_util') + parseVal('cf_comb') + parseVal('cf_sistema') + parseVal('cf_outros');
  const mc = recB - cv;
  const lucro = mc - cf;
  const inv = atualizarInvestimento();
  const payback = lucro > 0 ? inv / lucro : 9999;
  const mcPct = recB > 0 ? mc / recB : 0;
  const breakevenVol = mcPct > 0 && preco > 0 ? (cf / mcPct) / preco : 0;
  const roiAnual = inv > 0 ? (lucro * 12) / inv : 0;
  return { vol, recB, cv, cf, mc, mcPct, lucro, payback, breakevenVol, roiAnual, inv };
}

// ── Fluxo de caixa 12 meses ───────────────────────────────────────────────
function calcularFluxo() {
  const inv = atualizarInvestimento();
  const rampas = [0.45, 0.60, 0.75];
  const cresc = 0.015;
  let acc = -inv;
  const meses = [], caixaAcc = [];

  for (let i = 1; i <= 12; i++) {
    const mult = i <= 3 ? rampas[i - 1] : rampas[2] * Math.pow(1 + cresc, i - 3);
    const vol = (parseInt(document.getElementById('volume').value) || 0) * mult;
    const preco = parseVal('preco');
    const recB = vol * preco;
    const cvUnit = parseVal('cv_produto') + parseVal('cv_frete');
    const cv = cvUnit * vol + calcularImposto(recB).valor;
    const enc = parseFloat((document.getElementById('cf_encargos').value || '0').replace(/\./g, '').replace(',', '.')) || 0;
    const cf = parseVal('cf_aluguel') + parseVal('cf_salarios') + enc +
               parseVal('cf_util') + parseVal('cf_comb') + parseVal('cf_sistema') + parseVal('cf_outros');
    acc += recB - cv - cf;
    meses.push('M' + i);
    caixaAcc.push(Math.round(acc));
  }
  return { meses, caixaAcc };
}

// ── Status ────────────────────────────────────────────────────────────────
function statusOp(p) {
  if (p <= 6)  return { texto: 'Muito atrativa',   cls: 'muito-atrativa' };
  if (p <= 12) return { texto: 'Atrativa',          cls: 'atrativa' };
  if (p <= 18) return { texto: 'Moderada',          cls: 'moderada' };
  return        { texto: 'Baixa atratividade',      cls: 'baixa' };
}

// ── Gráficos ──────────────────────────────────────────────────────────────
let chartCenarios = null, chartFluxo = null;

function renderCharts(base, con, oti, fluxo) {
  if (chartCenarios) chartCenarios.destroy();
  if (chartFluxo)    chartFluxo.destroy();

  chartCenarios = new Chart(document.getElementById('chartCenarios'), {
    type: 'bar',
    data: {
      labels: ['Conservador', 'Base', 'Otimista'],
      datasets: [{
        data: [Math.round(con.lucro), Math.round(base.lucro), Math.round(oti.lucro)],
        backgroundColor: ['#9FE1CB', '#1D9E75', '#5DCAA5'],
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 12 } } },
        y: {
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { font: { size: 11 }, callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k' }
        }
      }
    }
  });

  chartFluxo = new Chart(document.getElementById('chartFluxo'), {
    type: 'bar',
    data: {
      labels: fluxo.meses,
      datasets: [{
        data: fluxo.caixaAcc,
        backgroundColor: fluxo.caixaAcc.map(v => v >= 0 ? 'rgba(29,158,117,0.25)' : 'rgba(204,0,0,0.18)'),
        borderColor:      fluxo.caixaAcc.map(v => v >= 0 ? '#1D9E75' : '#CC0000'),
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false, maxRotation: 0 } },
        y: {
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { font: { size: 11 }, callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k' }
        }
      }
    }
  });
}

// ── Calcular resultado ────────────────────────────────────────────────────
function calcular() {
  const base   = calcCenario(1);
  const con    = calcCenario(0.8);
  const oti    = calcCenario(1.15);
  const fluxo  = calcularFluxo();
  const status = statusOp(base.payback);

  // KPIs principais
  document.getElementById('r_inv').textContent       = fmtR(base.inv);
  document.getElementById('r_lucro').textContent     = fmtR(base.lucro);
  document.getElementById('r_payback').textContent   = fmtN(base.payback, 1) + ' meses';
  document.getElementById('r_breakeven').textContent = fmtN(base.breakevenVol, 0) + ' un/mês';
  document.getElementById('r_receita').textContent   = fmtR(base.recB);
  document.getElementById('r_margem').textContent    = fmtR(base.mc);
  document.getElementById('r_margem_pct').textContent = fmtN(base.mcPct * 100, 1) + '%';
  document.getElementById('r_roi').textContent       = fmtN(base.roiAnual * 100, 0) + '%';

  // Status badge
  const sb = document.getElementById('status_badge');
  sb.className = 'status-badge ' + status.cls;
  document.getElementById('status_text').textContent = status.texto;

  // Cenários
  [[con, 'con'], [base, 'base'], [oti, 'oti']].forEach(([d, k]) => {
    document.getElementById(`c_${k}_lucro`).textContent   = fmtR(d.lucro);
    document.getElementById(`c_${k}_payback`).textContent = fmtN(d.payback, 1) + ' meses';
    if (k !== 'base') {
      const el = document.getElementById(`c_${k}_status`);
      el.textContent  = d.payback <= 18 ? '✓ Dentro da meta' : '✗ Acima da meta';
      el.style.color  = d.payback <= 18 ? '#0F6E56' : '#A32D2D';
    }
  });

  // Recomendação
  document.getElementById('recomendacao_texto').textContent =
    status.cls === 'muito-atrativa' ? 'Avançar com prioridade alta: premissas sustentam retorno curto e excelente atratividade.' :
    status.cls === 'atrativa'       ? 'Avançar com a proposta: viabilidade confirmada, retorno dentro da meta comercial.' :
    status.cls === 'moderada'       ? 'Analisar com atenção: viabilidade moderada. Verificar premissas de volume e custos.' :
                                      'Revisar premissas antes de avançar: payback acima da meta. Avaliar redução de custos ou aumento de volume.';

  renderCharts(base, con, oti, fluxo);
  goTo(4);
}

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('data_estudo').value = new Date().toISOString().split('T')[0];
  atualizarInvestimento();
  atualizarEncargos();
  atualizarReceita();
});

// ── Service Worker (PWA offline) ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
