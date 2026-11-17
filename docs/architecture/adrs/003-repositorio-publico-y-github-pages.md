# ADR-003 — Repositorio público en GitHub y publicación en GitHub Pages

- **Estado:** Aceptado
- **Fecha:** 2026-11-16
- **Decisores:** Cristian D Avella
- **Relacionado:** ADR-001, ADR-002, riesgo R4 (pérdida o falla de la USB)

## Contexto

La entrega principal es la USB (ADR-001). Hace falta un respaldo accesible por link, por si la USB falla o el profesor quiere revisar desde otro equipo, y también un historial de versiones del código.

## Decisión

- El código vive en un **repositorio público de GitHub**, con la rama `main`.
- Un workflow de **GitHub Actions** corre las pruebas, genera `dist/simulador.html` y lo publica en **GitHub Pages** en cada push a `main`. Si las pruebas fallan, no se publica.
- Las páginas guardadas del simulador de Bancolombia **no se versionan** (`.gitignore`): son contenido de terceros y solo sirven de referencia local.

## Alternativas consideradas

| Alternativa | Por qué se rechazó |
|---|---|
| Repositorio privado + Netlify o artifact de Claude | El código no sería visible, pero la publicación sería manual y quedaría separada del historial. El autor prefirió público. |
| Netlify Drop (arrastrar el HTML) | Cada cambio exige volver a subir el archivo a mano, y no se pueden correr las pruebas antes de publicar |
| Sin publicación (solo USB) | Si la USB falla, no hay respaldo (R4) |

## Consecuencias

- **Positivas:** respaldo por link sin costo. Lo publicado siempre pasó las pruebas. Hay historial completo del proyecto.
- **Negativas:** el código es visible para cualquiera, incluidos compañeros, antes de la entrega del 2026-11-27. Esto lo aceptó el autor.
- **Neutrales:** nada del repositorio puede tener rutas absolutas con el nombre del usuario local ni datos personales.

## Criterios para revisar la decisión

- Se detecta copia del proyecto antes de la entrega: pasar el repositorio a privado hasta el 2026-11-27.
