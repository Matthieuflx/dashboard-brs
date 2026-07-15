let ALL = [];
let chart = null;

const fmtInt = (n) =>
  (Number(n) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const fmtEur = (n) =>
  (Number(n) || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';

const fmtPct = (n) =>
  ((Number(n) || 0) * 100).toFixed(1).replace('.', ',') + ' %';

const num = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  return Number(String(v).replace(/\s/g, '').replace(',', '.')) || 0;
};

const val = (id) => document.getElementById(id).value;

const sum = (rows, key) =>
  rows.reduce((acc, r) => acc + num(r[key]), 0);

const isChapeau = (r) =>
  String(r.Operation_Chapeau || '').trim().toUpperCase() === 'O';

grist.ready({ requiredAccess: 'read table' });

grist.onRecords((records) => {
  ALL = Array.isArray(records) ? records : [];
  buildFilters();
  refresh();
});

function buildFilters() {
  const fields = {
    f_commune: 'Commune',
    f_arr: 'Arrondissement',
    f_zonage: 'Zonage',
    f_typo: 'Typologie',
    f_operateur: 'Operateur',
    f_statut: 'Statut_Operation',
    f_avanc: 'Etat_Avancement'
  };

  for (const [id, col] of Object.entries(fields)) {
    const select = document.getElementById(id);
    const currentValue = select.value;
    const firstLabel = select.options[0]?.text || col;

    select.innerHTML = `<option value="">${firstLabel}</option>`;

    const values = [...new Set(
      ALL
        .map(r => r[col])
        .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
        .map(v => String(v).trim())
    )].sort((a, b) => a.localeCompare(b, 'fr'));

    values.forEach(v => {
      const option = document.createElement('option');
      option.value = v;
      option.textContent = v;
      select.appendChild(option);
    });

    if (values.includes(currentValue)) {
      select.value = currentValue;
    }

    select.onchange = refresh;
  }

  document.getElementById('reset').onclick = () => {
    document.querySelectorAll('#filters select').forEach(s => s.value = '');
    refresh();
  };
}

function filtered() {
  const f = {
    Commune: val('f_commune'),
    Arrondissement: val('f_arr'),
    Zonage: val('f_zonage'),
    Typologie: val('f_typo'),
    Operateur: val('f_operateur'),
    Statut_Operation: val('f_statut'),
    Etat_Avancement: val('f_avanc')
  };

  return ALL
    .filter(isChapeau)
    .filter(r =>
      Object.entries(f).every(([key, selected]) => {
        if (!selected) return true;
        return String(r[key] || '').trim() === selected;
      })
    );
}

function refresh() {
  const rows = filtered();

  const nbOp = rows.length;

  const nbLogtsTotal = sum(rows, 'Nb_Logts_Operation');
  const brsTotal = sum(rows, 'Nb_Logts_BRS_Total');
  const brsClassique = sum(rows, 'Nb_Logts_BRS_Classique');
  const brsPremium = sum(rows, 'Nb_Logts_BRS_Premium');

  const brsA = sum(rows.filter(r => r.Zonage === 'A'), 'Nb_Logts_BRS_Total');
  const brsB1 = sum(rows.filter(r => r.Zonage === 'B1'), 'Nb_Logts_BRS_Total');

  const opEngagees = rows.filter(r => r.Statut_Operation === 'Engagée').length;
  const opDesengagees = rows.filter(r => r.Statut_Operation === 'Désengagée').length;
  const opProspects = rows.filter(r => r.Statut_Operation === 'Prospect').length;

  const fp = sum(rows.filter(r => r.Statut_Operation === 'Engagée'), 'Engagement_Montant_FP');
  const gaia = sum(rows.filter(r => r.Statut_Operation === 'Engagée'), 'Engagement_Montant_GAIA');
  const als = sum(rows.filter(r => r.Statut_Operation === 'Engagée'), 'Engagement_Montant_ALS');
  const tfc = sum(rows.filter(r => r.Statut_Operation === 'Engagée'), 'Engagement_Montant_Total_TFC');

  document.getElementById('nbOp').textContent = fmtInt(nbOp);
  document.getElementById('nbTot').textContent = fmtInt(nbLogtsTotal);
  document.getElementById('brsTot').textContent = fmtInt(brsTotal);
  document.getElementById('partBrs').textContent = fmtPct(nbLogtsTotal ? brsTotal / nbLogtsTotal : 0);

  document.getElementById('brsC').textContent = fmtInt(brsClassique);
  document.getElementById('brsP').textContent = fmtInt(brsPremium);
  document.getElementById('brsA').textContent = fmtInt(brsA);
  document.getElementById('brsB1').textContent = fmtInt(brsB1);

  document.getElementById('opEng').textContent = fmtInt(opEngagees);
  document.getElementById('opDes').textContent = fmtInt(opDesengagees);
  document.getElementById('opPro').textContent = fmtInt(opProspects);

  document.getElementById('fp').textContent = fmtEur(fp);
  document.getElementById('gaia').textContent = fmtEur(gaia);
  document.getElementById('als').textContent = fmtEur(als);
  document.getElementById('tfc').textContent = fmtEur(tfc);

  drawPie(brsA, brsB1);
  drawTable(rows);
}

function drawPie(brsA, brsB1) {
  const canvas = document.getElementById('pieZonage');
  if (!canvas || typeof Chart === 'undefined') return;

  const total = brsA + brsB1;
  const data = {
    labels: ['Zone A', 'Zone B1'],
    datasets: [{
      data: [brsA, brsB1],
      backgroundColor: ['#2563eb', '#f59e0b'],
      borderColor: '#ffffff',
      borderWidth: 2
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#e5e7eb' }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.parsed || 0;
            const pct = total ? ((value / total) * 100).toFixed(1).replace('.', ',') : '0,0';
            return `${ctx.label}: ${fmtInt(value)} logements BRS (${pct} %)`;
          }
        }
      }
    }
  };

  if (chart) {
    chart.data = data;
    chart.options = options;
    chart.update();
    return;
  }

  chart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data,
    options
  });
}

function drawTable(rows) {
  const container = document.getElementById('tableOps');

  const sorted = [...rows]
    .sort((a, b) => num(b.Nb_Logts_BRS_Total) - num(a.Nb_Logts_BRS_Total))
    .slice(0, 8);

  if (!sorted.length) {
    container.innerHTML = `<p class="empty">Aucune opération ne correspond aux filtres.</p>`;
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Opération</th>
          <th>Commune</th>
          <th>Statut</th>
          <th>Zonage</th>
          <th>BRS</th>
          <th>Total logts</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(r => `
          <tr>
            <td>${escapeHtml(r.Nom_Commercial || r.N_Operation || '')}</td>
            <td>${escapeHtml(r.Commune || '')}</td>
            <td><span class="status">${escapeHtml(r.Statut_Operation || '')}</span></td>
            <td>${escapeHtml(r.Zonage || '')}</td>
            <td>${fmtInt(r.Nb_Logts_BRS_Total)}</td>
            <td>${fmtInt(r.Nb_Logts_Operation)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
