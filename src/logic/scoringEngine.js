/**
 * Statistical Scoring Engine para LME (Estándar SUSESO)
 */

const BENFORD_EXPECTED_1ST = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

function getFirstDigit(n) {
  if (!n) return 0;
  return Number(String(n)[0]);
}

function calculateEntropy(durations) {
  if (durations.length === 0) return 0;
  const counts = {};
  durations.forEach(d => counts[d] = (counts[d] || 0) + 1);
  const probs = Object.values(counts).map(c => c / durations.length);
  return -probs.reduce((sum, p) => sum + p * Math.log2(p), 0);
}

function calculateBenfordAnomaly(values) {
  if (values.length < 5) return 0.5;
  const digits = values.map(v => getFirstDigit(v)).filter(d => d > 0);
  const observed = new Array(9).fill(0);
  digits.forEach(d => observed[d - 1]++);
  
  const observedProbs = observed.map(c => c / digits.length);
  let mad = 0;
  for (let i = 0; i < 9; i++) {
    mad += Math.abs(observedProbs[i] - BENFORD_EXPECTED_1ST[i]);
  }
  return Math.min(mad / 0.1, 1);
}

/**
 * Nueva Regla: Inflación de Sueldo (Zona C)
 * Retorna 1 si el sueldo subió bruscamente justo antes de la licencia.
 */
function calculateWageInflationBonus(license) {
  if (license.historicalWages.length === 0) return 0;
  const avgHist = license.historicalWages.reduce((a, b) => a + b, 0) / license.historicalWages.length;
  // If current reported wage is 80% higher than historical average, it's very suspicious
  if (avgHist > 0 && license.currentWage > avgHist * 1.8) return 1.0; 
  return 0;
}

/**
 * Nueva Regla: Incompatibilidad de Especialidad (Zona A)
 */
function calculateSpecialtyMismatchBonus(license) {
  // Example: Dentist (tipo 2) prescribing Mental Health or Trauma
  if (license.doctor.type_code === 2 && license.diagnosis.type === 'Mental') return 1.0;
  if (license.doctor.specialty !== 'Psiquiatría' && license.diagnosis.type === 'Mental' && license.days > 15) return 0.6; // General medic giving long mental rests
  return 0;
}

export function processLicenses(parsedLicenses) {
  const docData = {};
  parsedLicenses.forEach(l => {
    if (!docData[l.doctor.rut]) {
      docData[l.doctor.rut] = { count: 0, durations: [] };
    }
    docData[l.doctor.rut].count++;
    docData[l.doctor.rut].durations.push(l.days);
  });

  const volumes = Object.values(docData).map(d => d.count).sort((a, b) => b - a);
  const maxVol = volumes[0] || 1;

  Object.keys(docData).forEach(rut => {
    const d = docData[rut];
    d.entropy = calculateEntropy(d.durations);
    d.benford = calculateBenfordAnomaly(d.durations);
    d.volScore = d.count / maxVol;
    
    // Base score applied to the physician
    const entropyRisk = d.entropy < 1.5 ? (1.5 - d.entropy) / 1.5 : 0;
    d.baseRiskScore = (d.benford * 0.2 + entropyRisk * 0.3 + d.volScore * 0.2) * 100;
  });

  return parsedLicenses.map(l => {
    // Physician Level Risk
    let riskScore = docData[l.doctor.rut].baseRiskScore;
    
    // Beneficiary Level Risk (Zona C - Reincidencia)
    const recurrenceRisk = l.previousLicensesLast6Months > 2 ? 20 : 0;
    
    // Custom Frauds
    const wageRisk = calculateWageInflationBonus(l) * 30; // Up to 30 extra points
    const specRisk = calculateSpecialtyMismatchBonus(l) * 40; // Up to 40 extra points

    riskScore = riskScore + recurrenceRisk + wageRisk + specRisk;
    
    return {
      ...l,
      riskScore: Math.min(Math.round(riskScore), 100),
      analysis: {
        physician_benford: docData[l.doctor.rut].benford,
        physician_entropy: docData[l.doctor.rut].entropy,
        physician_volume: docData[l.doctor.rut].volScore,
        wage_anomaly: wageRisk > 0,
        specialty_mismatch: specRisk > 0,
        recurrence_alert: recurrenceRisk > 0
      }
    };
  });
}
