/**
 * LME Parser
 * Transforma el payload crudo del XML/JSON de SUSESO a un modelo de trabajo
 * normalizado para el scoring de fraude.
 */

export function parseLME(rawLME) {
  const zA = rawLME.zona_A;
  const zC = rawLME.zona_C;

  return {
    id: rawLME.zona_0.id_licencia,
    beneficiary: {
      rut: zA.trabajador.rut,
      name: zA.trabajador.nombres
    },
    doctor: {
      rut: zA.profesional.rut,
      name: zA.profesional.nombres,
      specialty: zA.profesional.prof_especialidad,
      type_code: zA.profesional.codigo_tipo_profesional
    },
    diagnosis: {
      code: zA.diagnostico_principal,
      desc: zA.diagnostico_desc,
      type: getDiagnosisCategory(zA.diagnostico_principal)
    },
    days: zA.tra_ndias,
    lmeType: zA.codigo_tipo_licencia,
    
    // Financial Data
    currentWage: zC.monto_imponible_mes_anterior || 0,
    historicalWages: zC.remuneraciones_historicas || [],
    previousLicensesLast6Months: zC.lma_nlicencias || 0,
    
    // Original payload link
    raw: rawLME
  };
}

function getDiagnosisCategory(code) {
  if (code.startsWith('F')) return 'Mental';
  if (code.startsWith('M')) return 'Musculoesqueletico';
  if (code.startsWith('J')) return 'Respiratorio';
  if (code.startsWith('K')) return 'Dental';
  return 'Otros';
}

export function parseBulk(dataset) {
  return dataset.map(parseLME);
}
