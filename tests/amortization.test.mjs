import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { cuotaFija, simularCredito, compararEscenarios } from '../src/engine/amortization.js';

const PESO = 1; // tolerancia en pesos contra los valores documentados y redondeados
// Los totales de intereses documentados en calculation-flow.md §2.3 ya están
// calculados con precisión completa, así que también se comparan con ±1 peso.

function sumaCapitalMasAbonos(resultado) {
  const capital = resultado.filas.reduce((acc, f) => acc + f.capital, 0);
  const abonos = resultado.filas.reduce((acc, f) => acc + f.abono, 0);
  return capital + abonos;
}

describe('cuotaFija', () => {
  test('crédito base de calculation-flow.md §2.3: 10.000.000, 2% mensual, 12 meses', () => {
    const cuota = cuotaFija(10_000_000, 0.02, 12);
    assert.ok(Math.abs(cuota - 945596) < PESO, `cuota=${cuota}`);
  });

  test('tasa 0 reparte linealmente', () => {
    assert.equal(cuotaFija(1200, 0, 12), 100);
  });
});

describe('simularCredito — crédito base sin abonos (§2.3)', () => {
  const r = simularCredito({ monto: 10_000_000, tasaMensual: 0.02, plazo: 12 });

  test('12 cuotas de 945.596, saldo final 0', () => {
    assert.equal(r.filas.length, 12);
    assert.equal(r.filas.at(-1).saldoFinal, 0);
    for (const f of r.filas) {
      assert.ok(Math.abs(f.cuota - 945596) < PESO, `cuota mes ${f.k} = ${f.cuota}`);
    }
  });

  test('intereses totales = 1.347.153', () => {
    assert.ok(Math.abs(r.resumen.totalIntereses - 1347152) < PESO, `intereses=${r.resumen.totalIntereses}`);
  });

  test('suma capital + abonos == monto (±0.01)', () => {
    assert.ok(Math.abs(sumaCapitalMasAbonos(r) - 10_000_000) < 0.01);
  });
});

describe('simularCredito — abono $2.000.000 mes 3, reducir_cuota (§2.3)', () => {
  const r = simularCredito({
    monto: 10_000_000,
    tasaMensual: 0.02,
    plazo: 12,
    abonos: [{ mes: 3, monto: 2_000_000, modo: 'reducir_cuota' }],
  });

  test('saldo tras abono ≈ 5.718.178 y cuotas 4-12 de 700.565', () => {
    const fila3 = r.filas.find((f) => f.k === 3);
    assert.ok(Math.abs(fila3.saldoFinal - 5718178) < PESO, `saldoFinal=${fila3.saldoFinal}`);
    for (const f of r.filas.filter((x) => x.k >= 4)) {
      assert.ok(Math.abs(f.cuota - 700565) < PESO, `cuota mes ${f.k} = ${f.cuota}`);
    }
  });

  test('12 cuotas en total, intereses 1.141.875', () => {
    assert.equal(r.filas.length, 12);
    assert.ok(Math.abs(r.resumen.totalIntereses - 1141874) < PESO, `intereses=${r.resumen.totalIntereses}`);
  });

  test('suma capital + abonos == monto (±0.01)', () => {
    assert.ok(Math.abs(sumaCapitalMasAbonos(r) - 10_000_000) < 0.01);
  });
});

describe('simularCredito — abono $2.000.000 mes 3, reducir_plazo (§2.3)', () => {
  const r = simularCredito({
    monto: 10_000_000,
    tasaMensual: 0.02,
    plazo: 12,
    abonos: [{ mes: 3, monto: 2_000_000, modo: 'reducir_plazo' }],
  });

  test('cuotas 4-9 de 945.596 y cuota 10 residual de 484.157, 10 cuotas en total', () => {
    assert.equal(r.filas.length, 10);
    for (const f of r.filas.filter((x) => x.k >= 4 && x.k <= 9)) {
      assert.ok(Math.abs(f.cuota - 945596) < PESO, `cuota mes ${f.k} = ${f.cuota}`);
    }
    const ultima = r.filas.at(-1);
    assert.equal(ultima.k, 10);
    assert.ok(Math.abs(ultima.cuota - 484157) < PESO, `cuota residual=${ultima.cuota}`);
    assert.equal(ultima.esResidual, true);
    assert.equal(ultima.saldoFinal, 0);
  });

  test('intereses 994.520', () => {
    assert.ok(Math.abs(r.resumen.totalIntereses - 994521) < PESO, `intereses=${r.resumen.totalIntereses}`);
  });

  test('suma capital + abonos == monto (±0.01)', () => {
    assert.ok(Math.abs(sumaCapitalMasAbonos(r) - 10_000_000) < 0.01);
  });
});

