# Simulador de Crédito con Abonos a Capital

Proyecto final de Ingeniería Económica. Simula un crédito de cuota fija, convierte entre expresiones de tasa (EA, MV, NAMV, anticipadas…) y permite registrar abonos extraordinarios a capital, eligiendo en cada uno si **reduce la cuota** o **reduce el plazo**.

> Estado: Versión 0.1 — funcional.

## Para usarlo

**Profesor / Usuario:**
Buscar el archivo `ABRIR SIMULADOR.html` en la USB y abrir con doble clic. No requiere instalación, ni internet, ni software adicional.

**Respaldo en línea:** https://cristiandavella.github.io/Simulador-Interes-Compuesto/ (copia automática publicada en GitHub Pages tras cada actualización del código; ADR-003).

**Autor / Preparación de USB:**
1. `npm install` (solo la primera vez)
2. `npm run build` — genera `dist/simulador.html`
3. Copiar `dist/simulador.html` a la USB y renombrar a `ABRIR SIMULADOR.html`

## Qué incluye

- **Simulador de crédito:** Ingresa monto, plazo y tasa de interés. Registra abonos extraordinarios a capital, eligiendo si cada uno reduce la cuota o el plazo. Muestra tabla de amortización, comparación con/sin abonos, gráfica del saldo y opción para imprimir.
- **Conversor de tasas:** Convierte entre tasas efectiva anual, nominal mensual vencida/anticipada, y otras expresiones (RF-04b).
- **Panel de fórmulas y convenciones:** Referencia de las fórmulas usadas y convenciones financieras (RF-12).

## Para desarrollar

Requiere Node.js ≥ 20.

```bash
npm install      # una sola vez
npm test         # pruebas del motor (rates, amortization) y helpers de formato
npm run build    # genera dist/simulador.html
```

## Documentación

- Requisitos: [`docs/requirements/requirements-simulador-credito.md`](docs/requirements/requirements-simulador-credito.md)
- Arquitectura: [`docs/architecture/architecture-blueprint.md`](docs/architecture/architecture-blueprint.md)
- Algoritmos: [`docs/architecture/calculation-flow.md`](docs/architecture/calculation-flow.md)
- Decisiones: [`docs/architecture/adrs/`](docs/architecture/adrs/)

## Autor

Cristian D Avella
