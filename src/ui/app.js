// Punto de entrada de la UI. Conecta formularios con el motor (src/engine/)
// y pinta resultados. No hace cálculos financieros (blueprint §2).

import { convertirTasa, FRECUENCIAS } from '../engine/rates.js';
import { simularCredito, compararEscenarios } from '../engine/amortization.js';
import { formatearPesos, formatearPorcentaje, parsearMonto, parsearPorcentaje } from './format.js';
import { dibujarGraficaSaldo } from './chart.js';

// ------------------------- Pestañas -------------------------

function inicializarPestanas() {
  const pestanas = Array.from(document.querySelectorAll('.pestana'));
  pestanas.forEach((pestana) => {
    pestana.addEventListener('click', () => activarPestana(pestana, pestanas));
    pestana.addEventListener('keydown', (ev) => {
      const indice = pestanas.indexOf(pestana);
      if (ev.key === 'ArrowRight') {
        pestanas[(indice + 1) % pestanas.length].focus();
      } else if (ev.key === 'ArrowLeft') {
        pestanas[(indice - 1 + pestanas.length) % pestanas.length].focus();
      }
    });
  });
}

function activarPestana(pestana, todas) {
  todas.forEach((p) => {
    const activa = p === pestana;
    p.classList.toggle('pestana--activa', activa);
    p.setAttribute('aria-selected', String(activa));
    const panel = document.getElementById(p.dataset.panel);
    if (panel) panel.hidden = !activa;
  });
  pestana.focus();
}

// ------------------------- Debounce -------------------------

function debounce(fn, ms) {
  let temporizador = null;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => fn(...args), ms);
  };
}

// ------------------------- Abonos: editor de filas -------------------------

let siguienteIdAbono = 1;
let filasAbonos = []; // { id, mes, monto, modo }

function agregarFilaAbono(valores = {}) {
  filasAbonos.push({
    id: siguienteIdAbono++,
    mes: valores.mes ?? '',
    monto: valores.monto ?? '',
    modo: valores.modo ?? 'reducir_plazo',
  });
  pintarFilasAbonos();
  recalcularYPintar();
}

function eliminarFilaAbono(id) {
  filasAbonos = filasAbonos.filter((f) => f.id !== id);
  pintarFilasAbonos();
  recalcularYPintar();
}

function pintarFilasAbonos() {
  const cuerpo = document.getElementById('cuerpo-tabla-abonos');
  cuerpo.textContent = '';

  filasAbonos.forEach((fila) => {
    const tr = document.createElement('tr');
    tr.dataset.idAbono = String(fila.id);

    // Mes
    const tdMes = document.createElement('td');
    const inputMes = document.createElement('input');
    inputMes.type = 'number';
    inputMes.min = '1';
    inputMes.value = fila.mes;
    inputMes.setAttribute('aria-label', 'Mes del abono');
    inputMes.addEventListener('input', () => {
      fila.mes = inputMes.value;
      recalcularYPintar();
    });
    tdMes.appendChild(inputMes);
    tr.appendChild(tdMes);

    // Monto
    const tdMonto = document.createElement('td');
    const inputMonto = document.createElement('input');
    inputMonto.type = 'text';
    inputMonto.inputMode = 'numeric';
    inputMonto.value = fila.monto;
    inputMonto.setAttribute('aria-label', 'Monto del abono');
    inputMonto.addEventListener('input', () => {
      fila.monto = inputMonto.value;
      recalcularYPintar();
    });
    tdMonto.appendChild(inputMonto);
    tr.appendChild(tdMonto);

    // Modo (segmentado)
    const tdModo = document.createElement('td');
    const segmentado = document.createElement('div');
    segmentado.className = 'segmentado';
    [
      { valor: 'reducir_cuota', texto: 'Reducir cuota' },
      { valor: 'reducir_plazo', texto: 'Reducir plazo' },
    ].forEach((opcion) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `modo-${fila.id}`;
      radio.value = opcion.valor;
      radio.checked = fila.modo === opcion.valor;
      radio.addEventListener('change', () => {
        fila.modo = opcion.valor;
        recalcularYPintar();
      });
      label.appendChild(radio);
      label.appendChild(document.createTextNode(opcion.texto));
      segmentado.appendChild(label);
    });
    tdModo.appendChild(segmentado);
    tr.appendChild(tdModo);

    // Eliminar
    const tdEliminar = document.createElement('td');
    const botonEliminar = document.createElement('button');
    botonEliminar.type = 'button';
    botonEliminar.className = 'boton--icono';
    botonEliminar.textContent = 'Eliminar';
    botonEliminar.setAttribute('aria-label', `Eliminar abono del mes ${fila.mes || ''}`);
    botonEliminar.addEventListener('click', () => eliminarFilaAbono(fila.id));
    tdEliminar.appendChild(botonEliminar);
    tr.appendChild(tdEliminar);

    cuerpo.appendChild(tr);

    // Fila de error (si aplica), se llena en pintarResultados/validarEntradas.
    if (fila.error) {
      tr.classList.add('fila-abono--error');
      const trError = document.createElement('tr');
      const tdError = document.createElement('td');
      tdError.colSpan = 4;
      tdError.className = 'fila-abono-error-msg';
      tdError.textContent = fila.error;
      trError.appendChild(tdError);
      cuerpo.appendChild(trError);
    }
  });
}

