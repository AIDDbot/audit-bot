# Esquemas de hooks por evento: Cursor vs GitHub Copilot vs Claude Code vs Codex

Nombres de evento equivalentes usados en cada arnés:

| Evento lógico | Cursor | GitHub Copilot | Claude Code | Codex |
|---|---|---|---|---|
| Inicio de sesión | `sessionStart` | `sessionStart` | `SessionStart` | `SessionStart` |
| Fin de sesión | `sessionEnd` | `sessionEnd` | `SessionEnd` | `SessionEnd` |
| Inicio de subagente | `subagentStart` | `subagentStart` | `SubagentStart` | `SubagentStart` |
| Fin de subagente | `subagentStop` | `subagentStop` | `SubagentStop` | `SubagentStop` |
| Prompt de usuario | `beforeSubmitPrompt` | `userPromptSubmitted` | `UserPromptSubmit` | `UserPromptSubmit` |
| Fin del agente | `stop` | `agentStop` | `Stop` | `Stop` |

Notas generales sobre Codex: no manda timestamp nativo en ningún evento (igual que Cursor); manda `turn_id` en todos los eventos de turno (prompt, subagente, tool use, stop) y el mismo `agent_id` tanto en el start como en el stop del subagente — es el único de los cuatro arneses que resuelve de forma nativa tanto la numeración de turnos como la correlación de subagentes.

---

## 1. Inicio de sesión

### Entrada

| Campo lógico | Cursor (`sessionStart`) | Copilot (`sessionStart`) | Claude Code (`SessionStart`) | Codex (`SessionStart`) |
|---|---|---|---|---|
| Identificador de sesión | `session_id: string` | `sessionId: string` | `session_id: string` | `session_id: string` |
| Cómo se originó | `composer_mode?: "agent"\|"ask"\|"edit"` | `source: "startup"\|"resume"\|"new"` | `source: "startup"\|"resume"\|"clear"\|"compact"\|"fork"` | `source: "startup"\|"resume"\|"clear"\|"compact"` |
| Es agente en background | `is_background_agent: boolean` | — | — | — |
| Directorio de trabajo | *(común: `workspace_roots`)* | `cwd: string` | `cwd: string` | `cwd: string` |
| Timestamp | *(no incluido)* | `timestamp: number` (ms) | *(no en payload base)* | *(no incluido)* |
| Prompt inicial | — | `initialPrompt?: string` | — | — |
| Ruta de transcript | `transcript_path: string \| null` (común) | — | `transcript_path: string` | `transcript_path: string \| null` |
| Modelo | `model`, `model_id`, `model_params` (comunes) | — | `model?` (a veces incluido) | `model: string` |
| Modo de permisos | — | — | — | `permission_mode: string` |

### Salida

| Campo lógico | Cursor | Copilot | Claude Code | Codex |
|---|---|---|---|---|
| Contexto adicional | `additional_context?: string` | `additionalContext` (SDK) | `hookSpecificOutput.additionalContext: string` | `hookSpecificOutput.additionalContext: string` |
| Variables de entorno | `env?: { [key]: value }` | — | — | — |
| Título de sesión | — | — | `hookSpecificOutput.sessionTitle?: string` | — |
| Rutas a vigilar | — | — | `hookSpecificOutput.watchPaths?: string[]` | — |
| Detener el turno | No aplica | No aplica | No aplica | `continue: false` (si `source:"compact"`, termina el turno sin nueva petición al modelo) |

---

## 2. Fin de sesión

### Entrada

