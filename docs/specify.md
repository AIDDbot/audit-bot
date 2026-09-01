Producto
Los harnesses Cursor, Claude Code y GitHub Copilot disparan hooks (JSON por stdin) en puntos del ciclo de vida del agente. El desarrollador necesita un log de auditoría local al proyecto, observe-only: el hook nunca bloquea, muta ni falla el loop del agente.

Reports, dashboards y consultas no van en esta spec.

Experiencia
Como desarrollador, registro eventos de Cursor, Claude y Copilot en un solo log del repo, sin cambiar de herramienta.
Como desarrollador, dejo los hooks siempre activos: un fallo de ingest no rompe la sesión.
Como desarrollador en Windows o Linux, el mismo ingest funciona; diferencias de path/shell no deben perder eventos.
Ingest
Invocación. El CLI tiene un comando ingest sin argumentos. El JSON de stdin basta. Harness y nombre de evento no se pasan por argv. Los hooks de proyecto invocan solo eso (más el runtime: node + artefacto compilado). Uso omitido o cualquier otro comando: usage a stderr y exit 1. El usage nombra ingest y no pide harness ni evento.

Entrada. Un objeto JSON por invocación (protocolo de hook). Stdin que no sea un objeto JSON: no se escribe línea; el proceso sigue observe-only.

Identidad (solo el JSON, reglas fijas):

Evento: hook_event_name no vacío si existe. Si no, se guarda la línea igual, sin inventar el nombre.
Harness: cursor si hay cursor_version o workspace_roots; claude si hook_event_name es PascalCase del set Claude (SessionStart, SessionEnd, UserPromptSubmit, Stop, …); si no, copilot. Copilot CLI camelCase a menudo omite hook_event_name.
Variables de entorno del harness (CURSOR_PROJECT_DIR, CLAUDE_PROJECT_DIR) sirven para localizar el proyecto, no para etiquetar el origen.

Registro. Cada Event es una línea JSONL: el objeto stdin tal cual (incluidos null, "", [], {}). No recortar vacíos. Único campo añadido por ingest: receivedAt ISO 8601 UTC, al final del objeto, para no pisar una clave homónima del payload. No overlay de harness ni de un segundo nombre de evento.

Fichero. {projectRoot}/temp/audit/{YYYY-MM-DD}.jsonl, fecha calendario UTC de ese receivedAt. Nunca el temp global del OS. Append de una línea completa (sin líneas rotas ni concatenadas si hay hooks concurrentes). Tras un append correcto a hoy, borrar en esa carpeta cualquier otro JSONL de ingest (día anterior, más viejos). Retención = solo el día UTC en curso. Si falla el borrado, el ingest no debe fallar de cara al harness.

Project root. Resolver el workspace del payload/env (Cursor CURSOR_PROJECT_DIR / workspace_roots, Claude CLAUDE_PROJECT_DIR / cwd, Copilot cwd) y escribir bajo ese proyecto.

Observe-only (innegociable). Éxito o fallo: exit 0; sin stdout que Cursor/Claude/Copilot traten como deny, block, ask, continue: false, reescritura de prompt o contexto extra. No exit 2. Ingest inválido (JSON malo, sin project root, disco) deja el loop desbloqueado.

Registro en el repo para que cada harness dispare ingest en al menos:

Tipo	Cursor	Claude Code	Copilot CLI
Inicio de sesión
sessionStart
SessionStart
sessionStart
Fin de sesión
sessionEnd
SessionEnd
sessionEnd
Prompt
beforeSubmitPrompt
UserPromptSubmit
userPromptSubmitted
Fin de turno
stop
Stop
agentStop
Configs de proyecto: .cursor/hooks.json, .claude/settings.json, .github/hooks/. Hooks de usuario global, enterprise/policy, plugins y cloud-only quirks se documentan como nota, no como requisito de implementación extra. Copilot cloud: sandbox efímero; el log no es durable ahí.

Fuera de alcance
Reports, agregación, query.
Bloquear, denegar, inyectar contexto, reescribir prompts o tools.
Redacción de PII/secretos (el payload puede traer prompts y rutas).
Suscribir tool-use, Tab, compact, subagentes u otros eventos del catálogo (docs/harness-hooks.md); esta spec es el MVP de ciclo de sesión.
Renombrar el paquete/bin si aún se llama cli-node.
Criterios
EARS, pocos y observables: un objeto → una línea; sin argv; raw; fichero diario UTC y retención de un día; observe-only; path project-local; los tres harnesses en los cuatro tipos de evento; configs de proyecto presentes; misma forma de JSONL en Windows y Linux.

Si hace falta una sola pregunta cerrada, pregúntala; si no, escribe la spec.

Eso define un ingest mínimo y coherente. No nombra F001, omitEmpty ni hookEventHint.

La única decisión que el spec aún puede preguntarte: ¿persistir harness inferido en la línea, o solo raw + receivedAt? El texto de arriba elige lo segundo. Si lo quieres en el log, cambia esa frase antes de lanzar /specify.