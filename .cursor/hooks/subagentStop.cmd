:; node "$(dirname "$0")/../../.agents/hooks/index.mjs" ingest cursor subagentStop; exit $?
@echo off
node -- "%~dp0..\..\.agents\hooks\index.mjs" ingest cursor subagentStop