| Campo lógico | Cursor (`sessionEnd`) | Copilot (`sessionEnd`) | Claude Code (`SessionEnd`) | Codex (`SessionEnd`) |
|---|---|---|---|---|
| Identificador de sesión | `session_id: string` | `sessionId: string` | `session_id: string` | `session_id: string` |
| Motivo de cierre | `reason: "completed"\|"aborted"\|"error"\|"window_close"\|"user_close"` | `reason: "complete"\|"error"\|"abort"\|"timeout"\|"user_exit"` | `reason: "clear"\|"resume"\|"logout"\|"prompt_input_exit"\|"other"` | `reason: "other"` (único valor actual) |
| Duración | `duration_ms: number` | — | — | — |
| Es agente en background | `is_background_agent: boolean` | — | — | — |
| Estado final | `final_status: string` | — | — | — |
| Mensaje de error | `error_message?: string` | — | — | — |
| Directorio de trabajo | *(común)* | `cwd: string` | `cwd: string` | `cwd: string` |
| Timestamp | *(no incluido)* | `timestamp: number` | — | *(no incluido)* |

### Salida

Ningún arnés admite salida útil en este evento. En Codex es explícito: los hooks de `SessionEnd` corren siempre en síncrono pero son "advisory" — su salida no puede dirigir a Codex ni mantener el hilo abierto.

---

## 3. Inicio de subagente

### Entrada

| Campo lógico | Cursor (`subagentStart`) | Copilot (`subagentStart`) | Claude Code (`SubagentStart`) | Codex (`SubagentStart`) |
|---|---|---|---|---|
| Id del subagente | `subagent_id: string` | — | `agent_id: string` | `agent_id: string` |
| Tipo de subagente | `subagent_type: string` | `agentName: string` | `agent_type: string` | `agent_type: string` |
| Nombre visible | — | `agentDisplayName?: string` | — | — |
| Descripción | — | `agentDescription?: string` | — | — |
| Tarea asignada | `task: string` | — | — | — |
| Conversación/sesión padre | `parent_conversation_id: string` | `sessionId: string` | `session_id: string` | `session_id: string` (la del padre) |
| Id de turno | — | — | — | `turn_id: string` |
| Id de la llamada a herramienta | `tool_call_id: string` | — | — | — |
| Modo de permisos | — | — | — | `permission_mode: string` |
| Ruta de transcript | — | `transcriptPath: string` | `transcript_path: string` (del padre) | `transcript_path: string \| null` (del padre) |

### Salida

| Campo lógico | Cursor | Copilot | Claude Code | Codex |
|---|---|---|---|---|
| Puede bloquear la creación | Sí — `permission: "allow"\|"deny"` | No | No | No (`continue:false` se parsea pero no detiene el subagente) |
| Mensaje al usuario si se deniega | `user_message?: string` | — | — | — |
| Contexto adicional para el subagente | — | `additionalContext` prependido | `hookSpecificOutput.additionalContext` | `hookSpecificOutput.additionalContext` |

---

## 4. Fin de subagente

### Entrada

| Campo lógico | Cursor (`subagentStop`) | Copilot (`subagentStop`) | Claude Code (`SubagentStop`) | Codex (`SubagentStop`) |
|---|---|---|---|---|
| Id del subagente | — | `agentId: string` | `agent_id: string` | `agent_id: string` (mismo valor que en el start) |
| Tipo de subagente | `subagent_type: string` | `agentType: string` | `agent_type: string` | `agent_type: string` |
| Nombre / nombre visible | — | `agentName`, `agentDisplayName?` | — | — |
| Estado final | `status: "completed"\|"error"\|"aborted"` | `stopReason: "end_turn"` (siempre) | *(no hay campo)* | — |
| Tarea / descripción | `task: string`, `description: string` | — | — | — |
| Resumen de salida | `summary: string` | `response: string` | `last_assistant_message: string` | `last_assistant_message: string \| null` |
| Duración | `duration_ms: number` | — | — | — |
| Nº de mensajes / herramientas | `message_count`, `tool_call_count: number` | — | — | — |
| Ya se forzó continuar antes | `loop_count: number` (equivalente conceptual) | — | `stop_hook_active: boolean` | `stop_hook_active: boolean` |
| Archivos modificados | `modified_files: string[]` | — | — | — |
| Id de turno | — | — | — | `turn_id: string` |
| Ruta de transcript del subagente | `agent_transcript_path: string \| null` | — | `agent_transcript_path: string` | `agent_transcript_path: string \| null` |

### Salida

