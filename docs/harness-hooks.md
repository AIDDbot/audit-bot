# Comparativa de hooks: Cursor vs GitHub Copilot vs Claude Code

## Tabla comparativa de eventos

| Categoría | Cursor | GitHub Copilot | Claude Code |
|---|---|---|---|
| Inicio de sesión | `sessionStart` | `sessionStart` | `SessionStart` (+ `Setup` para CI) |
| Fin de sesión | `sessionEnd` | `sessionEnd` | `SessionEnd` |
| Prompt del usuario | `beforeSubmitPrompt` | `userPromptSubmitted`, `userPromptTransformed` | `UserPromptSubmit`, `UserPromptExpansion` |
| Antes de usar herramienta | `preToolUse`, `beforeShellExecution`, `beforeMCPExecution`, `beforeReadFile` | `preToolUse` | `PreToolUse`, `PermissionRequest` |
| Después de usar herramienta | `postToolUse`, `postToolUseFailure`, `afterShellExecution`, `afterMCPExecution`, `afterFileEdit` | `postToolUse`, `postToolUseFailure` | `PostToolUse`, `PostToolUseFailure`, `PostToolBatch` |
| Subagentes | `subagentStart`, `subagentStop` | `subagentStart`, `subagentStop` | `SubagentStart`, `SubagentStop` |
| Fin de turno del agente | `stop` | `agentStop` | `Stop`, `StopFailure` |
| Compactación de contexto | `preCompact` | `preCompact` | `PreCompact`, `PostCompact` |
| Errores | — | `errorOccurred` | `StopFailure`, `PostToolUseFailure` |
| Notificaciones | — | `notification` | `Notification` |
| Cambios de entorno | `workspaceOpen` | — | `CwdChanged`, `ConfigChange`, `DirectoryAdded`, `FileChanged`, `InstructionsLoaded`, `WorktreeCreate/Remove` |
| Cambio de modelo | — | — | `PreModelSwitch`, `PostModelSwitch` |
| Autocompletado (Tab) | `beforeTabFileRead`, `afterTabFileEdit` | — | — |
| MCP (elicitación) | — | — | `Elicitation`, `ElicitationResult` |

## Peculiaridades de cada uno

### Cursor

- Separa hooks "locales" (se ejecutan en tu máquina) de hooks "cloud agent" (se ejecutan en el lado de Cursor). Varios eventos son solo de IDE local y no disparan en la nube: `sessionStart`, `sessionEnd`, `beforeSubmitPrompt`, los hooks de Tab y `workspaceOpen`.
- Los cloud agents solo leen `.cursor/hooks.json` del repo, no `~/.cursor/hooks.json`. Los hooks de tipo comando funcionan, pero los de tipo prompt no (falta la conexión de autenticación en la VM).
- Recomienda usar el evento más específico posible: si solo te interesan comandos de shell, usa `beforeShellExecution` en vez de `preToolUse`.

### GitHub Copilot

- Distingue claramente CLI local (todos los eventos) de cloud agent (subconjunto reducido: sin `notification` ni `permissionRequest`, porque no hay usuario esperando respuesta).
- Soporta dos formatos de payload: camelCase nativo y un formato "compatible con VS Code" en snake_case, seleccionable con el nombre del evento en minúscula o PascalCase.
- Tiene "hooks de política" (policy hooks) a nivel de sistema, gestionados por administradores, que no se pueden desactivar con `disableAllHooks`.
- El comportamiento de fallo es distinto según tipo: los hooks de comando en `preToolUse` son "fail-closed" ante error o crash (deniegan por defecto), pero los timeouts siempre son "fail-open" (dejan pasar), incluso en hooks de política.
- El entorno del cloud agent es un sandbox Linux efímero: solo se respeta el campo `bash` (no `powershell`), el filesystem se borra al terminar el job, y la red está restringida por firewall.

### Claude Code

- Con diferencia el conjunto más grande de eventos (más de 30), incluyendo granularidad muy fina: cambio de directorio (`CwdChanged`), cambio de modelo (`PreModelSwitch`/`PostModelSwitch`), carga de instrucciones (`InstructionsLoaded`), gestión de worktrees, elicitación MCP, etc.
- Los hooks se pueden definir en cinco formatos de "handler": comando, HTTP, herramienta MCP, prompt (evaluado por un modelo) o subagente — los otros dos arneses solo soportan comando y HTTP.
- Permite filtrar no solo por `matcher` (qué herramienta) sino también por `if` con sintaxis de reglas de permisos (ej. `Bash(rm *)`), algo que ni Cursor ni Copilot tienen.
- Los hooks también se pueden definir dentro del frontmatter de un skill o subagente, no solo en archivos de configuración global.
- Distingue el efecto del exit code 2 evento por evento (una tabla completa de qué bloquea y qué no), en vez de una regla uniforme.

## Fuentes

- Cursor: https://cursor.com/docs/hooks
- GitHub Copilot: https://docs.github.com/en/copilot/reference/hooks-reference
- Claude Code: https://code.claude.com/docs/en/hooks