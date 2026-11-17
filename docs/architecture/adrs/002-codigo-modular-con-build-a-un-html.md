# ADR-002 — Código fuente modular que se compila a un solo HTML

- **Estado:** Aceptado
- **Fecha:** 2026-11-16
- **Decisores:** Cristian D Avella
- **Relacionado:** ADR-001 (entregable HTML autocontenido), `docs/architecture/calculation-flow.md`

## Contexto

ADR-001 fija que el profesor recibe un solo archivo HTML. Lo que se califica es la corrección financiera: la conversión de tasas y la tabla con abonos. Hay 12 días hasta la entrega y un solo desarrollador.

## Decisión

1. El **motor de cálculo** (`src/engine/`) son funciones puras en JavaScript (módulos ES) sin acceso al DOM ni a la red. Recibe números y devuelve datos.
2. La **interfaz** (`src/ui/`) lee los formularios, llama al motor y pinta los resultados. La gráfica se dibuja en SVG propio, sin librería.
3. Un **script de build** (`npm run build`) empaqueta el motor y la interfaz en **un solo archivo** `dist/simulador.html`, con todo el JS y el CSS adentro. Para empaquetar se usa **esbuild**, la única dependencia de desarrollo.
4. Las **pruebas automáticas** del motor usan el ejecutor nativo de Node (`node --test`), sin dependencias. Implementan los casos de `calculation-flow.md` §1 y §2.3.
5. Se usa **JavaScript plano**, sin framework ni TypeScript.

## Alternativas consideradas

| Alternativa | Por qué se rechazó |
|---|---|
| Un solo HTML escrito a mano | El motor no se puede probar de forma automática, y los errores de cálculo solo se detectarían a mano, justo en lo que se califica |
| Framework web (React, Vue…) | Exceso de dependencias y configuración para el plazo; más que explicar en la sustentación; el beneficio solo aparece en interfaces grandes |
| Unir los archivos con un script propio, sin esbuild | Sin dependencias, pero frágil: habría que quitar `import`/`export` con texto. esbuild es estándar, rápido y solo se usa al desarrollar |
| TypeScript | Detecta errores de tipos, pero agrega compilación y configuración; con un motor pequeño, las pruebas automáticas cubren el riesgo principal |

## Consecuencias

- **Positivas:** cada caso de prueba del documento de algoritmos se vuelve una prueba que corre en segundos. El motor se puede reutilizar si algún día hay un servidor. El archivo que va a la USB es el mismo que se publica en internet (ADR-003).
- **Negativas:** para generar el entregable hay que ejecutar `npm install` una vez y `npm run build`. Esto lo hace solo el autor, nunca el profesor.
- **Neutrales:** necesita Node.js ≥ 20 en la máquina del autor.

## Notas de implementación

- **Invariante:** `src/engine/` no importa nada de `src/ui/` ni usa `document`, `window` ni `fetch`.
- **Invariante:** `dist/simulador.html` no tiene ninguna referencia a recursos externos (`http://`, `https://`, `//`). El build falla si encuentra alguna.

## Criterios para revisar la decisión

- La interfaz crece al punto de que la manipulación manual del DOM se vuelve inmanejable.
- esbuild deja de mantenerse o no puede generar un solo archivo.
