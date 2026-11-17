import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FRECUENCIAS, tasaEfectivaAnual, convertirTasa } from '../src/engine/rates.js';

// Casos de prueba de calculation-flow.md §1 (tabla §1.2).

describe('convertirTasa — casos documentados en calculation-flow.md §1.2', () => {
  test('1,84 % efectiva mensual vencida -> EA = 24,4574 %', () => {
    const { valor } = convertirTasa(
      { valor: 0.0184, tipo: 'efectiva', m: 12, modalidad: 'vencida' },
      { tipo: 'efectiva', m: 1, modalidad: 'vencida' },
    );
    assert.ok(Math.abs(valor - 0.244574) < 1e-5, `valor=${valor}`);
  });

  test('1,84 % efectiva mensual vencida -> NAMV = 22,08 %', () => {
    const { valor } = convertirTasa(
      { valor: 0.0184, tipo: 'efectiva', m: 12, modalidad: 'vencida' },
      { tipo: 'nominal', m: 12, modalidad: 'vencida' },
    );
    assert.ok(Math.abs(valor - 0.2208) < 1e-5, `valor=${valor}`);
  });

  test('24,4574 % EA -> efectiva mensual vencida = 1,84 %', () => {
    const { valor } = convertirTasa(
      { valor: 0.244574, tipo: 'efectiva', m: 1, modalidad: 'vencida' },
      { tipo: 'efectiva', m: 12, modalidad: 'vencida' },
    );
    assert.ok(Math.abs(valor - 0.0184) < 1e-5, `valor=${valor}`);
  });

  test('2 % efectiva mensual anticipada -> efectiva mensual vencida = 2,0408 %', () => {
    const { valor } = convertirTasa(
      { valor: 0.02, tipo: 'efectiva', m: 12, modalidad: 'anticipada' },
      { tipo: 'efectiva', m: 12, modalidad: 'vencida' },
    );
    assert.ok(Math.abs(valor - 0.020408) < 1e-5, `valor=${valor}`);
  });

  test('pasos contiene descripciones y fórmulas legibles', () => {
    const { pasos } = convertirTasa(
      { valor: 0.0184, tipo: 'efectiva', m: 12, modalidad: 'vencida' },
      { tipo: 'nominal', m: 12, modalidad: 'vencida' },
    );
    assert.ok(pasos.length > 0);
    for (const paso of pasos) {
      assert.equal(typeof paso.descripcion, 'string');
      assert.equal(typeof paso.formula, 'string');
      assert.equal(typeof paso.resultado, 'number');
    }
  });
});

describe('NAMV 1,84 % MV = 22,08 % (regresión explícita pedida en el encargo)', () => {
  test('ida y vuelta exacta', () => {
    const ida = convertirTasa(
      { valor: 0.0184, tipo: 'efectiva', m: 12, modalidad: 'vencida' },
      { tipo: 'nominal', m: 12, modalidad: 'vencida' },
    );
    assert.ok(Math.abs(ida.valor - 0.2208) < 1e-4);

    const vuelta = convertirTasa(
      { valor: ida.valor, tipo: 'nominal', m: 12, modalidad: 'vencida' },
      { tipo: 'efectiva', m: 12, modalidad: 'vencida' },
    );
    assert.ok(Math.abs(vuelta.valor - 0.0184) < 1e-9);
  });
});

describe('Round-trip: todas las combinaciones tipo x m x modalidad (5x2x2=20 formas)', () => {
  const TIPOS = ['efectiva', 'nominal'];
  const MODALIDADES = ['vencida', 'anticipada'];
  const MS = Object.keys(FRECUENCIAS).map(Number);

  // Semillas de tasa EA razonables para un crédito de consumo colombiano.
  const SEMILLAS_EA = [0.15, 0.2446, 0.3];

  for (const ea of SEMILLAS_EA) {
    for (const tipo of TIPOS) {
      for (const m of MS) {
        for (const modalidad of MODALIDADES) {
          test(`EA=${ea} -> ${tipo} m=${m} ${modalidad} -> EA de vuelta`, () => {
            // Partimos de EA puro (efectiva, m=1, vencida) y convertimos a la
            // forma bajo prueba, luego de vuelta a EA: debe cerrar en ±1e-9.
            const { valor } = convertirTasa(
              { valor: ea, tipo: 'efectiva', m: 1, modalidad: 'vencida' },
              { tipo, m, modalidad },
            );
            const vuelta = convertirTasa({ valor, tipo, m, modalidad }, { tipo: 'efectiva', m: 1, modalidad: 'vencida' });
            assert.ok(Math.abs(vuelta.valor - ea) < 1e-9, `esperado EA=${ea}, obtenido=${vuelta.valor}`);
          });
        }
      }
    }
  }
});

describe('tasaEfectivaAnual', () => {
  test('coincide con el EA que devuelve convertirTasa', () => {
    const origen = { valor: 0.0184, tipo: 'efectiva', m: 12, modalidad: 'vencida' };
    const ea1 = tasaEfectivaAnual(origen);
    const { ea: ea2 } = convertirTasa(origen, { tipo: 'efectiva', m: 1, modalidad: 'vencida' });
    assert.ok(Math.abs(ea1 - ea2) < 1e-12);
  });
});

describe('Validaciones', () => {
  test('valor <= 0 lanza RangeError', () => {
    assert.throws(
      () => convertirTasa({ valor: 0, tipo: 'efectiva', m: 12, modalidad: 'vencida' }, { tipo: 'efectiva', m: 1, modalidad: 'vencida' }),
      RangeError,
    );
    assert.throws(
      () => convertirTasa({ valor: -0.01, tipo: 'efectiva', m: 12, modalidad: 'vencida' }, { tipo: 'efectiva', m: 1, modalidad: 'vencida' }),
      RangeError,
    );
  });

  test('valor no finito lanza RangeError', () => {
    assert.throws(
      () => convertirTasa({ valor: NaN, tipo: 'efectiva', m: 12, modalidad: 'vencida' }, { tipo: 'efectiva', m: 1, modalidad: 'vencida' }),
      RangeError,
    );
  });

  test('tipo inválido lanza RangeError', () => {
    assert.throws(
      () => convertirTasa({ valor: 0.02, tipo: 'rara', m: 12, modalidad: 'vencida' }, { tipo: 'efectiva', m: 1, modalidad: 'vencida' }),
      RangeError,
    );
  });

  test('m inválido lanza RangeError', () => {
    assert.throws(
      () => convertirTasa({ valor: 0.02, tipo: 'efectiva', m: 3, modalidad: 'vencida' }, { tipo: 'efectiva', m: 1, modalidad: 'vencida' }),
      RangeError,
    );
  });

  test('modalidad inválida lanza RangeError', () => {
    assert.throws(
      () => convertirTasa({ valor: 0.02, tipo: 'efectiva', m: 12, modalidad: 'rara' }, { tipo: 'efectiva', m: 1, modalidad: 'vencida' }),
      RangeError,
    );
  });

  test('anticipada con tasa periódica >= 1 lanza RangeError (1 - d <= 0)', () => {
    assert.throws(
      () => convertirTasa({ valor: 1.5, tipo: 'efectiva', m: 12, modalidad: 'anticipada' }, { tipo: 'efectiva', m: 1, modalidad: 'vencida' }),
      RangeError,
    );
  });
});
