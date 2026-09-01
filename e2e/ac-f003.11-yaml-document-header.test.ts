import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import {
  assertYamlIntegerTurn,
  makeFixture,
  parseObject,
  readLines,
  readSessionYaml,
  sessionYamlPath,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
} from "./spawn.ts";

const hhmmss = /^\d{2}:\d{2}:\d{2}$/;
const headerKeys = [
  "session_id",
  "source_harness",
  "source_event",
  "timestamp",
  "turn",
];

test("AC-F003.11 — header keys from both positionals match argv", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    hook_event_name: "sessionEnd",
    session_id: "sess-ac-f003-11-both",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const parsedLine = parseObject((await readLines(projectRoot))[0] ?? "");
  assert.deepEqual(parsedLine, payload);
  assert.equal("harness" in parsedLine, false);
  assert.equal("hookEvent" in parsedLine, false);
  assert.equal("turn" in parsedLine, false);
  const yamlPath = sessionYamlPath(projectRoot, payload.session_id);
  assert.equal(path.basename(yamlPath, ".yaml"), "sess-ac-f003-11-both");
  const documents = yamlDocuments(
    await readSessionYaml(projectRoot, payload.session_id),
  );
  assert.equal(documents.length, 1);
  const document = documents[0] ?? "";
  const mapping = yamlMapping(document);
  assert.deepEqual(mapping.keys.slice(0, 5), headerKeys);
  assert.equal(mapping.values.session_id, "sess-ac-f003-11-both");
  assert.equal(mapping.values.source_harness, "cursor");
  assert.equal(mapping.values.source_event, "sessionStart");
  assert.match(mapping.values.timestamp ?? "", hhmmss);
  assertYamlIntegerTurn(document);
});

test("AC-F003.11 — omitted positionals are empty strings and are not inferred", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    hook_event_name: "sessionStart",
    session_id: "sess-ac-f003-11-neither",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const parsedLine = parseObject((await readLines(projectRoot))[0] ?? "");
  assert.deepEqual(parsedLine, payload);
  assert.equal("harness" in parsedLine, false);
  assert.equal("hookEvent" in parsedLine, false);
  assert.equal("turn" in parsedLine, false);
  const yamlPath = sessionYamlPath(projectRoot, payload.session_id);
  assert.equal(path.basename(yamlPath, ".yaml"), "sess-ac-f003-11-neither");
  const documents = yamlDocuments(
    await readSessionYaml(projectRoot, payload.session_id),
  );
  assert.equal(documents.length, 1);
  const document = documents[0] ?? "";
  const mapping = yamlMapping(document);
  assert.deepEqual(mapping.keys.slice(0, 5), headerKeys);
  assert.equal(mapping.values.session_id, "sess-ac-f003-11-neither");
  assert.equal(mapping.values.source_harness, "");
  assert.equal(mapping.values.source_event, "");
  assert.notEqual(mapping.values.source_event, payload.hook_event_name);
  assert.match(mapping.values.timestamp ?? "", hhmmss);
  assertYamlIntegerTurn(document);
});
