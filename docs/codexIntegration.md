# Codex CLI en el Editor Creativo

Integración para uso personal local en **2.0.10-es.3**, sobre `codex-cli 0.163.0`. El panel narrativo se probó el **13 de noviembre de 2026**; el proveedor y el Toonflow Agent, el **14 de noviembre de 2026**.

## Proveedor de Toonflow: texto e imágenes

**Codex CLI · ChatGPT** aparece en **Ajustes → Modelos de texto** y **Modelos de medios**, con una tarjeta que sigue la interfaz existente. No hay que añadir una URL, inventar una clave ni copiar tokens. «Conectar Codex» o «Actualizar modelos» consulta la sesión y el catálogo, sin generar contenido.

En el **Toonflow Agent**, abrí el selector de modelo del cuadro de mensaje y elegí uno de Codex. Se consultan los modelos visibles que devuelve el CLI; durante la prueba fueron ocho. La lista se conserva como máximo 15 segundos y puede actualizarse desde Ajustes. Los niveles de razonamiento se limitan a los compatibles con el runtime actual de Toonflow: `low`, `medium`, `high`, `xhigh` y `max` para los modelos probados; `ultra` del CLI todavía no se ofrece en ese selector. «Default» usa el valor predeterminado informado por Codex.

El agente conserva sus herramientas de lectura, escritura, lienzo, nodos y demás herramientas habilitadas en Toonflow. Los esquemas, validaciones, permisos y ejecución siguen a cargo del runtime existente. Codex elige la llamada mediante herramientas dinámicas; antes de entregarla a Toonflow se interrumpe ese muestreo del CLI. El próximo muestreo recibe la conversación y el resultado real guardado por Toonflow. Esto evita ejecutar una misma herramienta tanto en Codex como en Toonflow. Cada muestreo usa una conversación efímera; el historial visible y reabrible del agente sigue en `.agent/sessions/` del proyecto.

Para imágenes, elegí **Imágenes de Codex · ChatGPT** en el selector normal del nodo de generación de imágenes. También puede elegirlo y ejecutar el nodo el agente. Usa el mismo puente de imágenes del panel narrativo y conserva el resultado en los archivos e historial normales del nodo. Se solicita una imagen por pedido, con hasta cuatro referencias del proyecto. Se pueden recuperar resultados de trabajos ya guardados sin volver a generar; un trabajo interrumpido por el cierre del servidor no se reenvía automáticamente.

El agente puede pedir confirmación antes de ejecutar una generación, siguiendo sus reglas actuales. En la prueba pidió confirmar una única imagen y mostró `codexCli / codexImage`, la referencia, el prompt y el uso de la sesión de ChatGPT. No se cambió ese flujo de confirmación.

Este proveedor no ofrece estimación monetaria: la consulta de precio devuelve «sin estimación», no una cotización de API. Usa el cupo compartido de la suscripción y no cambia a otro proveedor si falla. La proporción y el tamaño se trasladan como indicaciones al generador; no garantizan dimensiones exactas. No se ofrecen video, audio, máscaras ni lotes en este adaptador.

El proveedor personal se restringe al editor local, con comprobación de Origin, cabecera del editor y cliente local en sus solicitudes directas. No se publica como proveedor de una instalación multiusuario. Los procesos de Codex mantienen desactivados shell, hooks, aplicaciones, subagentes y MCP heredados; el agente usa las herramientas que ofrece y valida Toonflow.

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
| `apps/server/src/utils/codex/catalog.ts` | Catálogo dinámico y proveedor local de texto y medios. |
| `apps/server/src/utils/codex/stream.ts` | Adaptador de streaming y llamadas de herramientas al contrato del runtime de Toonflow. |
| `apps/server/src/utils/codex/media.ts` | Generación y recuperación de imágenes mediante el puente existente y los trabajos normales de medios. |
| `apps/server/src/routes/codex/` | Estado, envío, consulta, historial y cancelación, restringidos al editor local. |
| `packages/story/` | Formato de historia y validación compartida de solicitudes, resultados y aplicación de propuestas. |
| `packages/nodeShared/src/components/codexPanel.vue` | Panel reutilizado por el espacio narrativo y el nodo Imagen. |
| `apps/web/src/pages/workspace/panels/storyPanel.vue` | Propuestas narrativas, fichas de personajes y storyboard. |
| `packages/nodes/imageNode/src/index.vue` | Generación o edición desde el nodo y aplicación a su salida. |

