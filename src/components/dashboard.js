import { generateLMEDataset } from '../utils/dataGenerator.js';
import { parseBulk } from '../logic/lmeParser.js';
import { processLicenses } from '../logic/scoringEngine.js';

const elements = {
  statTotal: document.getElementById('stat-total'),
  statSafe: document.getElementById('stat-safe'),
  statReview: document.getElementById('stat-review'),
  statFraud: document.getElementById('stat-fraud'),
  listSafe: document.getElementById('list-safe'),
  listReview: document.getElementById('list-review'),
  listFraud: document.getElementById('list-fraud'),
  refreshBtn: document.getElementById('refresh-btn'),
  lastUpdate: document.getElementById('last-update'),
  backdrop: document.getElementById('backdrop'),
  modalClose: document.getElementById('modal-close'),
  modalId: document.getElementById('modal-id'),
  modalContent: document.getElementById('modal-content')
};

function renderLicenseCard(license) {
  const card = document.createElement('div');
  card.className = 'license-card';
  
  let scoreClass = 'score-low';
  if (license.riskScore > 30) scoreClass = 'score-mid';
  if (license.riskScore > 70) scoreClass = 'score-high';

  card.innerHTML = `
    <div class="card-top">
      <span class="card-id">${license.id}</span>
      <span class="card-score ${scoreClass}">${license.riskScore}% Riesgo</span>
    </div>
    <div class="card-body">
      <p><strong>Paciente:</strong> ${license.beneficiary.name}</p>
      <p><strong>Médico:</strong> ${license.doctor.name} (${license.doctor.specialty})</p>
      <p><strong>&lt;tra_ndias&gt;:</strong> ${license.days} | <strong>Diag:</strong> ${license.diagnosis.code}</p>
    </div>
  `;

  card.onclick = () => showDetail(license);
  return card;
}

