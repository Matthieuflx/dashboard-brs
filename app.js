let ALL = [];
let chart = null;

// --- Formatage ---
const fmtInt = (n) => (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const fmtEur = (n) => (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
const fmtPct = (n) => ((n || 0) * 100).toFixed(1) + ' %';

// --- Utilitaires DOM ---
const $ = (id) => document.getElementById(id);
const setStatus = (msg) => { $('status').textContent = msg; };
const v = (id) => $(id).value;
const sum = (arr, key) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);

// --- Mapping des colonnes Grist ---
// ⚠️ Ces noms doivent correspondre EXACTEMENT aux Column IDs dans ta table Grist
const COLS = {
  commune:      'Commune',
  arrondissement: 'Arrondissement',
  zonage:       'Zonage',
  typologie:    'Typologie',
  operateur:    'Operateur',
  statut:       'Statut_Operation',
  avancement:   'Etat_Avancement',
  nbTot:        'Nb_logts_Total',
  nbBrs:        'Nb_logts_BRS',
  brsClass:     'Nb_BRS_classique',
  brsPrem:      'Nb_BRS_premium',
  fp:           'Montant_FP',
  gaia:         'Montant_pret_GAIA',
  als:          'Montant_pret_ALS',
  tfc:          'Montant_total_acquisition_TFC'
};

// --- Initialisation Grist ---
setStatus('Connexion à Grist…');
grist.ready({
  requiredAccess: 'read table',
  columns: Object.values(COLS).map(id => ({ name: id, optional: true }))
});

grist.onRecords((records, mappings) => {
  ALL = records || [];
  setStatus(`✅ ${ALL.length} enregistrement(s) chargé(s) depuis Grist`);
  buildFilters();
  refresh();
});

// --- Construction des filtres ---
function buildFilters() {
  const fields = {
    f_commune:   COLS.commune,
    f_arr:       COLS.arrondissement,
    f_zonage:    COLS.zonage,
    f_typo:      COLS.typologie,
    f_operateur: COLS.operateur,
    f_statut:    COLS.statut,
    f_avanc:     COLS.avancement
  };

  for (const [id, col] of Object.entries(fields)) {
    const sel = $(id);
    if (!sel) continue;
    const label = sel.options[0]?.text || col;
    sel.innerHTML = `<option value="">${label}</option>`;
    const vals = [...new Set(
      ALL.map(r => r[col])
         .filter(x => x !== null && x !== undefined && x !== '')
    )].sort();
    vals.forEach(val => {
      const o = document.createElement('option');
      o.value = val;
      o.text = val;
      sel.appendChild(o);
    });
    sel.onchange = refresh;
  }

  $('reset').onclick = () => {
    document.querySelectorAll('#filters select').forEach(s => s.value = '');
    refresh();
  };
}

// --- Filtrage ---
function filtered() {
  const f = {
    [COLS.commune]:       v('f_commune'),
    [COLS.arrondissement]: v('f_arr'),
    [COLS.zonage]:        v('f_zonage'),
    [COLS.typologie]:     v('f_typo'),
    [COLS.operateur]:     v('f_operateur'),
    [COLS.statut]:        v('f_statut'),
    [COLS.avancement]:    v('f_avanc')
  };
  return ALL.filter(r =>
    Object.entries(f).every(([k, val]) => !val || r[k] === val)
  );
}

// --- Rafraîchissement complet ---
function refresh() {
  const rows = filtered();

  // Compteur bas de barre
  $('rowCount').textContent = `${rows.length} ligne(s)`;

  // KPI principal
  $('nbOp').textContent = rows.length;

  // Logements
  const nbTot = sum(rows, COLS.nbTot);
  const brsC  = sum(rows, COLS.brsClass);
  const brsP  = sum(rows, COLS.brsPrem);
  const brsTotal = sum(rows, COLS.nbBrs);

  $('nbTot').textContent  = fmtInt(nbTot);
  $('brsC').textContent   = fmtInt(brsC);
  $('brsP').textContent   = fmtInt(brsP);
  $('partBrs').textContent = fmtPct(nbTot ? brsTotal / nbTot : 0);

  // BRS par zone
  const brsA  = sum(rows.filter(r => r[COLS.zonage] === 'A'),  COLS.nbBrs);
  const brsB1 = sum(rows.filter(r => r[COLS.zonage] === 'B1'), COLS.nbBrs);
  $('brsA').textContent   = fmtInt(brsA);
  $('brsB1').textContent  = fmtInt(brsB1);
  $('brsTot').textContent = fmtInt(brsA + brsB1);

  // Logements par zone
  const zA  = sum(rows.filter(r => r[COLS.zonage] === 'A'),  COLS.nbTot);
  const zB1 = sum(rows.filter(r => r[COLS.zonage] === 'B1'), COLS.nbTot);
  $('zA').textContent   = fmtInt(zA);
  $('zB1').textContent  = fmtInt(zB1);
  $('zTot').textContent = fmtInt(zA + zB1);

  // Engagements €
  $('fp').textContent   = fmtEur(sum(rows, COLS.fp));
  $('gaia').textContent = fmtEur(sum(rows, COLS.gaia));
  $('als').textContent  = fmtEur(sum(rows, COLS.als));
  $('tfc').textContent  = fmtEur(sum(rows, COLS.tfc));

  // Camembert
  drawPie(zA, zB1);
}

// --- Graphique zonage ---
function drawPie(zA, zB1) {
  const canvas = $('pieZonage');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  const data = {
    labels: ['Zone A', 'Zone B1'],
    datasets: [{
      data: [zA, zB1],
      backgroundColor: ['#3b82f6', '#ff9500'],
      borderColor: '#1e1e1e',
      borderWidth: 2
    }]
  };
  if (chart) {
    chart.data = data;
    chart.update();
    return;
  }
  chart = new Chart(ctx, {
    type: 'pie',
    data,
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#eaeaea' } },
        tooltip: {
          callbacks: {
            label: (c) => {
              const total = zA + zB1;
              const pct = total ? ((c.parsed / total) * 100).toFixed(1) : 0;
              return `${c.label}: ${fmtInt(c.parsed)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}
