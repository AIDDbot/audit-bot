# Esquemas de hooks por evento: Cursor vs GitHub Copilot vs Claude Code

Nombres de evento equivalentes usados en cada arnés:

| Evento lógico | Cursor | GitHub Copilot | Claude Code |
|---|---|---|---|
| Inicio de sesión | `sessionStart` | `sessionStart` | `SessionStart` |
| Fin de sesión | `sessionEnd` | `sessionEnd` | `SessionEnd` |
| Inicio de subagente | `subagentStart` | `subagentStart` | `SubagentStart` |
| Fin de subagente | `subagentStop` | `subagentStop` | `SubagentStop` |
| Prompt de usuario | `beforeSubmitPrompt` | `userPromptSubmitted` | `UserPromptSubmit` |
| Fin del agente | `stop` | `agentStop` | `Stop` |

Los tres arneses envían el JSON de entrada por stdin (hooks de tipo comando) y esperan una decisión en stdout. Cursor y Claude Code añaden además campos comunes a todos los eventos (identificadores de conversación/sesión, cwd, versión, etc.) que se omiten aquí salvo que sean relevantes para el evento.

---

## 1. Inicio de sesión

### Entrada

| Campo lógico | Cursor (`sessionStart`) | Copilot (`sessionStart`) | Claude Code (`SessionStart`) |
|---|---|---|---|
| Identificador de sesión | `session_id: string` | `sessionId: string` | `session_id: string` |
| Cómo se originó | `composer_mode?: "agent"\|"ask"\|"edit"` | `source: "startup"\|"resume"\|"new"` | `source: "startup"\|"resume"\|"clear"\|"compact"\|"fork"` |
| Es agente en background | `is_background_agent: boolean` | — | — |
| Directorio de trabajo | *(común: `workspace_roots`)* | `cwd: string` | `cwd: string` |
| Timestamp | *(común, no específico)* | `timestamp: number` (ms) | *(no en payload base; va en campos comunes de otros eventos)* |
| Prompt inicial | — | `initialPrompt?: string` | — |
| Ruta de transcript | `transcript_path: string \| null` (común) | — | `transcript_path: string` |
| Modelo | `model`, `model_id`, `model_params` (comunes) | — | `model?` (a veces incluido) |

### Salida

| Campo lógico | Cursor | Copilot | Claude Code |
|---|---|---|---|
| Contexto adicional | `additional_context?: string` | `additionalContext` (vía `hookSpecificOutput`, en hooks SDK) | `hookSpecificOutput.additionalContext: string` |
| Variables de entorno | `env?: { [key]: value }` | — | — |
| Título de sesión | — | — | `hookSpecificOutput.sessionTitle?: string` |
| Rutas a vigilar | — | — | `hookSpecificOutput.watchPaths?: string[]` |
| Bloquear inicio | No aplica (no bloqueable) | No aplica | No aplica |

---

## 2. Fin de sesión

### Entrada

| Campo lógico | Cursor (`sessionEnd`) | Copilot (`sessionEnd`) | Claude Code (`SessionEnd`) |
|---|---|---|---|
| Identificador de sesión | `session_id: string` | `sessionId: string` | `session_id: string` |
| Motivo de cierre | `reason: "completed"\|"aborted"\|"error"\|"window_close"\|"user_close"` | `reason: "complete"\|"error"\|"abort"\|"timeout"\|"user_exit"` | `reason: "clear"\|"resume"\|"logout"\|"prompt_input_exit"\|"other"` |
| Duración | `duration_ms: number` | — | — |
| Es agente en background | `is_background_agent: boolean` | — | — |
| Estado final | `final_status: string` | — | — |
| Mensaje de error | `error_message?: string` | — | — |
| Directorio de trabajo | *(común)* | `cwd: string` | `cwd: string` |
| Timestamp | *(común)* | `timestamp: number` | — |

### Salida

Ningún arnés admite salida útil en este evento: los tres lo tratan como "fire and forget" (no bloquea, no inyecta contexto).

---

## 3. Inicio de subagente

### Entrada

| Campo lógico | Cursor (`subagentStart`) | Copilot (`subagentStart`) | Claude Code (`SubagentStart`) |
|---|---|---|---|
| Id del subagente | `subagent_id: string` | — | `agent_id: string` |
| Tipo de subagente | `subagent_type: string` (`generalPurpose`, `explore`, `shell`...) | `agentName: string` | `agent_type: string` |
| Nombre visible | — | `agentDisplayName?: string` | — |
| Descripción | — | `agentDescription?: string` | — |
| Tarea asignada | `task: string` | — | — |
| Conversación/sesión padre | `parent_conversation_id: string` | `sessionId: string` | `session_id: string` |
| Id de la llamada a herramienta | `tool_call_id: string` | — | — |
| Modelo del subagente | `subagent_model: string` | — | — |
| Es worker paralelo | `is_parallel_worker: boolean` | — | — |
| Rama git | `git_branch?: string` | — | — |
| Ruta de transcript | — | `transcriptPath: string` | `transcript_path: string` (del padre) |