function showDetail(license) {
  elements.modalId.innerText = license.id + ' (Estándar SUSESO)';
  
  let fraudAlertsHTML = '';
  if (license.analysis.wage_anomaly) {
    fraudAlertsHTML += '<p style="color: var(--accent-danger)">🚩 <strong>Fraude Sueldo:</strong> Discrepancia masiva entre &lt;monto_imponible_mes_anterior&gt; y el histórico. Posible colusión empleador.</p>';
  }
  if (license.analysis.recurrence_alert) {
    fraudAlertsHTML += `<p style="color: var(--accent-danger)">🚩 <strong>Reincidencia:</strong> El tag &lt;lma_nlicencias&gt; indica ${license.previousLicensesLast6Months} licencias previas.</p>`;
  }
  if (license.analysis.specialty_mismatch) {
    fraudAlertsHTML += '<p style="color: var(--accent-danger)">🚩 <strong>Incompatibilidad:</strong> El &lt;codigo_tipo_profesional&gt; no coincide con el tipo de diagnóstico otorgado.</p>';
  }

  elements.modalContent.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
      <div>
        <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem;">ZONAS LME (A y C)</h4>
        <p><strong>RUT Paciente:</strong> ${license.beneficiary.rut}</p>
        <p><strong>RUT Profesional:</strong> ${license.doctor.rut}</p>
        <p><strong>&lt;prof_especialidad&gt;:</strong> ${license.doctor.specialty}</p>
        <p><strong>&lt;diagnostico_principal&gt;:</strong> ${license.diagnosis.code}</p>
        <p><strong>&lt;monto_imponible...&gt;:</strong> $${license.currentWage.toLocaleString()}</p>
      </div>
      <div>
        <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem;">SCORE ESTADÍSTICO</h4>
        <p><strong>Benford (&lt;tra_ndias&gt;):</strong> ${(license.analysis.physician_benford * 100).toFixed(1)}% Desv.</p>
        <p><strong>Entropía Shannon:</strong> ${license.analysis.physician_entropy.toFixed(2)}</p>
        <p><strong>Volumen Médico (Zipf):</strong> ${(license.analysis.physician_volume * 100).toFixed(1)}% Max</p>
      </div>
    </div>
    <div style="margin-top: 1.5rem; padding: 1rem; border-radius: 8px; background: rgba(255,255,255,0.05);">
       <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem;">DETECTORES ESPECÍFICOS DE FRAUDE</h4>
       ${fraudAlertsHTML || '<p style="color: var(--accent-safe)">✅ Sin alertas específicas de cruce de datos.</p>'}
       <hr style="margin: 0.5rem 0; border: none; border-top: 1px solid var(--border-glass);">
       <p><strong>Score Total: ${license.riskScore}% </strong> - ${license.riskScore > 70 ? 'Bloqueo y Auditoría.' : license.riskScore > 30 ? 'Revisión Administrativa.' : 'Pase Automático.'}</p>
    </div>
    <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center;">
        <button onclick="alert('Licencia APROBADA exitosamente.'); document.getElementById('backdrop').style.display='none';" style="background: var(--accent-safe); color: white; border: none; padding: 0.5rem 1.5rem; border-radius: 6px; font-weight: bold; cursor: pointer;">Aprobar</button>
        <button onclick="alert('Enviada a REVISIÓN administrativa.'); document.getElementById('backdrop').style.display='none';" style="background: var(--accent-warning); color: white; border: none; padding: 0.5rem 1.5rem; border-radius: 6px; font-weight: bold; cursor: pointer;">Revisión</button>
        <button onclick="alert('Licencia RECHAZADA. Se levantará informe.'); document.getElementById('backdrop').style.display='none';" style="background: var(--accent-danger); color: white; border: none; padding: 0.5rem 1.5rem; border-radius: 6px; font-weight: bold; cursor: pointer;">Rechazar</button>
    </div>
    <div style="margin-top: 1.5rem; text-align: center;">
        <button onclick="const jv = document.getElementById('json-view'); jv.style.display = jv.style.display === 'none' ? 'block' : 'none';" style="background: transparent; border: 1px solid var(--text-secondary); color: var(--text-secondary); padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.7rem; cursor: pointer;">Ver/Ocultar Payload JSON Oficial (SUSESO)</button>
    </div>
    <pre id="json-view" style="display: none; background: #000; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.75rem; color: #a78bfa; margin-top: 1rem; text-align: left; border: 1px solid var(--border-glass);">${JSON.stringify(license.raw, null, 2)}</pre>
  `;
  elements.backdrop.style.display = 'flex';
}

function updateDashboard() {
  const rawLmeData = generateLMEDataset(200); // Generate 200 raw payloads
  const normalizedData = parseBulk(rawLmeData); 
  const processedData = processLicenses(normalizedData);

  // Clear lists
  elements.listSafe.innerHTML = '';
  elements.listReview.innerHTML = '';
  elements.listFraud.innerHTML = '';

  let safeCount = 0, reviewCount = 0, fraudCount = 0;

  processedData.forEach(l => {
    const card = renderLicenseCard(l);
    if (l.riskScore <= 30) {
      elements.listSafe.appendChild(card);
      safeCount++;
    } else if (l.riskScore <= 70) {
      elements.listReview.appendChild(card);
      reviewCount++;
    } else {
      elements.listFraud.appendChild(card);
      fraudCount++;
    }
  });

  // Update stats
  elements.statTotal.innerText = processedData.length;
  elements.statSafe.innerText = safeCount;
  elements.statReview.innerText = reviewCount;
  elements.statFraud.innerText = fraudCount;
  elements.lastUpdate.innerText = `Actualizado: ${new Date().toLocaleTimeString()}`;
}

// Events
elements.refreshBtn.onclick = updateDashboard;
elements.modalClose.onclick = () => elements.backdrop.style.display = 'none';
window.onclick = (e) => { if (e.target === elements.backdrop) elements.backdrop.style.display = 'none'; };

// Init
updateDashboard();