describe('simularCredito — referencia Bancolombia: 200M, 1,84% MV, 84 meses', () => {
  const r = simularCredito({ monto: 200_000_000, tasaMensual: 0.0184, plazo: 84 });

  test('cuota = 4.695.074', () => {
    assert.ok(Math.abs(r.cuotaInicial - 4695074) < PESO, `cuota=${r.cuotaInicial}`);
  });

  test('mes 1: interés 3.680.000, capital 1.015.074, saldo 198.984.926', () => {
    const f1 = r.filas[0];
    assert.ok(Math.abs(f1.interes - 3680000) < PESO, `interes=${f1.interes}`);
    assert.ok(Math.abs(f1.capital - 1015074) < PESO, `capital=${f1.capital}`);
    assert.ok(Math.abs(f1.saldoFinal - 198984926) < PESO, `saldoFinal=${f1.saldoFinal}`);
  });
});

describe('simularCredito — caso límite tasa 0', () => {
  test('12 cuotas iguales, sin intereses', () => {
    const r = simularCredito({ monto: 12000, tasaMensual: 0, plazo: 12 });
    assert.equal(r.filas.length, 12);
    assert.equal(r.resumen.totalIntereses, 0);
    for (const f of r.filas) assert.equal(f.cuota, 1000);
    assert.equal(r.filas.at(-1).saldoFinal, 0);
  });
});

describe('simularCredito — abono igual al saldo', () => {
  test('crédito cancelado ese mes, no quedan filas después', () => {
    const base = simularCredito({ monto: 10_000_000, tasaMensual: 0.02, plazo: 12 });
    const fila3 = base.filas.find((f) => f.k === 3);
    const saldoMes3 = fila3.saldoFinal;

    const r = simularCredito({
      monto: 10_000_000,
      tasaMensual: 0.02,
      plazo: 12,
      abonos: [{ mes: 3, monto: saldoMes3, modo: 'reducir_plazo' }],
    });

    assert.equal(r.filas.length, 3);
    assert.equal(r.filas.at(-1).saldoFinal, 0);
    assert.equal(r.errores.length, 0);
  });
});

describe('simularCredito — abono mayor al saldo', () => {
  test('error de validación indicando cuál abono es, con el valor del saldo', () => {
    const base = simularCredito({ monto: 10_000_000, tasaMensual: 0.02, plazo: 12 });
    const saldoMes3 = base.filas.find((f) => f.k === 3).saldoFinal;

    const r = simularCredito({
      monto: 10_000_000,
      tasaMensual: 0.02,
      plazo: 12,
      abonos: [{ mes: 3, monto: saldoMes3 + 100000, modo: 'reducir_cuota' }],
    });

    assert.equal(r.errores.length, 1);
    assert.equal(r.errores[0].indice, 0);
    assert.equal(r.errores[0].mes, 3);
    assert.match(r.errores[0].mensaje, /supera el saldo/);
    // El abono rechazado no debe afectar la simulación (idéntica a sin abonos).
    assert.equal(r.filas.length, 12);
  });
});

describe('simularCredito — abono después de pago anticipado (reducir_plazo acorta el crédito)', () => {
  test('abono en mes posterior al último k genera error "ya está cancelado"', () => {
    const r = simularCredito({
      monto: 10_000_000,
      tasaMensual: 0.02,
      plazo: 12,
      abonos: [
        { mes: 3, monto: 2_000_000, modo: 'reducir_plazo' }, // deja el crédito en 10 cuotas
        { mes: 11, monto: 100000, modo: 'reducir_cuota' }, // mes 11 > 10, ya cancelado
      ],
    });

    assert.equal(r.filas.length, 10);
    const errorMes11 = r.errores.find((e) => e.mes === 11);
    assert.ok(errorMes11, 'debe reportar error para el abono del mes 11');
    assert.equal(errorMes11.indice, 1);
    assert.match(errorMes11.mensaje, /ya está cancelado/);
  });
});

describe('simularCredito — dos abonos en el mismo mes (§3.2)', () => {
  test('el primero se aplica, el segundo queda como error', () => {
    const r = simularCredito({
      monto: 10_000_000,
      tasaMensual: 0.02,
      plazo: 12,
      abonos: [
        { mes: 3, monto: 1_000_000, modo: 'reducir_cuota' },
        { mes: 3, monto: 500_000, modo: 'reducir_plazo' },
      ],
    });

    const errorDuplicado = r.errores.find((e) => e.indice === 1);
    assert.ok(errorDuplicado, 'debe reportar error para el segundo abono (índice 1)');
    assert.match(errorDuplicado.mensaje, /solo se permite un abono por mes/);

    const fila3 = r.filas.find((f) => f.k === 3);
    assert.equal(fila3.abono, 1_000_000);
    assert.equal(fila3.modoAbono, 'reducir_cuota');
  });
});

