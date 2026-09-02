import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  readSessionYaml,
  sessionYamlPath,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
} from "./spawn.ts";

test("AC-F003.13 — header keys from both positionals match argv", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    hook_event_name: "sessionEnd",
    session_id: "sess-ac-f003-13-both",
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
  assert.equal(path.basename(yamlPath, ".yaml"), "sess-ac-f003-13-both");
  const documents = yamlDocuments(
    await readSessionYaml(projectRoot, payload.session_id),
  );
  assert.equal(documents.length, 1);
  const mapping = yamlMapping(documents[0] ?? "");
  assert.equal("source_harness" in mapping.values, false);
  assert.equal("source_event" in mapping.values, false);
  assert.equal(mapping.values.harness, "cursor");
  assert.equal(mapping.values.event, "sessionStart");
  assert.notEqual(mapping.values.event, payload.hook_event_name);
});

test("AC-F003.13 — omitted positionals are empty strings and are not inferred", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    hook_event_name: "sessionStart",
    session_id: "sess-ac-f003-13-neither",
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
  assert.equal(path.basename(yamlPath, ".yaml"), "sess-ac-f003-13-neither");
  const documents = yamlDocuments(
    await readSessionYaml(projectRoot, payload.session_id),
  );
  assert.equal(documents.length, 1);
  const mapping = yamlMapping(documents[0] ?? "");
  assert.equal("source_harness" in mapping.values, false);
  assert.equal("source_event" in mapping.values, false);
  assert.equal(mapping.values.harness, "");
  assert.equal(mapping.values.event, "");
  assert.notEqual(mapping.values.event, payload.hook_event_name);
});
