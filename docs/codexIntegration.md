# Posible integración con Codex CLI

Revisión preliminar del 13 de noviembre de 2026, posterior a la prueba local de Toonflow. **No hay integración implementada ni se ejecutó generación con Codex.**

## Viabilidad

En esta PC está instalado `codex-cli 0.163.0`; `codex app-server --help` responde. La documentación oficial distingue el acceso a Codex mediante inicio de sesión con ChatGPT del acceso mediante clave de API, que se factura en la cuenta de Platform. El uso con ChatGPT está sujeto al acceso y los límites de la cuenta; no equivale a una API ilimitada. [Autenticación oficial](https://developers.openai.com/codex/auth/).

OpenAI ofrece `codex app-server` para integrar clientes: autenticación, historial, aprobaciones y eventos del agente. Su transporte local predeterminado es JSONL por `stdio`; se pueden generar tipos y esquemas desde la versión instalada. El protocolo incluye inicio o reanudación de conversaciones, turnos, cancelación y consulta de límites. El cliente debe comprobar el estado final del turno. [Protocolo oficial](https://developers.openai.com/codex/app-server/).

Esto permite plantear una integración local con el CLI oficial y su sesión administrada por Codex. No hace falta copiar tokens de ChatGPT al formulario de proveedores de Toonflow. No se comprobó todavía el acceso concreto de esta cuenta ni la compatibilidad completa del protocolo instalado con la documentación actual.

## Propuesta para revisar juntos

La propuesta siguiente es una decisión de arquitectura para este editor:

1. Un proceso hijo de `codex app-server`, conectado por `stdio` al servidor Bun; el navegador recibe los mensajes a través del servidor local.
2. Un panel «Asistente de guion» con conversación por proyecto, respuesta progresiva y botón para cancelar.
3. Selección explícita del material que se envía: premisa, beats elegidos, personajes o guion. Primera función: analizar continuidad y proponer una nueva versión.
4. Cambios propuestos con vista previa y aplicación mediante las revisiones de `story.json`; conservar la versión existente si hay conflicto.
5. Inicio de sesión gestionado por Codex y estado de cuenta/límites visible. Mantener las aprobaciones y limitar las herramientas al proyecto que el usuario abrió.

Las primeras funciones útiles serían crítica de estructura, desglose de escenas, fichas de personajes, revisión de continuidad, versiones de diálogo y redacción de prompts visuales. Conviene empezar por propuestas de texto antes de dar al agente control del lienzo, herramientas de terminal o generación de medios.

## Imágenes y video

La suscripción de ChatGPT no se debe dar por válida automáticamente para los proveedores de imágenes y video de Toonflow. La disponibilidad de esas funciones requiere una comprobación separada. En particular, el flujo diferente de uso del plan mediante Sign in with ChatGPT tiene limitaciones documentadas para generación de imágenes y audio/video; no se deben extrapolar a todas las herramientas locales de Codex. [Limitaciones de ese flujo](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations).

En esta instalación los proveedores pagos siguen sin configurar. La siguiente implementación debe empezar con un prototipo acotado, mostrar qué cuenta y modalidad usa y verificar su consumo antes de conectar operaciones de producción.
