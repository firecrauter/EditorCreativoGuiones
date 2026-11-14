# Editor Creativo sobre Toonflow

Fork personal de [Toonflow](https://github.com/HBAI-Ltd/Toonflow-app), basado en **v2.0.10**, commit `6086cdffceb704a632eca143dd16cd461a78cdac`. Conserva su licencia MIT y su arquitectura Vue, Bun y extensiones.

Repositorio: [firecrauter/EditorCreativoGuiones](https://github.com/firecrauter/EditorCreativoGuiones). La rama de trabajo es `editor-es`; `upstream` apunta al proyecto original.

## Abrir en esta PC

Ejecutá `iniciarEditor.cmd` en la carpeta principal. Arranca el servidor en segundo plano y abre Chrome en **http://127.0.0.1:3000**. `detenerEditor.cmd` detiene únicamente el proceso registrado por este lanzador. Guardá los cambios antes de detenerlo.

La versión compilada usa un selector de carpetas dentro del navegador. Los proyectos están en `data/workspaces/`. La configuración y las extensiones están en `data/`; los registros de arranque, en `localRuntime/editorOut.log` y `localRuntime/editorErr.log`.

No hay generación paga configurada. Podés escribir, organizar beats y personajes, importar medios, usar la previsualización 3D y exportar proyectos sin cargar una clave de IA.

## Espacio narrativo inicial

En un proyecto, **Historia y personajes** abre el nuevo espacio de trabajo:

- **Estructura:** guion por beats, tarjetas, duración, color, personajes asociados y vínculo «Provocado por». La selección de un beat se comparte entre el guion, las tarjetas, la franja de duración y el inspector.
- **Personajes:** tarjetas con retrato circular y ficha de rol, deseo, conflicto, arco, relaciones y notas.
- **Storyboard:** fichas de planos con beat de origen, encuadre, cámara, duración, personajes, prompt visual e imagen asignada.
- **Codex · ChatGPT:** propuestas revisables de texto y generación integrada de imágenes usando la sesión existente del CLI. También se abre desde el nodo Imagen. [Guía de uso y validación](codexIntegration.md).
- **Guardar:** escribe `story.json` usando la API de archivos de Toonflow y sus revisiones. Una modificación externa provoca un conflicto y conserva lo escrito en pantalla.
- **Exportar guion:** crea un Markdown nuevo dentro del proyecto. La exportación ZIP de Toonflow incluye la historia, los lienzos y los recursos.

El cierre del panel guarda los cambios. El navegador advierte si se intenta cerrar o recargar con cambios pendientes. El formato tiene versión e identificadores estables y se valida al cargar y guardar; un archivo inválido no se reemplaza silenciosamente.

Es un primer espacio narrativo funcional. El grafo completo de tramas, una línea de tiempo de montaje, relaciones visuales entre personajes y la sincronización automática de beats con nodos de producción quedan para próximas iteraciones.

## Referencias de diseño

[Causality](https://www.hollywoodcamerawork.com/causality.html) guía la selección sincronizada entre guion, beats e inspector, el color narrativo, las relaciones causales y la lectura de la duración. [Su manual](https://caudocs.hollywoodcamerawork.com/quick-start/basic-navigation) permite estudiar las interacciones sin copiar código propietario.

[STARC](https://github.com/story-apps/starc) guía el protagonismo visual de los personajes: retratos, tarjetas y fichas. Esta implementación es propia; no se copió código de Causality ni de STARC.

Toonflow aporta el lienzo, los nodos, los archivos, los medios, la dirección 3D y las extensiones. Codex reutiliza esa infraestructura para incorporar las imágenes generadas y sus referencias.

## Español

Se incorporó `es` al selector, a las solicitudes del servidor, a Day.js y a los componentes de Element Plus. Español y tema oscuro son los valores iniciales del fork.

Los catálogos se generaron con traducción local, sin servicios pagos; se corrigieron manualmente términos del recorrido principal. Los nodos y las extensiones integrados reciben textos en español durante la compilación. No se traducen los datos escritos por el usuario ni los identificadores de puertos, tipos o modelos.

La traducción es inicial: algunos textos técnicos, mensajes avanzados y contenido de proveedores requieren revisión editorial. Las extensiones instaladas posteriormente pueden traer su propio idioma. Los textos generados por un modelo dependen de sus instrucciones.

## Compilar de nuevo

En PowerShell, desde esta carpeta:

```powershell
$env:PATH = "$((Resolve-Path 'localRuntime\bun-windows-x64').Path);$env:PATH"
bun install --frozen-lockfile --ignore-scripts
bun run build:server
```

Después reiniciá con los accesos de detener e iniciar. El arranque habitual no instala dependencias ni compila de manera implícita.

Si falta el Bun local, descargá el ZIP de [Bun 1.4.3 para Windows x64](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.3) desde su fuente oficial y verificá su SHA256 antes de extraerlo en `localRuntime/`:

```text
bun-windows-x64.zip
0bf84e808552beea67bf1202a287a35c6c825d837b287b3f8e9dd513dba35d3d
```

El binario queda en `localRuntime/bun-windows-x64/bun.exe`. El fork usa Bun para ejecutar Vite y no necesita reemplazar el Node global de esta PC. FFmpeg y FFprobe se detectan en el sistema; los recursos de demostración se produjeron con esa instalación existente.

Para desarrollar: `bun run dev:plugins` y luego `bun run dev`. En ese modo, la interfaz está en `http://127.0.0.1:5173`; Windows puede mostrar su selector nativo de carpetas. La versión compilada de uso diario está en el puerto 3000.

## Alcance local y seguridad

El servidor escucha únicamente en `127.0.0.1` y rechaza otros hosts y orígenes web. Se retiró el registro de telemetría del inicio y la carga automática de anuncios y exploración comunitaria de la portada. Los servicios oficiales de cuentas, extensiones y proveedores siguen siendo funciones separadas que pueden contactar Internet si se utilizan.

No se configuraron claves, pagos, MCP externo, equipos, acceso móvil ni alojamiento público. Las extensiones y herramientas de agentes son código ejecutable; su revisión y la protección de los datos siguen siendo necesarias al incorporar otras.

Los resultados y límites concretos de la revisión están en [revisionLocal.md](revisionLocal.md). Una auditoría de paquetes y un antivirus no certifican la ausencia total de malware ni de vulnerabilidades.

## Codex CLI

La [integración con Codex CLI](codexIntegration.md) ya está implementada y probada con texto, retrato, boceto y edición desde el nodo Imagen. Las credenciales siguen gestionadas por Codex. La historia usa formato versión 2 y puede cargar el formato anterior; guardá una copia del proyecto antes de volver a una versión antigua del editor.

## Actualizaciones

Mantener las modificaciones del fork en `editor-es`, conservar el remoto `upstream` y revisar los cambios antes de integrarlos. Las versiones corregidas de dependencias están fijadas mediante `overrides` y `bun.lock`. No ejecutar el actualizador del escritorio original sobre este fork local.

La compilación calcula una revisión a partir de los nodos, herramientas, extensiones y proveedores integrados. Al iniciar, sincroniza los archivos integrados correspondientes en `data/` cuando cambia esa revisión. Las extensiones con otros nombres y los proyectos del usuario se conservan; las modificaciones manuales a archivos integrados pueden ser reemplazadas por la siguiente compilación.

Para trasladar la instalación, conservar `data/`, los recursos de cada proyecto, el runtime y la compilación. Exportar un proyecto como ZIP permite llevar sus archivos a otra instalación, pero no incluye claves, extensiones globales ni el runtime de la aplicación.
