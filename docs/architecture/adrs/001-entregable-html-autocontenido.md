# ADR-001 — El entregable es un archivo HTML autocontenido

- **Estado:** Aceptado
- **Fecha:** 2026-11-16
- **Decisores:** Cristian D Avella
- **Requisitos relacionados:** RF-01, RNF-01, RNF-02, RNF-05, riesgos R1 y R2 (`docs/requirements/requirements-simulador-credito.md`)

## Contexto

El profesor recoge los proyectos en una USB. Tiene que poder abrir y usar el software sin instalar nada, sin conocimientos técnicos y, en el peor caso, sin internet. Su sistema operativo no está confirmado (probablemente Windows). La entrega es el 2026-11-27, y lo que se evalúa es la corrección financiera.

## Decisión

El entregable es **un solo archivo `.html`**. Contiene todo su código y sus estilos, no hace peticiones a la red ni carga recursos de internet (CDN), y se abre con doble clic en el navegador que ya tenga el computador. En la USB se copia con un nombre evidente, por ejemplo `ABRIR SIMULADOR.html`.

## Alternativas consideradas

| Alternativa | Por qué se rechazó |
|---|---|
| **Ejecutable `.exe`** (Python + PyInstaller, Electron, etc.) | Un ejecutable sin firma puede activar Windows SmartScreen o el antivirus, y los empaquetados con PyInstaller son conocidos por falsos positivos. No abre en macOS. Pesa entre 10 y 150 MB, y el empaquetado consume tiempo de un plazo de 12 días. |
| **Libro de Excel** (fórmulas o macros) | Necesita Excel instalado. Los abonos múltiples, cada uno con reducir cuota o reducir plazo, son muy difíciles de modelar solo con fórmulas. Con macros, el profesor tendría que pulsar "Habilitar contenido". |
| **Solo un link (URL)** | Falla si no hay internet en el computador de evaluación (A2). Se conserva como respaldo, no como entrega principal. |

## Consecuencias

- **Positivas:** funciona en Windows, macOS y Linux sin instalar nada y sin internet. Un HTML no es un ejecutable, así que el antivirus no lo bloquea. El mismo archivo se puede publicar como URL de respaldo (R4).
- **Negativas:** se abre en una pestaña del navegador, y alguien podría percibirlo como "una página" y no como "un programa". Se mitiga con un nombre, un título y un diseño propios. Además, ninguna librería se puede cargar por CDN: todo lo que se use, como una librería de gráficas, tiene que ir dentro del archivo.
- **Neutrales:** sin persistencia en servidor. Los datos de la simulación viven en la pestaña y se pierden al cerrarla, lo cual es aceptable para un simulador.

## Notas de implementación

- Prueba de aceptación: abrir el archivo desde la USB, con el Wi-Fi apagado, en Chrome o Edge en Windows. Si es posible, también en Safari o Chrome en macOS.
- Si más adelante se quiere un `.exe` de respaldo, se empaqueta este mismo HTML, sin reescribir la lógica.

## Criterios para revisar la decisión

- El profesor exige explícitamente un ejecutable o una herramienta concreta (Excel, Python…).
- El computador de evaluación tiene bloqueados los archivos HTML locales o su navegador es muy antiguo.
