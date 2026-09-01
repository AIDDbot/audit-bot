# Campos de entrada normalizados por evento

Solo se incluyen campos presentes en los tres arneses (Cursor, GitHub Copilot, Claude Code) para el mismo evento. Si un campo falta en alguno de los tres, no aparece en este documento. El nombre normalizado usa snake_case y, cuando los nombres originales difieren, se elige el más común o indicativo.

---

## 1. Inicio de sesión

| Campo normalizado | Tipo | Cursor | Copilot | Claude Code |
|---|---|---|---|---|
| `session_id` | string | `conversation_id` | `sessionId` | `session_id` |

---

## 2. Fin de sesión

| Campo normalizado | Tipo | Cursor | Copilot | Claude Code |
|---|---|---|---|---|
| `session_id` | string | `conversation_id` (implícito, común) / `session_id` (explícito en el evento) | `sessionId` | `session_id` |
| `reason` | string (enum, valores propios de cada arnés) | `reason` | `reason` | `reason` |

---

## 3. Inicio de subagente

| Campo normalizado | Tipo | Cursor | Copilot | Claude Code |
|---|---|---|---|---|
| `session_id` | string | `parent_conversation_id` | `sessionId` | `session_id` |
| `agent_type` | string | `subagent_type` | `agentName` | `agent_type` |

---

## 4. Fin de subagente

| Campo normalizado | Tipo | Cursor | Copilot | Claude Code |
|---|---|---|---|---|
| `session_id` | string | `conversation_id` (común) | `sessionId` | `session_id` |
| `agent_type` | string | `subagent_type` | `agentType` | `agent_type` |
| `response_text` | string | `summary` | `response` | `last_assistant_message` |

---

## 5. Prompt de usuario

| Campo normalizado | Tipo | Cursor | Copilot | Claude Code |
|---|---|---|---|---|
| `session_id` | string | `conversation_id` (común) | `sessionId` | `session_id` |
| `prompt` | string | `prompt` | `prompt` | `prompt` |

---

## 6. Fin del agente

| Campo normalizado | Tipo | Cursor | Copilot | Claude Code |
|---|---|---|---|---|
| `session_id` | string | `conversation_id` (común) | `sessionId` | `session_id` |

---

## Fuentes

- Cursor: https://cursor.com/docs/hooks
- GitHub Copilot: https://docs.github.com/en/copilot/reference/hooks-reference
- Claude Code: https://code.claude.com/docs/en/hooks