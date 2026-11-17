import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatearPesos,
  formatearPorcentaje,
  parsearMonto,
  parsearPorcentaje,
} from '../src/ui/format.js';

test('formatearPesos: formato colombiano con separador de miles', () => {
  assert.equal(formatearPesos(1234567), '$ 1.234.567');
  assert.equal(formatearPesos(945596), '$ 945.596');
  assert.equal(formatearPesos(0), '$ 0');
});

test('formatearPesos: redondea a pesos enteros', () => {
  assert.equal(formatearPesos(945595.6), '$ 945.596');
  assert.equal(formatearPesos(945595.4), '$ 945.595');
});

test('formatearPesos: negativos', () => {
  assert.equal(formatearPesos(-1000), '-$ 1.000');
});

test('formatearPorcentaje: coma decimal y 4 decimales por defecto', () => {
  assert.equal(formatearPorcentaje(0.0184), '1,8400 %');
  assert.equal(formatearPorcentaje(0.244574), '24,4574 %');
});

test('formatearPorcentaje: decimales configurables', () => {
  assert.equal(formatearPorcentaje(0.02, 2), '2,00 %');
});

test('parsearMonto: acepta puntos de miles, texto plano y símbolo de pesos', () => {
  assert.equal(parsearMonto('10.000.000'), 10000000);
  assert.equal(parsearMonto('10000000'), 10000000);
  assert.equal(parsearMonto('$ 10.000.000'), 10000000);
  assert.equal(parsearMonto('$10.000.000'), 10000000);
});

test('parsearMonto: NaN en texto inválido', () => {
  assert.ok(Number.isNaN(parsearMonto('')));
  assert.ok(Number.isNaN(parsearMonto('abc')));
  assert.ok(Number.isNaN(parsearMonto(undefined)));
});

test('parsearPorcentaje: acepta coma o punto decimal, devuelve fracción', () => {
  assert.equal(parsearPorcentaje('1,84'), 0.0184);
  assert.equal(parsearPorcentaje('1.84'), 0.0184);
  assert.equal(parsearPorcentaje('2'), 0.02);
  assert.equal(parsearPorcentaje('24,46 %'), 0.2446);
});

test('parsearPorcentaje: NaN en texto inválido', () => {
  assert.ok(Number.isNaN(parsearPorcentaje('')));
  assert.ok(Number.isNaN(parsearPorcentaje('abc')));
});
