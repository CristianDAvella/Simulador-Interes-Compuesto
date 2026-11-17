# Requisitos — Simulador de Crédito con Abonos a Capital

- **Proyecto:** Proyecto final de Ingeniería Económica
- **Autor:** Cristian D Avella
- **Fecha:** 2026-11-15
- **Estado:** Validado (2026-11-15) — listo para diseño; ver §7 para las respuestas y los supuestos que quedan
- **Referencia:** simulador de Crédito de Libre Inversión de Bancolombia (páginas guardadas en la raíz del proyecto)

---

## 1. Problem Statement Brief

**Situación.** Quien toma un crédito de cuota fija no ve con facilidad cómo se reparte cada cuota entre interés y capital. Tampoco ve cuánto cambia la deuda si hace pagos extraordinarios. Los simuladores bancarios, como el de Bancolombia, calculan la cuota y el plan de pagos, pero **no dejan simular abonos extraordinarios a capital ni comparar si conviene reducir la cuota o el plazo**.

**Job-to-be-done (usuario del simulador).**
> Cuando estoy evaluando o pagando un crédito, quiero ver el plan de pagos y el efecto de abonar a capital, para decidir si reduzco la cuota o el plazo y cuánto interés me ahorro.

**Job-to-be-done (evaluador, el profesor).**
> Cuando recibo el proyecto en una USB, quiero abrirlo y usarlo de inmediato, sin instalar nada ni saber de programación, para evaluar si el modelo financiero es correcto.

**Qué pasa si no existe.** La persona acepta el plan del banco sin poder cuantificar estrategias de prepago. En lo académico, el proyecto no muestra el dominio de equivalencia de tasas, anualidades y amortización.

**Nota de terminología.** El proyecto se ha llamado "simulador de interés compuesto". Lo que se construye es un **simulador de amortización de crédito**, cuyo fundamento es el interés compuesto. **No** incluye proyecciones de ahorro o inversión (decisión del 2026-11-15).

## 2. Usuarios

| Usuario | Rol | Necesidad principal |
|---|---|---|
| Profesor de Ingeniería Económica | Evaluador, no técnico al usar el software | Abrir el software desde la USB sin instalar nada, usarlo sin manual y verificar los cálculos |
| Cristian D Avella (autor) | Desarrollador y expositor | Demostrar el modelo en la sustentación y que sea fácil de explicar |
| Usuario final hipotético | Persona con un crédito | Entender su plan de pagos y el efecto de sus abonos |

## 3. Jerarquía de necesidades (con criterios de aceptación)

> Convención: cada requisito empieza con "El sistema debe…" y no menciona tecnología. Los criterios usan la forma *Dado / Cuando / Entonces*.

### N1 — Acceso sin fricción (Must)

**RF-01.** El sistema debe poder usarse desde la USB sin instalar nada, sin configurar nada y sin conocimientos técnicos.
- *Dado* un computador del profesor con la USB conectada, *cuando* abre el entregable, *entonces* ve el simulador listo para usar en ≤ 2 acciones (por ejemplo, abrir la carpeta y hacer doble clic).
- *Dado* que el computador no tiene internet, *entonces* el simulador funciona igual (supuesto A2).
- *Dado* un antivirus o una advertencia de seguridad del sistema operativo, *entonces* el entregable no se bloquea, o la advertencia se puede descartar siguiendo una instrucción visible de una línea (riesgo R1).

**RF-02.** El sistema debe poder usarse sin manual: cada campo tiene etiqueta en español, unidad (pesos, meses, %) y un ejemplo o valor por defecto.

### N2 — Cálculo del crédito (Must)

**RF-03.** El sistema debe recibir: monto del crédito, plazo en meses y tasa de interés.
**RF-04.** El sistema debe **convertir entre expresiones de tasa** (requisito explícito del curso, 2026-11-15) y usar internamente la tasa efectiva del periodo de pago (mensual):
- Efectiva periódica: mensual, bimestral, trimestral, semestral, anual (EA).
- Nominal anual vencida con capitalización mensual, trimestral o semestral (NAMV, NATV, NASV).
- Nominal anual anticipada (NAMA, NATA…) y efectiva periódica anticipada (Should, ver §6).
- *Dado* 1,84 % MV, *entonces* muestra ≈ 24,46 % EA y ≈ 22,08 % NAMV.
- *Dado* 24,46 % EA, *entonces* muestra ≈ 1,84 % MV (ida y vuelta consistente, ±0,01 pp).
- *Dado* 2 % mensual anticipada, *entonces* muestra ≈ 2,0408 % mensual vencida (i = d / (1 − d)).

**RF-04b.** El sistema debe ofrecer la conversión de tasas también como **herramienta independiente**, sin crear un crédito, para que el profesor la pueda evaluar por separado.

