// Motor de conversión de tasas (RF-04, RF-04b).
// Funciones puras: sin DOM, sin red, sin dependencias de src/ui.
// Algoritmo fuente de verdad: docs/architecture/calculation-flow.md §1.
//
// Todas las tasas que entran y salen de este módulo son fracciones decimales
// (0.0184 == 1,84 %). La conversión de porcentaje a fracción es responsabilidad
// de la UI (ver architecture-blueprint.md §2, columna "No hace").

export const FRECUENCIAS = {
  12: 'mensual',
  6: 'bimestral',
  4: 'trimestral',
  2: 'semestral',
  1: 'anual',
};

const TIPOS_VALIDOS = new Set(['efectiva', 'nominal']);
const MODALIDADES_VALIDAS = new Set(['vencida', 'anticipada']);

/**
 * Valida la forma de una tasa (origen o destino) y lanza RangeError con
 * mensaje en español si algo no cumple el modelo de §1.1.
 */
function validarTasa({ valor, tipo, m, modalidad }, { requiereValor } = { requiereValor: true }) {
  if (requiereValor) {
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
      throw new RangeError('El valor de la tasa debe ser un número positivo y finito.');
    }
  }
  if (!TIPOS_VALIDOS.has(tipo)) {
    throw new RangeError(`El tipo de tasa debe ser "efectiva" o "nominal" (recibido: ${tipo}).`);
  }
  if (!Object.prototype.hasOwnProperty.call(FRECUENCIAS, m)) {
    throw new RangeError(`La frecuencia m debe ser una de 12, 6, 4, 2 o 1 (recibido: ${m}).`);
  }
  if (!MODALIDADES_VALIDAS.has(modalidad)) {
    throw new RangeError(`La modalidad debe ser "vencida" o "anticipada" (recibido: ${modalidad}).`);
  }
}

/**
 * Convierte una tasa periódica vencida `i` a su equivalente efectiva anual (EA).
 * EA = (1 + i)^m - 1
 */
function periodicaVencidaAEA(i, m) {
  return (1 + i) ** m - 1;
}

/**
 * Convierte la tasa EA a la tasa periódica vencida `i'` de frecuencia m'.
 * i' = (1 + EA)^(1/m') - 1
 */
function eaAPeriodicaVencida(ea, m) {
  return (1 + ea) ** (1 / m) - 1;
}

/**
 * tasaEfectivaAnual: dado un objeto tasa (mismo shape que `origen` de
 * convertirTasa), devuelve la EA como fracción decimal.
 * Es un atajo sobre el mismo pivote que usa convertirTasa (§1.2).
 */
export function tasaEfectivaAnual({ valor, tipo, m, modalidad }) {
  validarTasa({ valor, tipo, m, modalidad });

  const periodica = tipo === 'nominal' ? valor / m : valor;

  // Validación de anticipada: la tasa periódica descuento debe ser < 1,
  // porque si no 1 - d <= 0 y la conversión a vencida diverge (§1.2 nota de validación).
  if (modalidad === 'anticipada' && periodica >= 1) {
    throw new RangeError('La tasa periódica anticipada debe ser menor a 100 % para poder convertirla a vencida.');
  }

  const i = modalidad === 'anticipada' ? periodica / (1 - periodica) : periodica;
  return periodicaVencidaAEA(i, m);
}

/**
 * convertirTasa: cualquier tasa origen -> EA (pivote) -> cualquier tasa destino.
 * Sigue exactamente el flowchart de calculation-flow.md §1.2.
 *
 * @param {{valor:number, tipo:'efectiva'|'nominal', m:number, modalidad:'vencida'|'anticipada'}} origen
 * @param {{tipo:'efectiva'|'nominal', m:number, modalidad:'vencida'|'anticipada'}} destino
 * @returns {{valor:number, ea:number, pasos:Array<{descripcion:string, formula:string, resultado:number}>}}
 */
export function convertirTasa(origen, destino) {
  const { valor, tipo, m, modalidad } = origen;
  validarTasa({ valor, tipo, m, modalidad });
  validarTasa({ tipo: destino.tipo, m: destino.m, modalidad: destino.modalidad }, { requiereValor: false });

  const pasos = [];

  // --- Origen: nominal -> periódica ---
  let periodica;
  if (tipo === 'nominal') {
    periodica = valor / m;
    pasos.push({
      descripcion: 'Nominal → periódica (origen)',
      formula: 'tasa periódica = valor / m',
      resultado: periodica,
    });
  } else {
    periodica = valor;
  }

  // --- Origen: anticipada -> vencida ---
  let i;
  if (modalidad === 'anticipada') {
    if (periodica >= 1) {
      throw new RangeError('La tasa periódica anticipada debe ser menor a 100 % para poder convertirla a vencida.');
    }
    i = periodica / (1 - periodica);
    pasos.push({
      descripcion: 'Anticipada → vencida (origen)',
      formula: 'i = d / (1 − d)',
      resultado: i,
    });
  } else {
    i = periodica;
  }

  // --- Pivote: EA ---
  const ea = periodicaVencidaAEA(i, m);
  pasos.push({
    descripcion: 'Tasa periódica vencida → EA (pivote)',
    formula: 'EA = (1 + i)^m − 1',
    resultado: ea,
  });

  // --- Destino: EA -> periódica vencida ---
  const iDestino = eaAPeriodicaVencida(ea, destino.m);
  pasos.push({
    descripcion: 'EA → periódica vencida (destino)',
    formula: "i' = (1 + EA)^(1/m') − 1",
    resultado: iDestino,
  });

  // --- Destino: vencida -> anticipada si aplica ---
  let dDestino;
  if (destino.modalidad === 'anticipada') {
    dDestino = iDestino / (1 + iDestino);
    pasos.push({
      descripcion: 'Vencida → anticipada (destino)',
      formula: "d' = i' / (1 + i')",
      resultado: dDestino,
    });
  } else {
    dDestino = iDestino;
  }

  // --- Destino: periódica -> nominal si aplica ---
  let resultado;
  if (destino.tipo === 'nominal') {
    resultado = dDestino * destino.m;
    pasos.push({
      descripcion: 'Periódica → nominal (destino)',
      formula: "resultado = d' × m'",
      resultado,
    });
  } else {
    resultado = dDestino;
  }

  return { valor: resultado, ea, pasos };
}