// ------------------------- Lectura de la tasa ingresada -------------------------

function leerTasaOrigenDesdeFormularioCredito() {
  const valorTexto = document.getElementById('input-tasa-valor').value;
  // parsearPorcentaje ya devuelve la fracción decimal (0.02 para "2"), que es
  // la unidad que usa rates.js internamente (ver tests/rates.test.mjs: valor
  // se pasa como fracción, no como número en %, a pesar del comentario del
  // módulo). No volver a dividir/multiplicar por 100 aquí.
  const valor = parsearPorcentaje(valorTexto);
  const tipo = document.getElementById('input-tasa-tipo').value;
  const m = Number(document.getElementById('input-tasa-periodicidad').value);
  const modalidad = document.getElementById('input-tasa-modalidad').value;
  return { valor, tipo, m, modalidad };
}

function actualizarAyudaNominal() {
  const tipo = document.getElementById('input-tasa-tipo').value;
  const m = Number(document.getElementById('input-tasa-periodicidad').value);
  const modalidad = document.getElementById('input-tasa-modalidad').value;
  const ayuda = document.getElementById('ayuda-tasa-nominal');
  const texto = document.getElementById('texto-periodicidad-nominal');

  if (tipo !== 'nominal') {
    ayuda.hidden = true;
    return;
  }
  const periodicidad = FRECUENCIAS[m] ?? 'mensual';
  const siglaPeriodo = { mensual: 'M', bimestral: 'B', trimestral: 'T', semestral: 'S', anual: 'A' }[periodicidad];
  const siglaModalidad = modalidad === 'anticipada' ? 'A' : 'V';
  texto.textContent = `${periodicidad} (NA${siglaPeriodo}${siglaModalidad})`;
  ayuda.hidden = false;
}

function actualizarTasaEquivalente() {
  const salida = document.getElementById('texto-tasa-equivalente');
  const origen = leerTasaOrigenDesdeFormularioCredito();

  if (!Number.isFinite(origen.valor) || origen.valor <= 0) {
    salida.textContent = '';
    return;
  }

  try {
    const aMensualVencida = convertirTasa(origen, { tipo: 'efectiva', m: 12, modalidad: 'vencida' });
    const ea = aMensualVencida.ea;
    salida.textContent =
      `Equivale a ${formatearPorcentaje(aMensualVencida.valor)} efectiva mensual vencida · ` +
      `${formatearPorcentaje(ea)} EA`;
  } catch {
    salida.textContent = '';
  }
}

// ------------------------- Validación y cálculo del simulador -------------------------

