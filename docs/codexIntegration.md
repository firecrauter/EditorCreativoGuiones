# Codex CLI en el Editor Creativo

Integración implementada para uso personal local en **2.0.10-es.2**, sobre `codex-cli 0.163.0`. Revisión y pruebas reales: **13 de noviembre de 2026**.

## Abrir y usar

Ejecutá `iniciarEditor.cmd` y abrí el proyecto `primerCorto`. En **Historia y personajes → Codex · ChatGPT** aparece el asistente. Usa la sesión existente del CLI; el botón «Conectar Codex» comprueba la conexión, sin iniciar una generación. Muestra los modelos disponibles y el cupo informado por Codex.

Acciones disponibles:

- **Proponer guion:** propone título, premisa y cambios o nuevos beats. Conserva los IDs existentes; no elimina beats automáticamente.
- **Analizar estructura:** observa causas y consecuencias y propone cambios causales. Las observaciones se conservan en el historial.
- **Desarrollar personaje:** trabaja deseo, conflicto, arco, relaciones, voz y aspecto. Con un personaje seleccionado, la propuesta queda limitada a ese personaje.
- **Desglosar en planos:** prepara título, acción, encuadre, cámara, duración, personajes y prompt visual para cada plano. Los planos aparecen en la pestaña **Storyboard** al aplicar la propuesta.
- **Generar retrato:** usa el personaje seleccionado. También se abre directamente desde su ficha.
- **Generar boceto:** usa el plano seleccionado; su ficha tiene un acceso directo. Los retratos de sus personajes se seleccionan como referencias iniciales y se pueden desmarcar.
- **Generar imagen:** acepta un pedido libre y referencias visuales del proyecto.

Las propuestas de texto se revisan antes de **Aplicar propuesta**. Una imagen puede usarse como retrato, asignarse al plano o enviarse al lienzo con **Crear nodo imagen**. Cada pedido de imagen solicita una imagen; admite hasta cuatro referencias existentes del proyecto, de hasta 10 MiB cada una.

En el **nodo Imagen**, seleccioná el nodo y pulsá **Codex · ChatGPT** en su barra. Un nodo vacío también muestra **Generar con Codex**. Para editar una imagen, marcá «Imagen actual del nodo», describí el cambio y generá una variante. **Usar en este nodo** cambia su salida. Las herramientas originales de otros proveedores conservan sus propias configuraciones; el acceso de Codex utiliza este panel.

## Sesión, cupo y modalidad

Se exige que `account/read` informe autenticación `chatgpt`. Si no hay sesión o el CLI está en modalidad de clave API, el editor detiene el pedido y explica cómo iniciar sesión con `codex login`. No abre, copia ni guarda tokens en los proveedores de Toonflow. Se eliminan claves y tokens de proveedor del entorno del proceso hijo y se selecciona el proveedor oficial de Codex. No hay alternativa automática a una API paga.

