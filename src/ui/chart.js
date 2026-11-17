// Gráfica de evolución del saldo (RF-13), SVG inline hecho a mano.
// No se usa ninguna librería (ADR-001 prohíbe CDN / recursos externos).
// Esta función es pura respecto al DOM salvo que construye nodos SVG; no lee
// ni escribe nada fuera de los parámetros recibidos.

import { formatearPesos } from './format.js';

const NS = 'http://www.w3.org/2000/svg';

function crear(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/**
 * dibujarGraficaSaldo: dibuja un SVG de línea con dos series (saldo por mes,
 * "Sin abonos" vs "Con abonos") dentro del contenedor dado.
 *
 * @param {HTMLElement} contenedor
 * @param {{sinAbonos: number[], conAbonos: number[]}} series saldo final por mes (incluye mes 0 = monto inicial)
 */
export function dibujarGraficaSaldo(contenedor, series) {
  contenedor.textContent = '';

  const ancho = 640;
  const alto = 320;
  const margen = { arriba: 20, abajo: 36, izquierda: 90, derecha: 16 };

  const { sinAbonos, conAbonos } = series;
  const maxMeses = Math.max(sinAbonos.length, conAbonos.length) - 1;
  const maxSaldo = Math.max(1, ...sinAbonos, ...conAbonos);

  const anchoUtil = ancho - margen.izquierda - margen.derecha;
  const altoUtil = alto - margen.arriba - margen.abajo;

  const x = (mes) => margen.izquierda + (maxMeses === 0 ? 0 : (mes / maxMeses) * anchoUtil);
  const y = (saldo) => margen.arriba + altoUtil - (saldo / maxSaldo) * altoUtil;

  const svg = crear('svg', {
    viewBox: `0 0 ${ancho} ${alto}`,
    width: '100%',
    height: alto,
    role: 'img',
    'aria-labelledby': 'grafica-saldo-titulo grafica-saldo-desc',
  });

  const titulo = crear('title');
  titulo.id = 'grafica-saldo-titulo';
  titulo.textContent = 'Evolución del saldo del crédito';
  svg.appendChild(titulo);

  const desc = crear('desc');
  desc.id = 'grafica-saldo-desc';
  desc.textContent =
    'Comparación mes a mes del saldo pendiente del crédito, sin abonos y con los abonos extraordinarios registrados.';
  svg.appendChild(desc);

  // Ejes
  const ejeX = crear('line', {
    x1: margen.izquierda,
    y1: alto - margen.abajo,
    x2: ancho - margen.derecha,
    y2: alto - margen.abajo,
    stroke: '#9aa5b1',
    'stroke-width': 1,
  });
  const ejeY = crear('line', {
    x1: margen.izquierda,
    y1: margen.arriba,
    x2: margen.izquierda,
    y2: alto - margen.abajo,
    stroke: '#9aa5b1',
    'stroke-width': 1,
  });
  svg.appendChild(ejeX);
  svg.appendChild(ejeY);

  // Etiquetas del eje Y (4 marcas)
  const pasosY = 4;
  for (let p = 0; p <= pasosY; p += 1) {
    const valor = (maxSaldo / pasosY) * p;
    const yy = y(valor);
    const marca = crear('line', {
      x1: margen.izquierda - 4,
      y1: yy,
      x2: margen.izquierda,
      y2: yy,
      stroke: '#9aa5b1',
      'stroke-width': 1,
    });
    svg.appendChild(marca);
    const texto = crear('text', {
      x: margen.izquierda - 8,
      y: yy + 4,
      'text-anchor': 'end',
      'font-size': 11,
      fill: '#4b5563',
    });
    texto.textContent = formatearPesos(valor);
    svg.appendChild(texto);
  }

  // Etiquetas del eje X (cada ~2 meses, hasta un máximo razonable de marcas)
  const salto = Math.max(1, Math.ceil(maxMeses / 10));
  for (let mes = 0; mes <= maxMeses; mes += salto) {
    const xx = x(mes);
    const marca = crear('line', {
      x1: xx,
      y1: alto - margen.abajo,
      x2: xx,
      y2: alto - margen.abajo + 4,
      stroke: '#9aa5b1',
      'stroke-width': 1,
    });
    svg.appendChild(marca);
    const texto = crear('text', {
      x: xx,
      y: alto - margen.abajo + 16,
      'text-anchor': 'middle',
      'font-size': 11,
      fill: '#4b5563',
    });
    texto.textContent = String(mes);
    svg.appendChild(texto);
  }

  function dibujarSerie(serie, color) {
    const puntos = serie.map((saldo, mes) => `${x(mes)},${y(saldo)}`).join(' ');
    const linea = crear('polyline', {
      points: puntos,
      fill: 'none',
      stroke: color,
      'stroke-width': 2.5,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
    });
    svg.appendChild(linea);
  }

  dibujarSerie(sinAbonos, '#9aa5b1');
  dibujarSerie(conAbonos, '#2563a8');

  contenedor.appendChild(svg);

  // Leyenda (HTML normal, fuera del SVG, para que sea fácil de leer e imprimir)
  const leyenda = document.createElement('div');
  leyenda.className = 'grafica-leyenda';

  const item1 = document.createElement('span');
  item1.className = 'grafica-leyenda__item';
  const sw1 = document.createElement('span');
  sw1.className = 'grafica-leyenda__muestra';
  sw1.style.backgroundColor = '#9aa5b1';
  item1.appendChild(sw1);
  item1.appendChild(document.createTextNode('Sin abonos'));

  const item2 = document.createElement('span');
  item2.className = 'grafica-leyenda__item';
  const sw2 = document.createElement('span');
  sw2.className = 'grafica-leyenda__muestra';
  sw2.style.backgroundColor = '#2563a8';
  item2.appendChild(sw2);
  item2.appendChild(document.createTextNode('Con abonos'));

  leyenda.appendChild(item1);
  leyenda.appendChild(item2);
  contenedor.appendChild(leyenda);
}
