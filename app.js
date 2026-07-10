let ALL = [];
let chart = null;
const fmtInt = (n) => (n||0).toLocaleString('fr-FR', {maximumFractionDigits:0});
const fmtEur = (n) => (n||0).toLocaleString('fr-FR', {maximumFractionDigits:0}) + ' €';
const fmtPct = (n) => ((n||0)*100).toFixed(1) + ' %';

function waitGrist(cb){
  if (typeof grist !== 'undefined') return cb();
  setTimeout(() => waitGrist(cb), 100);
}

waitGrist(() => {
  grist.ready({ requiredAccess: 'full' });
  grist.onRecords((records) => {
    ALL = records.filter(r => r.Operation_Chapeau === 'O');
    console.log('Records reçus:', records.length, '| Chapeau O:', ALL.length);
    if (ALL[0]) console.log('Colonnes:', Object.keys(ALL[0]));
    buildFilters();
    refresh();
  });
});

function buildFilters() {
  const fields = {
    f_commune:'Commune', f_arr:'Arrondissement', f_zonage:'Zonage',
    f_typo:'Typologie', f_operateur:'Operateur',
    f_statut:'Statut_Operation', f_avanc:'Etat_Avancement'
  };
  for (const [id, col] of Object.entries(fields)) {
    const sel = document.getElementById(id);
    const first = sel.options[0].text;
    sel.innerHTML = `<option value="">${first}</option>`;
    const vals = [...new Set(ALL.map(r => r[col]).filter(v => v && v !== ''))].sort();
    vals.forEach(v => { const o=document.createElement('option'); o.value=v; o.text=v; sel.appendChild(o); });
    sel.onchange = refresh;
  }
  document.getElementById('reset').onclick = () => {
    document.querySelectorAll('#filters select').forEach(s => s.value = '');
    refresh();
  };
}

const v = (id) => document.getElementById(id).value;
const sum = (arr, key) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);

function filtered() {
  const f = {
    Commune:v('f_commune'), Arrondissement:v('f_arr'), Zonage:v('f_zonage'),
    Typologie:v('f_typo'), Operateur:v('f_operateur'),
    Statut_Operation:v('f_statut'), Etat_Avancement:v('f_avanc')
  };
  return ALL.filter(r => Object.entries(f).every(([k, val]) => !val || r[k] === val));
}

function refresh() {
  const rows = filtered();
  document.getElementById('nbOp').textContent = rows.length;

  const nbTot = sum(rows, 'Nb_Logts_Operation');
  const brsC  = sum(rows, 'Nb_Logts_BRS_Classique');
  const brsP  = sum(rows, 'Nb_Logts_BRS_Premium');
  const brsTot = sum(rows, 'Nb_Logts_BRS_Total');
  document.getElementById('nbTot').textContent = fmtInt(nbTot);
  document.getElementById('brsC').textContent  = fmtInt(brsC);
  document.getElementById('brsP').textContent  = fmtInt(brsP);
  document.getElementById('partBrs').textContent = fmtPct(nbTot ? brsTot/nbTot : 0);

  const brsA  = sum(rows.filter(r => r.Zonage === 'A'), 'Nb_Logts_BRS_Total');
  const brsB1 = sum(rows.filter(r => r.Zonage === 'B1'), 'Nb_Logts_BRS_Total');
  document.getElementById('brsA').textContent   = fmtInt(brsA);
  document.getElementById('brsB1').textContent  = fmtInt(brsB1);
  document.getElementById('brsTot').textContent = fmtInt(brsA + brsB1);

  const zA  = sum(rows.filter(r => r.Zonage === 'A'), 'Nb_Logts_Operation');
  const zB1 = sum(rows.filter(r => r.Zonage === 'B1'), 'Nb_Logts_Operation');
  document.getElementById('zA').textContent   = fmtInt(zA);
  document.getElementById('zB1').textContent  = fmtInt(zB1);
  document.getElementById('zTot').textContent = fmtInt(zA + zB1);

  document.getElementById('fp').textContent   = fmtEur(sum(rows, 'Engagement_Montant_FP'));
  document.getElementById('gaia').textContent = fmtEur(sum(rows, 'Engagement_Montant_GAIA'));
  document.getElementById('als').textContent  = fmtEur(sum(rows, 'Engagement_Montant_ALS'));
  document.getElementById('tfc').textContent  = fmtEur(sum(rows, 'Engagement_Montant_Total_TFC'));

  drawPie(zA, zB1);
}

function drawPie(zA, zB1) {
  if (typeof Chart === 'undefined') { setTimeout(() => drawPie(zA, zB1), 200); return; }
  const ctx = document.getElementById('pieZonage').getContext('2d');
  const data = {
    labels: ['A', 'B1'],
    datasets: [{ data: [zA, zB1], backgroundColor: ['#3b82f6', '#ff9500'], borderColor: '#1e1e1e', borderWidth: 2 }]
  };
  if (chart) { chart.data = data; chart.update(); return; }
  chart = new Chart(ctx, {
    type: 'pie', data,
    options: { plugins: { legend: { labels: { color: '#eaeaea' } } } }
  });
}
