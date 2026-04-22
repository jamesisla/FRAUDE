/**
 * LME JSON Generator
 * Simula el payload de integración de la Licencia Médica Electrónica (Estándar SUSESO)
 */

const DIAGNOSTICOS = [
  { code: 'F41.1', desc: 'Trastorno de ansiedad generalizada', tipo: 'Mental' },
  { code: 'F32.9', desc: 'Episodio depresivo', tipo: 'Mental' },
  { code: 'M54.5', desc: 'Lumbago no especificado', tipo: 'Musculoesqueletico' },
  { code: 'J06.9', desc: 'Infección aguda respiratoria', tipo: 'Respiratorio' },
  { code: 'K04.0', desc: 'Pulpitis, Caries severa', tipo: 'Dental' }
];

const MEDICOS = [
  { rut: '12456789-0', nombres: 'Alejandro Silva', especialidad: 'Medicina General', tipo_prof: 1, perfil: 'Normal' },
  { rut: '15654321-K', nombres: 'Beatriz Luna', especialidad: 'Psiquiatría', tipo_prof: 1, perfil: 'Normal' },
  { rut: '9876543-2', nombres: 'Carlos Mendez', especialidad: 'Medicina General', tipo_prof: 1, perfil: 'Hiperemisor' },
  { rut: '11222333-4', nombres: 'Daniel Toro', especialidad: 'Odontología', tipo_prof: 2, perfil: 'Fraudulento_Especialidad' },
  { rut: '13555777-9', nombres: 'Elena Paz', especialidad: 'Psiquiatría', tipo_prof: 1, perfil: 'Baja_Entropia' }
];

const BENEFICIARIOS = Array.from({ length: 50 }, (_, i) => ({
  rut: `${15000000 + i}-${i % 10}`,
  nombres: `Trabajador ${i}`,
  perfil: i < 5 ? 'Fraude_Sueldo' : (i < 10 ? 'Reincidente' : 'Normal')
}));

function generateLMEPayload(id) {
  const doc = MEDICOS[Math.floor(Math.random() * MEDICOS.length)];
  const ben = BENEFICIARIOS[Math.floor(Math.random() * BENEFICIARIOS.length)];
  
  // Select Diagnosis based on Doctor Profile
  let diag = DIAGNOSTICOS[Math.floor(Math.random() * DIAGNOSTICOS.length)];
  if (doc.perfil === 'Fraudulento_Especialidad') {
    // Odontologist giving Mental Health licenses (High alert)
    diag = DIAGNOSTICOS.find(d => d.tipo === 'Mental');
  } else if (doc.especialidad === 'Psiquiatría') {
    diag = DIAGNOSTICOS.find(d => d.tipo === 'Mental');
  }

  // Days granted
  let ndias;
  if (doc.perfil === 'Baja_Entropia' || doc.perfil === 'Hiperemisor') {
    ndias = Math.random() > 0.5 ? 15 : 30; // Suspiciously round numbers
  } else {
    // Normal pseudo-Benford distribution
    const r = Math.random();
    if (r < 0.4) ndias = Math.floor(Math.random() * 3) + 1;
    else if (r < 0.7) ndias = Math.floor(Math.random() * 4) + 4;
    else if (r < 0.9) ndias = Math.floor(Math.random() * 4) + 8;
    else ndias = Math.floor(Math.random() * 20) + 12;
  }

  // Zona C - Empleador y Rentas
  let sueldoBase = 500000 + (Math.random() * 500000);
  let sueldoMesAnterior = sueldoBase;
  
  if (ben.perfil === 'Fraude_Sueldo') {
    // Simulate artificial wage inflation right before license
    sueldoBase = 450000;
    sueldoMesAnterior = 2500000; 
  }

  const historico_remuneraciones = [
    sueldoBase, 
    sueldoBase, 
    sueldoBase 
  ];

  const lma_nlicencias = ben.perfil === 'Reincidente' ? Math.floor(Math.random() * 4) + 3 : (Math.random() > 0.8 ? 1 : 0);

  return {
    zona_0: {
      id_licencia: `LME-${100000 + id}`,
      estado: 1 // Emitida
    },
    zona_A: {
      trabajador: { rut: ben.rut, nombres: ben.nombres },
      profesional: { 
        rut: doc.rut, 
        nombres: doc.nombres, 
        prof_especialidad: doc.especialidad,
        codigo_tipo_profesional: doc.tipo_prof
      },
      tra_ndias: ndias,
      codigo_tipo_licencia: 1, // 1: Enfermedad Comun
      diagnostico_principal: diag.code,
      diagnostico_desc: diag.desc,
      fecha_inicio_reposo: new Date().toISOString()
    },
    zona_C: {
      emp_rut: `77777777-K`,
      monto_imponible_mes_anterior: Math.round(sueldoMesAnterior),
      remuneraciones_historicas: historico_remuneraciones.map(Math.round),
      lma_nlicencias: lma_nlicencias
    }
  };
}

export function generateLMEDataset(count = 150) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push(generateLMEPayload(i));
  }
  return data;
}