| Campo lógico | Cursor | Copilot | Claude Code | Codex |
|---|---|---|---|---|
| Puede forzar continuar | No (solo `followup_message`) | Sí — `decision: "block"\|"allow"` | Sí — `decision: "block"` | Sí — `decision: "block"` |
| Mensaje / razón | `followup_message?: string` | `reason: string` | `reason: string` | `reason: string` |
| Reescribir la respuesta | — | `modifiedResponse?: string` | — | — |
| Contexto adicional | — | — | `hookSpecificOutput.additionalContext` | `hookSpecificOutput.additionalContext` |

---

## 5. Prompt de usuario

### Entrada

| Campo lógico | Cursor (`beforeSubmitPrompt`) | Copilot (`userPromptSubmitted`) | Claude Code (`UserPromptSubmit`) | Codex (`UserPromptSubmit`) |
|---|---|---|---|---|
| Texto del prompt | `prompt: string` | `prompt: string` | `prompt: string` | `prompt: string` |
| Adjuntos | `attachments: [{type: "file"\|"rule", file_path}]` | — | — | — |
| Sesión | *(común)* | `sessionId: string` | `session_id: string` | `session_id: string` |
| Id de turno | — | — | — | `turn_id: string` |
| Modo de permisos | — | — | — | `permission_mode: string` |
| Timestamp | *(no incluido)* | `timestamp: number` | — | *(no incluido)* |
| Directorio de trabajo | *(común)* | `cwd: string` | `cwd: string` | `cwd: string` |

### Salida

| Campo lógico | Cursor | Copilot | Claude Code | Codex |
|---|---|---|---|---|
| Puede bloquear el envío | Sí — `continue: boolean` | Solo en hooks SDK | Sí — exit 2 o `decision: "block"` | Sí — `decision: "block"` o exit 2 |
| Mensaje al usuario si se bloquea | `user_message?: string` | — | `reason` | `reason` |
| Modificar el prompt | — | `modifiedPrompt?: string` (solo SDK) | — | — |
| Contexto adicional | — | — | `hookSpecificOutput.additionalContext` | `hookSpecificOutput.additionalContext` |

---

## 6. Fin del agente

### Entrada

| Campo lógico | Cursor (`stop`) | Copilot (`agentStop`) | Claude Code (`Stop`) | Codex (`Stop`) |
|---|---|---|---|---|
| Estado final | `status: "completed"\|"aborted"\|"error"` | — | — | — |
| Contador de bucle | `loop_count: number` | — | — | — |
| Ya se forzó continuar antes | — | `stop_hook_active: boolean` | `stop_hook_active: boolean` | `stop_hook_active: boolean` |
| Razón de parada | — | `stopReason: "end_turn"` (siempre) | — | — |
| Último mensaje del asistente | — | — | — | `last_assistant_message: string \| null` |
| Id de turno | — | — | — | `turn_id: string` |
| Sesión | *(común)* | `sessionId: string` | `session_id: string` | `session_id: string` |
| Ruta de transcript | *(común)* | `transcriptPath: string` | `transcript_path: string` | `transcript_path: string \| null` |

### Salida

| Campo lógico | Cursor | Copilot | Claude Code | Codex |
|---|---|---|---|---|
| Puede forzar continuar | Sí (implícito, `followup_message`) | Sí — `decision: "block"\|"allow"` | Sí — `decision: "block"` | Sí — `decision: "block"` (crea un prompt de continuación automático con `reason` como texto) |
| Mensaje / prompt siguiente | `followup_message?: string` | `reason: string` | `reason: string` | `reason: string` |
| Límite de bucles automáticos | `loop_limit` (config, por defecto 5) | Guarda de 8 continuaciones seguidas | No documentado | No documentado |
| Contexto adicional | — | — | `hookSpecificOutput.additionalContext` | — |

---

## Fuentes

- Cursor: https://cursor.com/docs/hooks
- GitHub Copilot: https://docs.github.com/en/copilot/reference/hooks-reference
- Claude Code: https://code.claude.com/docs/en/hooks
- Codex: https://developers.openai.com/codex/hooks