function leerAbonosParaMotor() {
  // Devuelve { abonos, erroresBase } — erroresBase son errores de formato
  // (texto no numérico) detectados antes de llamar al motor; el motor valida
  // el resto (mes fuera de rango, monto > saldo, etc.) y devuelve `errores`.
  const abonos = [];
  const erroresBase = [];

  filasAbonos.forEach((fila) => {
    fila.error = null;
    if (fila.mes === '' && fila.monto === '') return; // fila vacía, se ignora

    const mes = Number(fila.mes);
    const monto = parsearMonto(String(fila.monto));

    if (!Number.isInteger(mes) || mes < 1) {
      fila.error = 'El mes debe ser un número entero mayor o igual a 1.';
      erroresBase.push(fila);
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      fila.error = 'El monto debe ser un número positivo (ejemplo: 2.000.000).';
      erroresBase.push(fila);
      return;
    }
    abonos.push({ mes, monto, modo: fila.modo, _fila: fila });
  });

  return { abonos, erroresBase };
}

function calcularSimulacion() {
  const monto = parsearMonto(document.getElementById('input-monto').value);
  const plazo = Number(document.getElementById('input-plazo').value);
  const origenTasa = leerTasaOrigenDesdeFormularioCredito();

  const erroresGenerales = [];

  if (!Number.isFinite(monto) || monto <= 0) {
    erroresGenerales.push('El monto del crédito debe ser un número positivo (ejemplo: 10.000.000).');
  }
  if (!Number.isInteger(plazo) || plazo < 1 || plazo > 600) {
    erroresGenerales.push('El plazo debe ser un número entero de meses entre 1 y 600.');
  }
  if (!Number.isFinite(origenTasa.valor) || origenTasa.valor <= 0) {
    erroresGenerales.push('La tasa de interés debe ser un número positivo (ejemplo: 2).');
  }

  const { abonos, erroresBase } = leerAbonosParaMotor();
  erroresBase.forEach((fila) => {
    erroresGenerales.push(`Abono — ${fila.error}`);
  });

  if (erroresGenerales.length > 0) {
    return { ok: false, errores: erroresGenerales };
  }

  let tasaMensual;
  try {
    const conversion = convertirTasa(origenTasa, { tipo: 'efectiva', m: 12, modalidad: 'vencida' });
    tasaMensual = conversion.valor;
  } catch (e) {
    return { ok: false, errores: [e.message] };
  }

  let resultadoCredito;
  let resultadoBase;
  try {
    resultadoBase = simularCredito({ monto, tasaMensual, plazo, abonos: [] });
    resultadoCredito = simularCredito({ monto, tasaMensual, plazo, abonos });
  } catch (e) {
    return { ok: false, errores: [e.message] };
  }

  if (resultadoCredito.errores.length > 0) {
    // Marca el error en la fila correspondiente (por índice de entrada).
    resultadoCredito.errores.forEach((err) => {
      const abono = abonos[err.indice];
      if (abono && abono._fila) abono._fila.error = err.mensaje;
    });
    return {
      ok: false,
      errores: resultadoCredito.errores.map((e) => e.mensaje),
    };
  }

  const hayAbonosValidos = abonos.length > 0;
  const comparacion = hayAbonosValidos
    ? {
        sinAbonos: resultadoBase,
        conAbonos: resultadoCredito,
        ahorroIntereses: resultadoBase.resumen.totalIntereses - resultadoCredito.resumen.totalIntereses,
        cuotasAhorradas: resultadoBase.resumen.numeroCuotas - resultadoCredito.resumen.numeroCuotas,
      }
    : null;

  return {
    ok: true,
    tasaMensual,
    resultadoBase,
    resultadoCredito,
    comparacion,
  };
}

// ------------------------- Pintado de resultados -------------------------

