# Revisión y prueba de la instalación local

Realizada el **13 de noviembre de 2026**, en Windows, sobre Toonflow **v2.0.10** (`6086cdffceb704a632eca143dd16cd461a78cdac`) y los cambios de la rama `editor-es`.

## Resultado

La versión para Chrome compila, arranca en `http://127.0.0.1:3000` y permite completar el recorrido local de escritura, organización narrativa, medios y exportación. Se conserva el proyecto de demostración `data/workspaces/primerCorto/`.

**No se detectó malware en los archivos analizados.** La auditoría final de dependencias no informó vulnerabilidades conocidas. Estos resultados tienen el alcance descrito a continuación y no certifican la ausencia total de malware o fallos de seguridad.

## Procedencia y antivirus

- Se clonó el código desde el repositorio oficial de Toonflow y se conservó su licencia MIT. No se ejecutó un instalador de terceros.
- Bun 1.4.3 se descargó de su publicación oficial. Su ZIP coincidió con el SHA256 publicado y el ejecutable tenía firma Authenticode válida de Codeblog CORP. El hash está en [la guía local](editorLocal.md).
- Windows Defender no pudo realizar el análisis: `MpCmdRun` devolvió `0x80004005` y el servicio `WinDefend` estaba detenido/deshabilitado en esta PC. No se modificó su configuración.
- Como alternativa se usó **ClamAV portátil 1.5.4**, obtenido de `clamav.net`. Se verificó la firma PGP del ZIP con la clave publicada por ClamAV: firma correcta de Talos/Cisco, huella `5BAD CA26 65EF 59DC F8A2 3D8B 707F 0DB4 8083 6771`. Se actualizaron y verificaron las bases oficiales con FreshClam.

| Análisis | Resultado |
| --- | --- |
| Archivos físicos del código, dependencias, compilación y proyecto; incluye el ejecutable local de Bun | 150.136 archivos analizados, **0 infectados**, 3,36 GiB analizados. Terminó con código 2 porque 215 rutas se habían reemplazado o renombrado durante el trabajo. |
| Compilación definitiva, código y datos vigentes, con el servidor reiniciado y sin recompilar durante el análisis | 2.934 archivos analizados, **0 infectados**, 413,35 MiB analizados; **salida 0**, sin avisos de acceso ni de límites excedidos. |

Son alcances superpuestos; no se deben sumar como archivos únicos. El primer inventario evitó 3.537 enlaces y junctions de Bun, cuyos paquetes físicos se analizaron desde su ubicación real. Las rutas desaparecidas correspondían a artefactos de compilación y al lienzo de prueba que se renombró; el segundo análisis cubrió sus versiones definitivas.

Los intentos recursivos anteriores se interrumpieron al detectar que seguían junctions repetidamente; no se cuentan como análisis terminados. Los análisis finales usaron listas explícitas de archivos físicos.

La revisión no siguió enlaces fuera de la carpeta ni incluyó `.git/` o las herramientas auxiliares y cachés de `localRuntime/`, salvo Bun. El primer análisis limitó cada archivo a 128 MiB y 10 segundos; el definitivo usó 256 MiB por archivo, 512 MiB por contenedor, profundidad 24 y 60 segundos, con avisos de límites activados. Las firmas y la revisión de código no detectan todos los comportamientos posibles de una aplicación o de extensiones futuras.

## Dependencias y código

La instalación se hizo con `bun install --ignore-scripts`; no se ejecutaron automáticamente los scripts de instalación de paquetes. Se revisaron los puntos de entrada, el arranque, los scripts, los parches, la carga de extensiones y los destinos de red relevantes para este uso local.

La auditoría inicial informó **82 entradas de avisos para 20 nombres de paquetes**: 2 críticas, 28 altas, 37 moderadas y 15 bajas. Esas entradas pueden repetir un aviso según la variante de dependencia; no son 82 CVE diferentes. Se fijaron versiones corregidas mediante `overrides` y `bun.lock`.

La auditoría final `bun audit --json` terminó con **salida 0 y `{}`**. Esto refleja los avisos conocidos por el registro consultado para el lockfile; no reemplaza el análisis del comportamiento ni cubre extensiones instaladas después.

