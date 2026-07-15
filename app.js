let ALL = [];
let chart = null;

// --- Formatage ---
const fmtInt = (n) => (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const fmtEur = (n) => (n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' \u20AC';
const fmtPct = (n) => ((n || 0) * 100).toFixed(1) + ' %';

const $ = (id) => document.getElementById(id);
const setStatus = (msg) => { const s = $('status'); if (s) s.textContent = msg; console.log('[BRS]', msg); };
const v = (id) => $(id).value;
const sum = (arr, key) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);

// --- Mapping colonnes Grist ---
// --- Mapping colonnes Grist ---
const COLS = {
  commune:        'Commune',
  arrondissement: 'Arrondissement',
  zonage:         'Zonage',
  typologie:      'Typologie',
  operateur:      'Operateur',
  statut:         'Statut_Operation',
  avancement:     'Etat_Avancement',
  nbTot:          'Nb_Logts_Operation',
  nbBrs:          'Nb_Logts_BRS_Total',
  brsClass:       'Nb_Logts_BRS_Classique',
  brsPrem:        'Nb_Logts_BRS_Premium',
  fp:             'Engagement_Montant_FP',
  gaia:           'Engagement_Montant_GAIA',
  als:            'Engagement_Montant_ALS',
  tfc:            'Engagement_Montant_Total_TFC'
};

// --- DIAGNOSTIC INIT ---
setStatus('Etape 1/4 : verification API Grist...');

if (typeof grist === 'undefined') {
  setStatus('ERREUR : API Grist non trouvee. Ouvre ce widget DANS Grist via une vue Custom, pas directement dans le navigateur.');
} else {
  setStatus('Etape 2/4 : API Grist detectee, appel de grist.ready()...');

  try {
    grist.ready({
      requiredAccess: 'full',
      onEditOptions: () => {}
    });
    setStatus('Etape 3/4 : grist.ready() OK, en attente des donnees...');
  } catch (e) {
    setStatus('ERREUR grist.ready : ' + e.message);
  }

  // Callback principal : donnees de la table
  grist.onRecords((records, mappings) => {
    if (!records || records.length === 0) {
      setStatus('AVERTISSEMENT : Grist a repondu mais 0 enregistrement. La table est-elle vide ou un filtre est-il actif ?');
      ALL = [];
    } else {
      ALL = records;
      const firstRow = records[0];
      const availableCols = Object.keys(firstRow).join(', ');
      setStatus('Etape 4/4 OK : ' + records.length + ' lignes chargees. Colonnes recues : ' + availableCols);
      console.log('[BRS] Exemple de ligne :', firstRow);
    }
    buildFilters();
    refresh();
  });

  // Fallback : si onRecords ne se declenche jamais, on essaie fetchSelectedTable apres 3s
  setTimeout(() => {
    if (ALL.length === 0) {
      setStatus('Aucune donnee recue apres 3s. Verifie Access Level = Full document access dans le widget Grist.');
    }
  }, 3000);
}

// --- Filtres ---
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
    const label = sel.options[0] ? sel.options[0].text : col;
    sel.innerHTML = '<option value="">' + label + '</option>';
    const vals = [...new Set(ALL.map(r => r[col]).filter(x => x !== null && x !== undefined && x !== ''))].sort();
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

function filtered() {
  const f = {
    [COLS.commune]:        v('f_commune'),
    [COLS.arrondissement]: v('f_arr'),
    [COLS.zonage]:         v('f_zonage'),
    [COLS.typologie]:      v('f_typo'),
    [COLS.operateur]:      v('f_operateur'),
    [COLS.statut]:         v('f_statut'),
    [COLS.avancement]:     v('f_avanc')
  };
  return ALL.filter(r =>
    Object.entries(f).every(([k, val]) => !val || r[k] === val)
  );
}

function refresh() {
  const rows = filtered();
  $('rowCount').textContent = rows.length + ' ligne(s)';
  $('nbOp').textContent = rows.length;

  const nbTot = sum(rows, COLS.nbTot);
  const brsC  = sum(rows, COLS.brsClass);
  const brsP  = sum(rows, COLS.brsPrem);
  const brsTotal = sum(rows, COLS.nbBrs);

  $('nbTot').textContent   = fmtInt(nbTot);
  $('brsC').textContent    = fmtInt(brsC);
  $('brsP').textContent    = fmtInt(brsP);
  $('partBrs').textContent = fmtPct(nbTot ? brsTotal / nbTot : 0);

  const brsA  = sum(rows.filter(r => r[COLS.zonage] === 'A'),  COLS.nbBrs);
  const brsB1 = sum(rows.filter(r => r[COLS.zonage] === 'B1'), COLS.nbBrs);
  $('brsA').textContent   = fmtInt(brsA);
  $('brsB1').textContent  = fmtInt(brsB1);
  $('brsTot').textContent = fmtInt(brsA + brsB1);

  const zA  = sum(rows.filter(r => r[COLS.zonage] === 'A'),  COLS.nbTot);
  const zB1 = sum(rows.filter(r => r[COLS.zonage] === 'B1'), COLS.nbTot);
  $('zA').textContent   = fmtInt(zA);
  $('zB1').textContent  = fmtInt(zB1);
  $('zTot').textContent = fmtInt(zA + zB1);

  $('fp').textContent   = fmtEur(sum(rows, COLS.fp));
  $('gaia').textContent = fmtEur(sum(rows, COLS.gaia));
  $('als').textContent  = fmtEur(sum(rows, COLS.als));
  $('tfc').textContent  = fmtEur(sum(rows, COLS.tfc));

  drawPie(zA, zB1);
}

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
  if (chart) { chart.data = data; chart.update(); return; }
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
              return c.label + ': ' + fmtInt(c.parsed) + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  });
}