function pintarErrores(errores) {
  const panel = document.getElementById('panel-errores');
  const lista = document.getElementById('lista-errores');
  const panelResultados = document.getElementById('panel-resultados');
  const mensajeSinResultados = document.getElementById('mensaje-sin-resultados');

  lista.textContent = '';

  if (errores.length === 0) {
    panel.hidden = true;
    panelResultados.hidden = false;
    mensajeSinResultados.hidden = true;
    return;
  }

  errores.forEach((mensaje) => {
    const li = document.createElement('li');
    li.textContent = mensaje; // textContent: nunca innerHTML con texto de usuario/motor
    lista.appendChild(li);
  });
  panel.hidden = false;
  panelResultados.hidden = true;
  mensajeSinResultados.hidden = false;
}

function crearTarjetaResumen(etiqueta, valor) {
  const div = document.createElement('div');
  div.className = 'tarjeta-resumen-item';
  const spanEtiqueta = document.createElement('span');
  spanEtiqueta.className = 'etiqueta';
  spanEtiqueta.textContent = etiqueta;
  const spanValor = document.createElement('span');
  spanValor.className = 'valor';
  spanValor.textContent = valor;
  div.appendChild(spanEtiqueta);
  div.appendChild(spanValor);
  return div;
}

function pintarResumen(resultado) {
  const contenedor = document.getElementById('tarjetas-resumen');
  contenedor.textContent = '';
  const { resumen, cuotaInicial } = resultado;
  contenedor.appendChild(crearTarjetaResumen('Cuota inicial', formatearPesos(cuotaInicial)));
  contenedor.appendChild(crearTarjetaResumen('Número de cuotas', String(resumen.numeroCuotas)));
  contenedor.appendChild(crearTarjetaResumen('Total intereses', formatearPesos(resumen.totalIntereses)));
  contenedor.appendChild(crearTarjetaResumen('Total pagado', formatearPesos(resumen.totalPagado)));
}

function pintarComparacion(comparacion) {
  const tarjeta = document.getElementById('tarjeta-comparacion');
  const contenedor = document.getElementById('tarjetas-comparacion');
  contenedor.textContent = '';

  if (!comparacion) {
    tarjeta.hidden = true;
    return;
  }

  tarjeta.hidden = false;
  contenedor.appendChild(crearTarjetaResumen('Intereses ahorrados', formatearPesos(comparacion.ahorroIntereses)));
  contenedor.appendChild(crearTarjetaResumen('Cuotas ahorradas', String(comparacion.cuotasAhorradas)));
  contenedor.appendChild(
    crearTarjetaResumen('Cuota final vigente', formatearPesos(comparacion.conAbonos.resumen.cuotaFinalVigente)),
  );
}

function pintarEventos(resultado) {
  const tarjeta = document.getElementById('tarjeta-eventos');
  const lista = document.getElementById('lista-eventos');
  lista.textContent = '';

  if (resultado.eventos.length === 0) {
    tarjeta.hidden = true;
    return;
  }

  tarjeta.hidden = false;
  resultado.eventos.forEach((ev) => {
    const li = document.createElement('li');
    const modoTexto = ev.modo === 'reducir_cuota' ? 'reduce la cuota' : 'reduce el plazo';
    li.textContent =
      `Mes ${ev.mes}: abono de ${formatearPesos(ev.monto)} → ${modoTexto}, ` +
      `quedan ${ev.restantesNuevos} cuotas → nueva cuota ${formatearPesos(ev.cuotaNueva)}.`;
    lista.appendChild(li);
  });
}