### Salida

| Campo lógico | Cursor | Copilot | Claude Code |
|---|---|---|---|
| Puede bloquear la creación | Sí — `permission: "allow"\|"deny"` | No | No |
| Mensaje al usuario si se deniega | `user_message?: string` | — | — |
| Contexto adicional para el subagente | — | `additionalContext` prependido al prompt del subagente | `hookSpecificOutput.additionalContext` |

---

## 4. Fin de subagente

### Entrada

| Campo lógico | Cursor (`subagentStop`) | Copilot (`subagentStop`) | Claude Code (`SubagentStop`) |
|---|---|---|---|
| Tipo de subagente | `subagent_type: string` | `agentType: string` | `agent_type: string` |
| Id del subagente | — | `agentId: string` | `agent_id: string` |
| Nombre / nombre visible | — | `agentName`, `agentDisplayName?` | — |
| Estado final | `status: "completed"\|"error"\|"aborted"` | `stopReason: "end_turn"` (siempre) | *(no hay campo de estado; se infiere)* |
| Tarea / descripción | `task: string`, `description: string` | — | — |
| Resumen de salida | `summary: string` | `response: string` (texto completo) | `last_assistant_message: string` (texto completo) |
| Duración | `duration_ms: number` | — | — |
| Nº de mensajes | `message_count: number` | — | — |
| Nº de llamadas a herramientas | `tool_call_count: number` | — | — |
| Contador de bucle | `loop_count: number` | — | `stop_hook_active: boolean` (equivalente conceptual) |
| Archivos modificados | `modified_files: string[]` | — | — |
| Ruta de transcript del subagente | `agent_transcript_path: string \| null` | — | `agent_transcript_path: string` |

### Salida

| Campo lógico | Cursor | Copilot | Claude Code |
|---|---|---|---|
| Puede bloquear el fin | No (solo continuar con mensaje) | Sí — `decision: "block"\|"allow"` | Sí — `decision: "block"` |
| Mensaje / razón | `followup_message?: string` (auto-continúa) | `reason: string` (prompt del siguiente turno) | `reason: string` |
| Reescribir la respuesta | — | `modifiedResponse?: string` | — |
| Contexto adicional | — | — | `hookSpecificOutput.additionalContext` |

---

## 5. Prompt de usuario

### Entrada

| Campo lógico | Cursor (`beforeSubmitPrompt`) | Copilot (`userPromptSubmitted`) | Claude Code (`UserPromptSubmit`) |
|---|---|---|---|
| Texto del prompt | `prompt: string` | `prompt: string` | `prompt: string` |
| Adjuntos | `attachments: [{type: "file"\|"rule", file_path}]` | — | — |
| Sesión | *(común)* | `sessionId: string` | `session_id: string` |
| Timestamp | *(común)* | `timestamp: number` | — |
| Directorio de trabajo | *(común)* | `cwd: string` | `cwd: string` |

### Salida

| Campo lógico | Cursor | Copilot | Claude Code |
|---|---|---|---|
| Puede bloquear el envío | Sí — `continue: boolean` | Solo en hooks SDK programáticos (no en comando/HTTP) | Sí — exit code 2 o `decision: "block"` |
| Mensaje al usuario si se bloquea | `user_message?: string` | — | `reason` (top-level `decision`) |
| Modificar el prompt | — | `modifiedPrompt?: string` (solo SDK) | — |
| Contexto adicional | — | — | `hookSpecificOutput.additionalContext`, o stdout plano añadido al contexto |

---

## 6. Fin del agente

### Entrada

| Campo lógico | Cursor (`stop`) | Copilot (`agentStop`) | Claude Code (`Stop`) |
|---|---|---|---|
| Estado final | `status: "completed"\|"aborted"\|"error"` | — | — |
| Contador de bucle | `loop_count: number` | — | *(no expone contador; ver `stop_hook_active`)* |
| Ya se forzó continuar antes | — | `stop_hook_active: boolean` | `stop_hook_active: boolean` |
| Razón de parada | — | `stopReason: "end_turn"` (siempre) | — |
| Sesión | *(común)* | `sessionId: string` | `session_id: string` |
| Ruta de transcript | *(común)* | `transcriptPath: string` | `transcript_path: string` |

### Salida

| Campo lógico | Cursor | Copilot | Claude Code |
|---|---|---|---|
| Puede forzar continuar | Sí (implícito, vía `followup_message`) | Sí — `decision: "block"\|"allow"` | Sí — `decision: "block"` |
| Mensaje / prompt siguiente | `followup_message?: string` | `reason: string` | `reason: string` |
| Límite de bucles automáticos | `loop_limit` (config del hook, por defecto 5) | Guarda de 8 continuaciones seguidas (hardcoded) | No documentado un límite explícito |
| Contexto adicional | — | — | `hookSpecificOutput.additionalContext` |

---

## Fuentes

- Cursor: https://cursor.com/docs/hooks
- GitHub Copilot: https://docs.github.com/en/copilot/reference/hooks-reference
- Claude Code: https://code.claude.com/docs/en/hooks