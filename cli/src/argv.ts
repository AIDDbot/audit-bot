export type ParsedArgv =
  | {
      command: "ingest";
      harness: string | undefined;
      event: string | undefined;
    }
  | { command: "unknown" };

export function parseArgv(argv: readonly string[]): ParsedArgv {
  const token = argv[2];
  if (token !== "ingest") {
    return { command: "unknown" };
  }
  return {
    command: "ingest",
    harness: argv[3],
    event: argv[4],
  };
}