La herramienta integrada permite generación y edición desde Codex CLI. [Imágenes en Codex](https://learn.chatgpt.com/docs/image-generation). Usa el cupo compartido de la suscripción; las imágenes consumen aproximadamente 3–5 veces más que turnos similares sin imágenes. Después del cupo pueden usarse créditos disponibles. El panel muestra si la cuenta declara créditos y rechaza nuevos pedidos cuando el cupo consultado está agotado. Otras sesiones comparten uso; la consulta previa no reserva cupo. [Uso y límites](https://learn.chatgpt.com/docs/pricing).

No se configuraron claves API ni se compraron créditos durante las pruebas. Los pedidos reales se hicieron con la sesión existente de ChatGPT. Esto no equivale a generación ilimitada.

## Qué se implementó

El servidor Bun inicia `codex app-server` por `stdio` y usa JSONL. Hay un proceso bajo demanda y un trabajo activo a la vez en el editor. Cada acción crea una conversación efímera con el contexto narrativo actual; el historial del editor se guarda en el proyecto. La documentación del protocolo contempla integración, eventos y cancelación. [App-server oficial](https://learn.chatgpt.com/docs/app-server).

Los puntos principales del código son:

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `apps/server/src/utils/codex/client.ts` | Descubrimiento del CLI, proceso sin shell, intercambio RPC y control de conexión. |
| `apps/server/src/utils/codex/index.ts` | Cuenta, modelos y límites; trabajos, prompts, propuestas, imágenes e historial. |
| `apps/server/src/routes/codex/` | Estado, envío, consulta, historial y cancelación, restringidos al editor local. |
| `packages/story/` | Formato de historia y validación compartida de solicitudes, resultados y aplicación de propuestas. |
| `packages/nodeShared/src/components/codexPanel.vue` | Panel reutilizado por el espacio narrativo y el nodo Imagen. |
| `apps/web/src/pages/workspace/panels/storyPanel.vue` | Propuestas narrativas, fichas de personajes y storyboard. |
| `packages/nodes/imageNode/src/index.vue` | Generación o edición desde el nodo y aplicación a su salida. |

El proceso creativo tiene comandos de terminal, hooks, subagentes, conectores y búsqueda web desactivados. También desactiva los servidores MCP heredados para esos trabajos y rechaza solicitudes de herramientas o permisos que esta integración no ofrece. Las imágenes usan la herramienta integrada, no un script con una clave API.

El modelo recibe el contexto enviado por el panel y las referencias seleccionadas. Su respuesta se valida antes de aplicarla. Una propuesta de texto deja de ser aplicable si cambió la historia desde el pedido. La escritura utiliza revisiones de archivo; un conflicto no sobrescribe la versión externa. Los trabajos ya aplicados se identifican para evitar aplicarlos dos veces.

## Archivos e historial

- `story.json` usa ahora formato **versión 2**, con planos y registros de propuestas aplicadas. Se pueden cargar historias de versión 1; se convierten al guardar cambios. Una instalación antigua del fork no debe usarse para editar el formato nuevo.
- `assets/codex/` conserva los resultados originales importados de Codex. Se valida ubicación de origen, formato PNG/JPEG/WebP y límite de 20 MiB antes de importarlos.
- `codexHistory/` guarda pedidos, contexto, resultados y estados, sin credenciales. El panel muestra los últimos 30. Este material forma parte del proyecto y debe tenerse en cuenta al compartir su ZIP.
- Crear un nodo reutiliza la importación normal del lienzo y su guardado. No se modifica el JSON del lienzo desde un modelo ni se habilita MCP externo.
- Cerrar el panel deja que el trabajo termine en el servidor. Se recupera desde Historial. Detener el servidor interrumpe los trabajos; al reabrir no se repiten automáticamente.
- El guion Markdown exportado incluye también los planos y sus imágenes asignadas. El ZIP conserva la historia, el historial y los recursos.

Antes de la prueba se conservó una copia del proyecto en `work/codexExampleBefore20261113223432/`. El proyecto, la copia, los resultados y los registros están excluidos de Git.

## Validación real del ejemplo

Sobre «La última luz» se completaron siete pedidos:

| Acción | Resultado verificado |
| --- | --- |
| Guion | Propuesta real recibida y aplicada en la interfaz; conserva 3 beats, causas y 21 segundos. |
| Personaje | Ficha de Ana desarrollada y aplicada; conserva su identidad y arco. |
| Retrato | PNG real de 1254 × 1254, asignado a Ana y convertido en nodo de imagen. |
| Storyboard | 3 planos con duraciones 7, 6 y 8 segundos, aplicados y visibles en su pestaña. |
| Boceto | PNG real de 1672 × 941, usando el retrato como referencia; asignado al primer plano y convertido en nodo. |
| Estructura | Análisis real completado y conservado para revisar en Historial. |
| Nodo Imagen | Edición real de 1672 × 941 con la imagen actual como referencia; variante aplicada y comprobada en la salida guardada del nodo. |

Además se verificaron: cancelación temprana, rechazo de concurrencia y pedidos duplicados (409), aislamiento del historial de otro proyecto (404), rechazo de otro Origin y de solicitudes sin la cabecera del editor (403) y parámetros inválidos (400).

Los registros privados están en `localRuntime/codexFlowResults.json`, `codexHttpResults.json`, `codexFinalTypecheck.log`, `codexBuild.log` y `codexDependencyAudit.json`. Los cinco chequeos de tipos relevantes y la compilación pasaron; `bun audit` terminó con salida 0 y `{}`.

No se probó una cancelación a mitad de una generación de imagen, el cambio de cuenta en pleno turno, una cuenta sin cupo ni otros sistemas operativos o versiones de CLI. La continuidad visual depende del modelo y de las referencias: no se garantiza identidad o geometría perfectas. La generación de video, voz o música por la suscripción y el animatic automático quedan fuera de esta integración.
