// Motor de tabla de amortización con abonos a capital (RF-05 a RF-11).
// Funciones puras: sin DOM, sin red, sin dependencias de src/ui.
// Algoritmo fuente de verdad: docs/architecture/calculation-flow.md §2.
//
// Decisión §3.1: precisión completa internamente, sin redondeo en ningún
// punto del motor. El redondeo a pesos es responsabilidad exclusiva de la UI.
// Decisión §3.2: máximo un abono por mes.

// Tolerancia para comparaciones de "saldo en cero" por acumulación de error
// de punto flotante tras muchas restas sucesivas (§2.2, nodo "¿saldo > 0?").
const EPS = 1e-6;

// Tolerancia en pesos para considerar que un abono "coincide" con el saldo
// pendiente (calculation-flow.md §2.3: "abono igual al saldo"). Por encima de
// este margen se trata como abono mayor al saldo (error de validación).
const TOLERANCIA_ABONO_IGUAL_SALDO = 1;

/**
 * Cuota fija del sistema francés. Con tasa 0 (caso límite), la cuota es un
 * simple reparto lineal del monto entre las n cuotas.
 */
export function cuotaFija(monto, tasaMensual, n) {
  if (tasaMensual === 0) {
    return monto / n;
  }
  return (monto * tasaMensual) / (1 - (1 + tasaMensual) ** -n);
}

/**
 * Valida los parámetros base del crédito (no los abonos, que se validan
 * aparte porque sus errores no detienen la simulación, §2.2 nodo ERR).
 */
function validarParametrosBase({ monto, tasaMensual, plazo }) {
  if (typeof monto !== 'number' || !Number.isFinite(monto) || monto <= 0) {
    throw new RangeError('El monto del crédito debe ser un número positivo y finito.');
  }
  if (typeof tasaMensual !== 'number' || !Number.isFinite(tasaMensual) || tasaMensual < 0) {
    throw new RangeError('La tasa mensual debe ser un número finito mayor o igual a 0.');
  }
  if (!Number.isInteger(plazo) || plazo < 1 || plazo > 600) {
    throw new RangeError('El plazo debe ser un número entero de meses entre 1 y 600.');
  }
}

/**
 * Valida la lista de abonos de entrada y separa:
 * - `aplicables`: un Map mes -> abono (a lo más uno por mes, el primero
 *   registrado en el arreglo original cuando hay duplicados, §3.2).
 * - `errores`: errores de validación estructural, reportados con el índice
 *   original del abono en el arreglo de entrada (RF-10).
 */
function validarAbonos(abonos, plazo) {
  const errores = [];
  const estructuralmenteValidos = [];

  abonos.forEach((abono, indice) => {
    const { mes, monto, modo } = abono ?? {};

    if (!Number.isInteger(mes) || mes < 1 || mes > plazo) {
      errores.push({
        indice,
        mes,
        mensaje: `El mes del abono debe ser un entero entre 1 y ${plazo} (recibido: ${mes}).`,
      });
      return;
    }
    if (typeof monto !== 'number' || !Number.isFinite(monto) || monto <= 0) {
      errores.push({
        indice,
        mes,
        mensaje: 'El monto del abono debe ser un número positivo y finito.',
      });
      return;
    }
    if (modo !== 'reducir_cuota' && modo !== 'reducir_plazo') {
      errores.push({
        indice,
        mes,
        mensaje: `El modo del abono debe ser "reducir_cuota" o "reducir_plazo" (recibido: ${modo}).`,
      });
      return;
    }

    estructuralmenteValidos.push({ indice, mes, monto, modo });
  });

  // Agrupar por mes para aplicar la decisión §3.2: máximo un abono por mes.
  // El primero en el arreglo original (orden de entrada, no de mes) gana;
  // los demás del mismo mes quedan como error.
  const porMes = new Map();
  for (const item of estructuralmenteValidos) {
    if (!porMes.has(item.mes)) porMes.set(item.mes, []);
    porMes.get(item.mes).push(item);
  }

  const aplicables = new Map();
  for (const [mes, items] of porMes) {
    const [primero, ...duplicados] = items;
    aplicables.set(mes, primero);
    for (const dup of duplicados) {
      errores.push({
        indice: dup.indice,
        mes,
        mensaje: `Ya existe un abono registrado en el mes ${mes}; solo se permite un abono por mes (decisión §3.2).`,
      });
    }
  }

  return { aplicables, errores };
}

/**
 * simularCredito: implementa exactamente el flowchart de calculation-flow.md
 * §2.2. Arrastra saldo, cuota vigente, restantes y k; aplica como máximo un
 * abono por mes, después de la cuota ordinaria, 100 % a capital.
 */