**RF-05.** El sistema debe calcular la cuota fija mensual (sistema francés).
- *Dado* $200.000.000, 1,84 % MV, 84 meses, *entonces* la cuota sin seguro es **$4.695.074** (±$1), igual a la referencia de Bancolombia.

**RF-06.** El sistema debe generar la tabla de amortización completa, con una fila por periodo: n.º de cuota, saldo inicial, cuota, interés, abono a capital, abono extraordinario (si hay) y saldo final.
- *Dado* el caso de RF-05, *entonces* la cuota 1 tiene interés $3.680.000, capital $1.015.074 y saldo final $198.984.926.
- El saldo final del último periodo es $0 (±$1 por redondeo).

**RF-07.** El sistema debe mostrar un resumen: cuota, total pagado, total de intereses y número de cuotas.

### N3 — Abonos extraordinarios a capital (Must, diferenciador del proyecto)

**RF-08.** El sistema debe permitir registrar **uno o varios** abonos extraordinarios, cada uno con mes y monto.
**RF-09.** *(Confirmado: el profesor enseñó ambas modalidades.)* Para **cada** abono, el usuario debe poder elegir si **reduce cuota** (se mantiene el número de cuotas restantes y se recalcula la cuota) o **reduce plazo** (se mantiene la cuota y bajan las cuotas restantes).
- **Ejemplo de aceptación** (crédito de $10.000.000, 2 % MV, 12 meses, cuota $945.596; abono de $2.000.000 después de pagar la cuota 3; saldo $7.718.178 → $5.718.178):
  - *Reducir cuota* → la nueva cuota para las 9 restantes es **$700.565**.
  - *Reducir plazo* → con la cuota de $945.596 quedan **6 cuotas completas + 1 cuota final menor** (6,51 periodos).
- El abono se aplica 100 % a capital, después de la cuota ordinaria de ese mes (supuesto A5).

**RF-10.** El sistema debe validar los abonos: no permite un abono mayor al saldo ni en un mes posterior a la cancelación del crédito. Si el abono iguala el saldo, el crédito queda cancelado en ese mes.

**RF-11.** El sistema debe comparar **el escenario sin abonos contra el escenario con abonos**: intereses ahorrados, cuotas o meses ahorrados y nueva cuota.

### N4 — Comprensión y evaluación (Should)

**RF-12.** El sistema debe mostrar las fórmulas usadas (cuota, conversión de tasa, recálculo tras el abono), para que el profesor pueda verificarlas.
**RF-13.** El sistema debe tener una gráfica de la evolución del saldo con abonos y sin abonos.
**RF-14.** El sistema debe permitir exportar o imprimir la tabla de amortización.

### N5 — Paridad opcional con la referencia (Could)

**RF-15.** Seguro de vida mensual fijo sumado a la cuota (Bancolombia: $287.000 sobre $200 M).
**RF-16.** Modalidad "cuota variable" (abono constante a capital) como alternativa a la cuota fija.
**RF-17.** Frecuencia de pago distinta a la mensual (trimestral, semestral).

## 4. Requisitos no funcionales

| ID | Requisito | Cómo se verifica |
|---|---|---|
| RNF-01 | Funciona sin internet | Abrirlo con el Wi-Fi apagado |
| RNF-02 | Funciona en el computador del profesor (SO desconocido, ver A1) | Prueba en Windows, más macOS si aplica |
| RNF-03 | Responde de inmediato (< 1 s) para plazos de hasta 360 meses | Prueba manual |
| RNF-04 | Montos con formato colombiano ($ 1.000.000) y tasas con coma decimal | Inspección visual |
| RNF-05 | Ningún dato sale del computador | Revisión, sin llamadas de red |

## 5. Inventario de restricciones y mapa de supuestos

### Restricciones reales (hechos)

| Restricción | Fuente |
|---|---|
| Entrega física en USB | El profesor lo mencionó |
| El evaluador no tiene conocimientos técnicos y no debe ejecutar ningún proceso | Requisito del curso |
| Es un proyecto académico de Ingeniería Económica: lo que se evalúa es la corrección financiera | Contexto |
| Debe incluir abono a capital con opción de reducir cuota o plazo | Requisito del proyecto |
| Equipo: Cristian (solo) | Contexto |
| **Fecha de entrega: 2026-11-27** (12 días desde el 2026-11-15) | Profesor |
| No hay enunciado ni rúbrica escrita: el alcance lo fija este documento | Respuesta del 2026-11-15 |
| Conversión entre tasas obligatoria | Respuesta del 2026-11-15 |

### Supuestos (por validar)