function pintarTablaAmortizacion(resultado) {
  const cuerpo = document.getElementById('cuerpo-tabla-amortizacion');
  cuerpo.textContent = '';

  resultado.filas.forEach((fila) => {
    const tr = document.createElement('tr');
    if (fila.abono > 0) tr.classList.add('fila-con-abono');

    const celdas = [
      String(fila.k),
      formatearPesos(fila.saldoInicial),
      formatearPesos(fila.cuota),
      formatearPesos(fila.interes),
      formatearPesos(fila.capital),
      fila.abono > 0 ? formatearPesos(fila.abono) : '—',
      formatearPesos(fila.saldoFinal),
    ];

    celdas.forEach((texto, indice) => {
      const td = document.createElement('td');
      td.textContent = texto;
      if (indice === 0 && fila.esResidual) {
        const badge = document.createElement('span');
        badge.className = 'badge-residual';
        badge.textContent = 'Cuota residual';
        td.appendChild(badge);
      }
      if (indice === 5 && fila.abono > 0) {
        const modoTexto = fila.modoAbono === 'reducir_cuota' ? ' (reduce cuota)' : ' (reduce plazo)';
        td.textContent += modoTexto;
      }
      tr.appendChild(td);
    });

    cuerpo.appendChild(tr);
  });
}

function pintarGrafica(resultadoBase, resultadoConAbonos, hayAbonos) {
  const contenedor = document.getElementById('contenedor-grafica');

  const construirSerieSaldo = (resultado, montoInicial) => {
    const saldos = [montoInicial];
    resultado.filas.forEach((f) => saldos.push(f.saldoFinal));
    return saldos;
  };

  const montoInicial = resultadoBase.filas.length > 0 ? resultadoBase.filas[0].saldoInicial : 0;
  const sinAbonos = construirSerieSaldo(resultadoBase, montoInicial);
  const conAbonos = hayAbonos ? construirSerieSaldo(resultadoConAbonos, montoInicial) : null;

  dibujarGraficaSaldo(contenedor, { sinAbonos, conAbonos });
}

function recalcularYPintar() {
  const resultado = calcularSimulacion();

  // Repinta las filas de abonos para reflejar mensajes de error por fila.
  pintarFilasAbonos();

  if (!resultado.ok) {
    pintarErrores(resultado.errores);
    return;
  }

  pintarErrores([]);
  pintarResumen(resultado.resultadoCredito);
  pintarComparacion(resultado.comparacion);
  pintarEventos(resultado.resultadoCredito);
  pintarTablaAmortizacion(resultado.resultadoCredito);
  pintarGrafica(resultado.resultadoBase, resultado.resultadoCredito, Boolean(resultado.comparacion));
}

// ------------------------- Ejemplo documentado -------------------------

function cargarEjemplo() {
  document.getElementById('input-monto').value = '10.000.000';
  document.getElementById('input-plazo').value = '12';
  document.getElementById('input-tasa-valor').value = '2';
  document.getElementById('input-tasa-tipo').value = 'efectiva';
  document.getElementById('input-tasa-periodicidad').value = '12';
  document.getElementById('input-tasa-modalidad').value = 'vencida';

  filasAbonos = [];
  siguienteIdAbono = 1;
  agregarFilaAbono({ mes: 3, monto: '2.000.000', modo: 'reducir_plazo' });

  actualizarAyudaNominal();
  actualizarTasaEquivalente();
  recalcularYPintar();
}

// ------------------------- Conversor de tasas (pestaña 2) -------------------------

const ETIQUETAS_EQUIVALENCIAS = [
  { nombre: 'Efectiva anual (EA)', tipo: 'efectiva', m: 1, modalidad: 'vencida' },
  { nombre: 'Efectiva mensual vencida (MV)', tipo: 'efectiva', m: 12, modalidad: 'vencida' },
  { nombre: 'Nominal anual, capitalización mensual vencida (NAMV)', tipo: 'nominal', m: 12, modalidad: 'vencida' },
  { nombre: 'Efectiva trimestral vencida (TV)', tipo: 'efectiva', m: 4, modalidad: 'vencida' },
  { nombre: 'Nominal anual, capitalización trimestral vencida (NATV)', tipo: 'nominal', m: 4, modalidad: 'vencida' },
  { nombre: 'Efectiva semestral vencida (SV)', tipo: 'efectiva', m: 2, modalidad: 'vencida' },
  { nombre: 'Nominal anual, capitalización semestral vencida (NASV)', tipo: 'nominal', m: 2, modalidad: 'vencida' },
  { nombre: 'Efectiva mensual anticipada (MA)', tipo: 'efectiva', m: 12, modalidad: 'anticipada' },
  { nombre: 'Nominal anual, capitalización mensual anticipada (NAMA)', tipo: 'nominal', m: 12, modalidad: 'anticipada' },
];