export function simularCredito({ monto, tasaMensual, plazo, abonos = [] }) {
  validarParametrosBase({ monto, tasaMensual, plazo });

  const { aplicables, errores } = validarAbonos(abonos, plazo);

  const filas = [];
  const eventos = [];

  let saldo = monto;
  let cuota = cuotaFija(monto, tasaMensual, plazo);
  let restantes = plazo;
  let k = 0;
  const cuotaInicial = cuota;

  // Guarda de seguridad: el algoritmo converge en `plazo` + (a lo más)
  // unos pocos meses extra por "reducir_cuota" sucesivos; un tope generoso
  // evita un bucle infinito si una combinación de abonos produjera un estado
  // inconsistente (no se espera en operación normal).
  const TOPE_ITERACIONES = plazo + abonos.length + 1000;

  while (saldo > EPS && k < TOPE_ITERACIONES) {
    k += 1;
    const saldoInicial = saldo;
    const interes = saldo * tasaMensual;

    // Última cuota: por conteo de restantes o porque saldo+interés ya no
    // alcanza para una cuota completa más (§2.2, nodo R). `esResidual` solo
    // es true cuando esa última cuota resulta MENOR a la vigente (si fuera
    // igual, no es "residual", es simplemente la última cuota normal).
    const esUltima = restantes <= 1 || saldoInicial + interes <= cuota + EPS;

    let cuotaK;
    let capital;
    let esResidual = false;
    if (esUltima) {
      cuotaK = saldoInicial + interes;
      capital = saldoInicial;
      esResidual = cuotaK < cuota - 0.5;
    } else {
      cuotaK = cuota;
      capital = cuotaK - interes;
    }

    saldo = saldoInicial - capital;
    if (Math.abs(saldo) < EPS) saldo = 0;
    restantes -= 1;

    let abonoAplicado = 0;
    let modoAbono = null;

    const abonoDelMes = aplicables.get(k);
    if (abonoDelMes && saldo > EPS) {
      const exceso = abonoDelMes.monto - saldo;
      if (exceso > TOLERANCIA_ABONO_IGUAL_SALDO) {
        errores.push({
          indice: abonoDelMes.indice,
          mes: k,
          mensaje: `El abono del mes ${k} ($${abonoDelMes.monto}) supera el saldo disponible ($${saldo}).`,
        });
      } else {
        abonoAplicado = abonoDelMes.monto;
        modoAbono = abonoDelMes.modo;
        saldo -= abonoAplicado;
        if (Math.abs(saldo) < EPS) saldo = 0;

        let cuotaNueva = cuota;
        let restantesNuevos = restantes;
        if (saldo > EPS) {
          if (modoAbono === 'reducir_cuota') {
            cuota = cuotaFija(saldo, tasaMensual, restantes);
            cuotaNueva = cuota;
          } else {
            // reducir_plazo: la cuota no cambia; se recalculan las cuotas
            // restantes necesarias para pagar el saldo con la cuota vigente.
            // El -1e-9 dentro del ceil evita que un resultado exacto (ej. 9.0
            // con error de redondeo 9.0000000003) suba a 10 por el techo.
            if (tasaMensual === 0) {
              restantes = Math.ceil(saldo / cuota - 1e-9);
            } else {
              restantes = Math.ceil(
                -Math.log(1 - (saldo * tasaMensual) / cuota) / Math.log(1 + tasaMensual) - 1e-9,
              );
            }
            restantesNuevos = restantes;
          }
        }

        eventos.push({
          mes: k,
          modo: modoAbono,
          monto: abonoAplicado,
          saldoTrasAbono: saldo,
          cuotaNueva,
          restantesNuevos,
        });
      }
      // Se consume el abono del mes independientemente del resultado
      // (aplicado o rechazado por exceso), para no reevaluarlo si el bucle
      // volviera a pasar por el mismo k (no ocurre, pero es la invariante).
      aplicables.delete(k);
    }

    filas.push({
      k,
      saldoInicial,
      cuota: cuotaK,
      interes,
      capital,
      abono: abonoAplicado,
      modoAbono,
      saldoFinal: saldo,
      esResidual,
    });
  }

  // Abonos que quedaron sin aplicar porque su mes es posterior al mes en que
  // el crédito ya quedó cancelado (por ejemplo, un reducir_plazo anterior
  // acortó el crédito antes de llegar al mes del abono). §2.2 convención 4.
  for (const [mes, abono] of aplicables) {
    errores.push({
      indice: abono.indice,
      mes,
      mensaje: `El crédito ya está cancelado en el mes ${mes}.`,
    });
  }

  const totalCuotas = filas.reduce((acc, f) => acc + f.cuota, 0);
  const totalAbonos = filas.reduce((acc, f) => acc + f.abono, 0);
  const totalIntereses = filas.reduce((acc, f) => acc + f.interes, 0);

  const resumen = {
    numeroCuotas: filas.length,
    totalCuotas,
    totalAbonos,
    totalPagado: totalCuotas + totalAbonos,
    totalIntereses,
    cuotaFinalVigente: cuota,
  };

  return { cuotaInicial, filas, eventos, resumen, errores };
}

/**
 * compararEscenarios (RF-11): corre el mismo motor dos veces, sin y con
 * abonos, y resume el ahorro.
 */
export function compararEscenarios(params) {
  const sinAbonos = simularCredito({ ...params, abonos: [] });
  const conAbonos = simularCredito(params);

  return {
    sinAbonos,
    conAbonos,
    ahorroIntereses: sinAbonos.resumen.totalIntereses - conAbonos.resumen.totalIntereses,
    cuotasAhorradas: sinAbonos.resumen.numeroCuotas - conAbonos.resumen.numeroCuotas,
  };
}
