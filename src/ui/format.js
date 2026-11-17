// Helpers de formato y parseo es-CO. Funciones puras: sin DOM.
// Fuente de verdad del redondeo: calculation-flow.md §3.1 — el motor trabaja
// con precisión completa; el redondeo a pesos ocurre únicamente aquí.

/**
 * formatearPesos: redondea a pesos enteros y formatea con separador de miles
 * "." (es-CO), con el símbolo "$ " adelante. Ej: 1234567 -> "$ 1.234.567".
 */
export function formatearPesos(n) {
  const redondeado = Math.round(n);
  const texto = Math.abs(redondeado).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  return (redondeado < 0 ? '-$ ' : '$ ') + texto;
}

/**
 * formatearPorcentaje: recibe una fracción decimal (0.0184) y la muestra como
 * porcentaje con coma decimal y `decimales` cifras (por defecto 4, para que
 * las tasas de conversión no pierdan precisión visible, RF-04).
 */
export function formatearPorcentaje(decimal, decimales = 4) {
  const valor = decimal * 100;
  return (
    valor.toLocaleString('es-CO', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }) + ' %'
  );
}

/**
 * parsearMonto: acepta "10.000.000", "10000000", "$ 10.000.000" (con o sin
 * espacios). Devuelve el número en pesos o NaN si el texto no es un monto
 * válido. Se quitan separadores de miles "." y el símbolo "$"; la coma, si
 * aparece, se trata como decimal (poco usual en montos, pero se admite).
 */
export function parsearMonto(texto) {
  if (typeof texto !== 'string') return NaN;
  let limpio = texto.trim().replace(/\$/g, '').trim();
  if (limpio === '') return NaN;
  // Quita puntos usados como separador de miles y convierte la coma decimal.
  limpio = limpio.replace(/\./g, '').replace(/,/g, '.');
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return NaN;
  return Number(limpio);
}

/**
 * parsearPorcentaje: acepta "1,84" o "1.84" como porcentaje y devuelve la
 * fracción decimal (0.0184). Devuelve NaN si no es un número válido.
 */
export function parsearPorcentaje(texto) {
  if (typeof texto !== 'string') return NaN;
  let limpio = texto.trim().replace(/%/g, '').trim();
  if (limpio === '') return NaN;
  limpio = limpio.replace(/,/g, '.');
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return NaN;
  return Number(limpio) / 100;
}