describe('simularCredito — combo: reducir_plazo en mes 3, luego reducir_cuota en mes 5', () => {
  const r = simularCredito({
    monto: 10_000_000,
    tasaMensual: 0.02,
    plazo: 12,
    abonos: [
      { mes: 3, monto: 2_000_000, modo: 'reducir_plazo' },
      { mes: 5, monto: 1_000_000, modo: 'reducir_cuota' },
    ],
  });

  test('la residual desaparece: la nueva cuota vuelve a ser igual en todas las filas restantes', () => {
    const cuotasFinales = r.filas.filter((f) => f.k >= 6).map((f) => f.cuota);
    const primeraCuota = cuotasFinales[0];
    for (const c of cuotasFinales) {
      assert.ok(Math.abs(c - primeraCuota) < 1e-6, `cuotas finales no son iguales: ${c} vs ${primeraCuota}`);
    }
    // Ninguna fila posterior al segundo abono debe quedar marcada residual,
    // salvo la última (que vuelve a calcularse con la cuota ya uniforme).
    const residualesIntermedias = r.filas.filter((f) => f.k > 5 && f.k < r.filas.length && f.esResidual);
    assert.equal(residualesIntermedias.length, 0);
  });

  test('saldo termina en 0', () => {
    assert.equal(r.filas.at(-1).saldoFinal, 0);
  });

  test('número de filas == restantes fijados tras el primer evento (reducir_plazo en mes 3)', () => {
    // Tras el reducir_plazo del mes 3, el evento reporta `restantesNuevos`
    // (cuotas que quedan por delante de ese mes). El total de filas debe ser
    // mes_evento + restantesNuevos.
    const eventoPlazo = r.eventos.find((e) => e.mes === 3);
    assert.ok(eventoPlazo, 'debe existir el evento del mes 3');
    assert.equal(r.filas.length, 3 + eventoPlazo.restantesNuevos);
  });

  test('suma capital + abonos == monto (±0.01)', () => {
    assert.ok(Math.abs(sumaCapitalMasAbonos(r) - 10_000_000) < 0.01);
  });
});

describe('simularCredito — validaciones base', () => {
  test('monto <= 0 lanza RangeError', () => {
    assert.throws(() => simularCredito({ monto: 0, tasaMensual: 0.02, plazo: 12 }), RangeError);
  });
  test('tasaMensual negativa lanza RangeError', () => {
    assert.throws(() => simularCredito({ monto: 1000, tasaMensual: -0.01, plazo: 12 }), RangeError);
  });
  test('plazo no entero o fuera de rango lanza RangeError', () => {
    assert.throws(() => simularCredito({ monto: 1000, tasaMensual: 0.02, plazo: 0 }), RangeError);
    assert.throws(() => simularCredito({ monto: 1000, tasaMensual: 0.02, plazo: 601 }), RangeError);
    assert.throws(() => simularCredito({ monto: 1000, tasaMensual: 0.02, plazo: 12.5 }), RangeError);
  });
});

describe('compararEscenarios (RF-11)', () => {
  test('ahorro de intereses y cuotas ahorradas del caso reducir_plazo documentado', () => {
    const r = compararEscenarios({
      monto: 10_000_000,
      tasaMensual: 0.02,
      plazo: 12,
      abonos: [{ mes: 3, monto: 2_000_000, modo: 'reducir_plazo' }],
    });

    assert.ok(Math.abs(r.ahorroIntereses - 352633) < 1000, `ahorro=${r.ahorroIntereses}`);
    assert.equal(r.cuotasAhorradas, 2); // 12 - 10
    assert.equal(r.sinAbonos.resumen.numeroCuotas, 12);
    assert.equal(r.conAbonos.resumen.numeroCuotas, 10);
  });
});

describe('esResidual: umbral de medio peso (§2.2, convención 2)', () => {
  test('una última cuota que difiere en centavos no se marca residual', () => {
    // Abono elegido para que la última cuota quede ~$0,39 por debajo de la vigente.
    const r = simularCredito({ monto: 10_000_000, tasaMensual: 0.02, plazo: 12,
      abonos: [{ mes: 3, monto: 2_421_488, modo: 'reducir_plazo' }] });
    const ultima = r.filas.at(-1);
    assert.ok(ultima.cuota < r.cuotaInicial && r.cuotaInicial - ultima.cuota < 0.5);
    assert.equal(ultima.esResidual, false);
  });
  test('la residual del ejemplo documentado sí se marca', () => {
    const r = simularCredito({ monto: 10_000_000, tasaMensual: 0.02, plazo: 12,
      abonos: [{ mes: 3, monto: 2_000_000, modo: 'reducir_plazo' }] });
    assert.equal(r.filas.at(-1).esResidual, true);
  });
});