function leerTasaOrigenConversor() {
  const valor = parsearPorcentaje(document.getElementById('conv-origen-valor').value);
  const tipo = document.getElementById('conv-origen-tipo').value;
  const m = Number(document.getElementById('conv-origen-periodicidad').value);
  const modalidad = document.getElementById('conv-origen-modalidad').value;
  return { valor, tipo, m, modalidad };
}

function leerTasaDestinoConversor() {
  const tipo = document.getElementById('conv-destino-tipo').value;
  const m = Number(document.getElementById('conv-destino-periodicidad').value);
  const modalidad = document.getElementById('conv-destino-modalidad').value;
  return { tipo, m, modalidad };
}

function recalcularConversor() {
  const origen = leerTasaOrigenConversor();
  const destino = leerTasaDestinoConversor();

  const salidaResultado = document.getElementById('texto-resultado-conversion');
  const listaPasos = document.getElementById('lista-pasos-conversion');
  const cuerpoEquivalencias = document.getElementById('cuerpo-tabla-equivalencias');

  listaPasos.textContent = '';
  cuerpoEquivalencias.textContent = '';

  if (!Number.isFinite(origen.valor) || origen.valor <= 0) {
    salidaResultado.textContent = 'Ingresa un valor de tasa positivo.';
    return;
  }

  try {
    const conversion = convertirTasa(origen, destino);
    salidaResultado.textContent = formatearPorcentaje(conversion.valor);

    conversion.pasos.forEach((paso) => {
      const li = document.createElement('li');
      const fuerte = document.createElement('strong');
      fuerte.textContent = paso.descripcion + ': ';
      li.appendChild(fuerte);
      li.appendChild(document.createTextNode(`${paso.formula} = ${formatearPorcentaje(paso.resultado)}`));
      listaPasos.appendChild(li);
    });

    ETIQUETAS_EQUIVALENCIAS.forEach((equiv) => {
      const resultadoEquiv = convertirTasa(origen, equiv);
      const tr = document.createElement('tr');
      const tdNombre = document.createElement('td');
      tdNombre.textContent = equiv.nombre;
      const tdValor = document.createElement('td');
      tdValor.textContent = formatearPorcentaje(resultadoEquiv.valor);
      tr.appendChild(tdNombre);
      tr.appendChild(tdValor);
      cuerpoEquivalencias.appendChild(tr);
    });
  } catch (e) {
    salidaResultado.textContent = e.message;
  }
}

// ------------------------- Arranque -------------------------

function inicializar() {
  inicializarPestanas();

  const formularioCredito = document.getElementById('formulario-credito');
  const recalcularDebounced = debounce(recalcularYPintar, 150);
  formularioCredito.addEventListener('input', () => {
    actualizarAyudaNominal();
    actualizarTasaEquivalente();
    recalcularDebounced();
  });

  document.getElementById('boton-agregar-abono').addEventListener('click', () => agregarFilaAbono());
  document.getElementById('boton-cargar-ejemplo').addEventListener('click', cargarEjemplo);
  document.getElementById('boton-imprimir').addEventListener('click', () => window.print());

  const formularioConversor = document.getElementById('formulario-conversor');
  const formularioConversorDestino = document.getElementById('formulario-conversor-destino');
  const recalcularConversorDebounced = debounce(recalcularConversor, 150);
  formularioConversor.addEventListener('input', recalcularConversorDebounced);
  formularioConversorDestino.addEventListener('input', recalcularConversorDebounced);

  actualizarAyudaNominal();
  actualizarTasaEquivalente();
  recalcularYPintar();
  recalcularConversor();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