| ID | Supuesto | Riesgo si es falso | Cómo validarlo |
|---|---|---|---|
| A1 | El profesor usa Windows (probable, sin confirmar) | Un ejecutable de Windows no abriría en Mac | Preguntar a compañeros; mitigar con un entregable multiplataforma |
| A2 | El computador de evaluación puede no tener internet | Una entrega que solo sea URL fallaría | Asumir que no hay internet (conservador) |
| A3 | El profesor no exige un lenguaje o herramienta específica (no hay enunciado escrito) | Rehacer el proyecto | Preguntar en clase antes de avanzar mucho |
| A4 | La tasa es fija durante todo el crédito (no indexada a DTF/IBR) | Hay que modelar tasa variable | Revisar el enunciado |
| A5 | El abono se aplica después de la cuota ordinaria del mes y va 100 % a capital (convención bancaria estándar; Cristian no recuerda la del curso) | Diferencias con lo que espera el profesor | El software declara la convención en pantalla, junto a las fórmulas (RF-12) |
| A6 | En "reducir plazo", la última cuota es residual (menor) | El profesor podría esperar otra convención | Se declara en pantalla; la tabla muestra la cuota residual de forma explícita |
| A7 | Los periodos son meses (no hay fechas calendario) | Habría que manejar fechas | Revisar el enunciado |

### Riesgos (pre-mortem: "la nota salió mal porque…")

| ID | Riesgo | Mitigación (a decidir en diseño) |
|---|---|---|
| R1 | El antivirus o SmartScreen de Windows bloquea un ejecutable sin firma y el profesor no logra abrirlo | Entregable que no dependa de un ejecutable, o llevar uno de respaldo |
| R2 | El SO del profesor no es compatible con el entregable | Entregable multiplataforma, o dos variantes en la USB |
| R3 | Los cálculos no coinciden con los del profesor por la convención de redondeo, de tasas o de abono | Mostrar las fórmulas (RF-12) y casos verificados contra la referencia |
| R4 | La USB se pierde o se corrompe | Copia adicional (URL o correo) como respaldo |
| R5 | No se termina antes del 2026-11-27 | Walking skeleton listo hacia el 2026-11-21; después solo Should y Could; recortar según §6 |

## 6. Definición de alcance (MoSCoW)

**Walking skeleton:** con monto, tasa y plazo se obtiene la cuota y la tabla, más uno o varios abonos con reducir cuota o reducir plazo, en un entregable que abre desde la USB.

| Prioridad | Requisitos |
|---|---|
| **Must** | RF-01 a RF-11 (incluye RF-04 vencidas y RF-04b), RNF-01, RNF-02, RNF-04 |
| **Should** | RF-12 (fórmulas y convenciones visibles, sube de importancia porque no hay rúbrica), tasas anticipadas en RF-04, RF-13 (gráfica), RF-14 (exportar o imprimir), RNF-03 |
| **Could** | RF-15 (seguro), RF-16 (cuota variable), RF-17 (frecuencias) |
| **Won't (V1)** | Simulación de ahorro o inversión, tasa variable indexada (DTF/IBR), fechas calendario, edad o validación de crédito, cuentas de usuario, guardar en la nube |

**Disparadores para reconsiderar lo diferido:**
- Si el enunciado o la rúbrica pide seguro, cuota variable o tasa variable, pasa a Must.
- Si el walking skeleton queda listo antes de tiempo, se agregan los Could en el orden RF-15 → RF-16 → RF-17.

## 7. Respuestas a las preguntas abiertas (2026-11-15)

| # | Pregunta | Respuesta | Efecto |
|---|---|---|---|
| 1 | ¿Hay enunciado o rúbrica? | No | Este documento fija el alcance; RF-12 sube de importancia |
| 2 | Fecha de entrega | 2026-11-27 | Nueva restricción; R5 con hitos |
| 3 | SO del profesor | Probablemente Windows | A1 sigue sin confirmar; preferir un entregable multiplataforma |
| 4 | Convención del abono | El profesor enseñó ambas modalidades, reducir cuota y reducir plazo (confirmado el 2026-11-15); no recuerda el momento del abono ni el manejo de la cuota residual | RF-09 confirmado como Must; A5 y A6 se adoptan por convención estándar y se declaran en pantalla |
| 5 | Forma de la tasa | Hay que poder convertir entre tasas | RF-04 se amplía y se agrega RF-04b |

## 8. Handoff a diseño (system-design)

Listo. Insumos para el diseño:
- **Restricción dominante:** que se abra desde la USB sin instalación y sin internet, con SO incierto. Esto define el formato del entregable (ADR-001).
- **Atributo de calidad prioritario:** corrección financiera verificable, por encima de lo visual.
- **Algoritmos a documentar con diagramas Mermaid** en `docs/architecture/`: (1) conversión de tasas (cualquier expresión → efectiva periódica → cualquier expresión); (2) generación de la tabla con abonos (reducir cuota o reducir plazo, abonos múltiples, cuota residual).