El servidor escucha en `127.0.0.1`, valida Host y Origin y no habilita CORS para sitios externos. Se retiraron la inicialización de telemetría y la carga automática de anuncios y exploración comunitaria de la portada. Los servicios de cuentas, extensiones y proveedores siguen pudiendo contactar Internet cuando se usan. Las herramientas de agentes y los plugins conservan capacidades de ejecución: este fork está preparado para uso personal local, no para publicarlo como servidor multiusuario.

## Validación funcional

| Comprobación | Evidencia y alcance |
| --- | --- |
| Instalación reproducible y compilación | `bun install --frozen-lockfile --ignore-scripts` y `bun run build:server` terminaron correctamente. |
| Tipos | Pasaron web, servidor, i18n, MCP y los scaffolds de nodos, herramientas y extensiones. Se repitió el del servidor tras la corrección de sincronización de plugins. |
| Arranque y detención | Se probaron los scripts locales y el inicio con Windows PowerShell, sin cambiar la política de ejecución. |
| Español | Los 3.955 mensajes del catálogo inglés tienen entrada en español, sin diferencias de placeholders numéricos. Se verificaron visualmente los rótulos principales y los nodos después de sincronizar la compilación. La traducción avanzada aún necesita revisión editorial. |
| Proyecto y lienzo | Creación y selección de carpeta con el selector web; creación de nodos, edición real de texto, conexiones, ordenado y cambio de nombre a `Storyboard.json`. |
| Historia | «La última luz»: 3 beats, 21 segundos, dos vínculos causales y un personaje. Guardar, cerrar y reabrir conserva la información. La selección de tarjetas actualiza el guion y el inspector. |
| Personajes | Ficha de Ana con deseo, conflicto, arco, relaciones y notas; retrato local cargado y verificado en la interfaz. La imagen es una tarjeta técnica, no una generación de IA. |
| Medios | PNG, video MP4 y audio WAV creados con FFmpeg local. Se comprobó reproducción real de video y audio con el sonido silenciado. |
| Dirección 3D | Apertura del escenario WebGL, incorporación de maniquí, capturas de encuadres y exportación de un PNG al lienzo. |
| Guion | Exportación desde la interfaz a `guion1794616062325.md`, con personajes y beats. |
| Proyecto completo | ZIP de 514.178 bytes, 18 entradas; comprobación CRC sin errores. Contiene lienzo, historia, guion y recursos. No se probó restaurarlo en otra instalación. |
| Control de escritura | Una revisión antigua devuelve 409 y conserva el archivo. Un Origin externo devuelve 403. Un intento de acceder fuera de la carpeta del proyecto mediante `../` devuelve 400 por ruta inválida. |

La carga de archivos mediante el selector automatizado de la extensión de Chrome no quedó validada: requería habilitar su acceso a archivos locales. Para continuar se usó la API local de archivos de la aplicación y luego se comprobó el resultado en la interfaz. No se cambió ese permiso del navegador.

**No se probaron generación de guion, imágenes o video por IA, proveedores pagos, exportación de animación 3D a video, colaboración, acceso móvil, MCP externo ni un instalador nativo.** No se configuraron claves ni se ejecutaron llamadas de inferencia. El panel narrativo es una primera implementación; sus límites están en [editorLocal.md](editorLocal.md).

## Evidencia privada en esta PC

Los registros están en `localRuntime/`: `antivirusFinal.log`, `antivirusFinalBuild.log`, sus archivos `Console.log`, `dependencyAudit.json`, `dependencyAuditFinal.json`, `finalInstall.log`, `finalBuild.log`, `finalTypecheck.log` y `serverFinalTypecheck.log`. No se suben al repositorio. Los proyectos, ajustes, medios, ejecutables y cachés también quedan fuera de Git.

La [evaluación preliminar de Codex CLI](codexIntegration.md) corresponde a la siguiente etapa. Se comprobó su versión y ayuda local y se consultó documentación oficial; todavía no se conectó al editor.
