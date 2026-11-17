# Simulador de Crédito con Abonos a Capital

Proyecto final de Ingeniería Económica. Simula un crédito de cuota fija, convierte entre expresiones de tasa (EA, MV, NAMV, anticipadas…) y permite registrar abonos extraordinarios a capital, eligiendo en cada uno si **reduce la cuota** o **reduce el plazo**.

> Estado: en diseño. Todavía no hay versión usable.

## Para usarlo

Abrir el archivo `simulador.html` con doble clic. No requiere instalación ni internet.

## Para desarrollar

Requiere Node.js ≥ 20.

```bash
npm install      # una sola vez
npm test         # pruebas del motor de cálculo
npm run build    # genera dist/simulador.html
```

## Documentación

- Requisitos: [`docs/requirements/requirements-simulador-credito.md`](docs/requirements/requirements-simulador-credito.md)
- Arquitectura: [`docs/architecture/architecture-blueprint.md`](docs/architecture/architecture-blueprint.md)
- Algoritmos: [`docs/architecture/calculation-flow.md`](docs/architecture/calculation-flow.md)
- Decisiones: [`docs/architecture/adrs/`](docs/architecture/adrs/)

## Autor

Cristian D Avella
