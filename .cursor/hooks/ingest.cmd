:; node "$(dirname "$0")/../../.agents/hooks/index.mjs" ingest; exit $?
@echo off
node -- "%~dp0..\..\.agents\hooks\index.mjs" ingest