El proceso de Codex tiene comandos de terminal, hooks, subagentes, conectores y búsqueda web desactivados. También desactiva los servidores MCP heredados y rechaza solicitudes de herramientas o permisos que esta integración no ofrece. En el agente, sólo las llamadas ofrecidas por Toonflow se entregan a su runtime para ejecutarse. Las imágenes usan la herramienta integrada, no un script con una clave API.

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

## Validación del proveedor y del agente

La prueba del 14 de noviembre usó `primerCorto` y la sesión existente de ChatGPT, sin configurar claves API ni comprar créditos:

- **Catálogo:** ocho modelos de texto y el modelo de imágenes aparecen en los catálogos normales y en Ajustes.
- **Herramientas y texto:** GPT-6.1-Sol usó `read` de Toonflow para leer `story.json` y proponer una mejora en español. La conversación se recuperó en el agente desde su historial.
- **Otro modelo y visión:** GPT-6-Luna describió correctamente el cabello oscuro y la chaqueta azul del retrato a través del endpoint normal de texto con referencia visual.
- **Lienzo y medios desde la interfaz:** el agente leyó la historia, consultó el lienzo, creó y rellenó «Guion · Codex proveedor», configuró un nodo normal de generación con `codexCli / codexImage` y el retrato de Ana como referencia, ejecutó una única generación y creó «Boceto · Codex proveedor» con su resultado. Completó el ciclo de llamadas y resultados de herramientas, incluido el formulario de confirmación.
- **Resultado de imagen:** PNG real de **1672 × 941**, 2.929.199 bytes, generado en 43,88 segundos con una referencia. Se conservó el original en `assets/codex/` y la salida e historial del nodo en sus ubicaciones normales.
- **Conservación:** el ejemplo pasó de ocho a doce nodos, con dos resultados y dos nodos auxiliares de referencia y generación. Los ocho originales conservaron sus posiciones y salidas; `story.json` quedó idéntico a la copia previa.
- **Reapertura:** tras reiniciar el servidor y recargar Chrome se recuperaron el texto, los doce nodos y las imágenes. Se reabrió la conversación terminada desde «Conversaciones anteriores» y se verificó el grupo «Codex CLI · ChatGPT» con los ocho modelos en el selector del propio agente, sin generar de nuevo.
- **Cancelación y límites de acceso:** se detuvo una respuesta en curso con `/api/agent/stop` y se recibió «Se detuvo la generación». Un modelo inexistente devuelve 400; Origin externo, falta de cabecera y cliente no local devuelven 403. La consulta de precio de imágenes devuelve 200 y `null`, sin iniciar inferencia.
- **Tipos y compilación:** pasaron historia compartida, componentes compartidos, nodo Imagen, servidor y web. Servidor y web compilaron. No se añadieron dependencias.
- **Antivirus:** ClamAV analizó 1.150 archivos de código y compilación, 127,61 MiB, con cero detecciones y salida 0. Es un análisis de ese alcance, no una certificación de toda la PC.

La copia previa está en `work/codexProviderBefore20261114003812/`. Los registros privados están en `localRuntime/codexProviderCatalogResults.json`, `codexProviderAgentFirst.ndjson`, `codexProviderTextVision.sse`, `codexProviderExampleResults.json`, `codexProviderHttpResults.json`, `codexProviderCancel.ndjson`, `codexProviderFinalTypes.log`, `codexProviderFinalBuild.log`, `codexProviderWebBuild.log` y `codexProviderAntivirus.log`. No se publican los proyectos, medios, conversaciones ni registros en Git.

No se probaron todos los modelos individualmente, agotamiento real de cupo, cambios de cuenta, tareas simultáneas de varios agentes, compresión de una conversación larga ni cancelación de una imagen ya en generación. Las pruebas de texto, herramientas e imagen descritas sí fueron reales.
