:; node "$(dirname "$0")/../../.agents/hooks/index.mjs" ingest cursor sessionStart; exit $?
@echo off
node -- "%~dp0..\..\.agents\hooks\index.mjs" ingest cursor sessionStart
