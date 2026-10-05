import { pathToFileURL } from 'node:url';
import { assertAllowedUrl } from './policy.ts';
import {
  formatImportSummary,
  runImport,
  type RunImportOptions,
} from './run.ts';

export const USAGE = 'Usage: node src/importer/cli.ts --output <file.sqlite> --residential <https-url> [--commercial <https-url>]... [--team <https-url>]';

export type CliParseResult =
  | { ok: true; options: Pick<RunImportOptions, 'outputPath' | 'sources'> }
  | { ok: false; cause: string };

function safePageUrl(value: string, flag: string): string {
  try {
    return assertAllowedUrl(value, 'page').href;
  } catch {
    throw new Error(`invalid ${flag} URL`);
  }
}

export function parseCliArgs(argv: readonly string[]): CliParseResult {
  let outputPath: string | undefined;
  let residentialUrl: string | undefined;
  let teamUrl: string | undefined;
  const commercialUrls: string[] = [];

  try {
    for (let index = 0; index < argv.length; index += 2) {
      const flag = argv[index];
      const value = argv[index + 1];
      if (!flag || !value || value.startsWith('--')) throw new Error(`missing value for ${flag ?? 'argument'}`);
      if (flag === '--output') {
        if (outputPath !== undefined) throw new Error('duplicate --output');
        outputPath = value;
      } else if (flag === '--residential') {
        if (residentialUrl !== undefined) throw new Error('duplicate --residential');
        residentialUrl = safePageUrl(value, flag);
      } else if (flag === '--commercial') {
        commercialUrls.push(safePageUrl(value, flag));
      } else if (flag === '--team') {
        if (teamUrl !== undefined) throw new Error('duplicate --team');
        teamUrl = safePageUrl(value, flag);
      } else {
        throw new Error(`unknown argument ${flag}`);
      }
    }
    if (!outputPath?.trim()) throw new Error('missing --output');
    if (!residentialUrl) throw new Error('missing --residential');
  } catch (error) {
    return { ok: false, cause: error instanceof Error ? error.message : 'invalid arguments' };
  }

  return {
    ok: true,
    options: {
      outputPath,
      sources: {
        residentialUrl,
        ...(commercialUrls.length ? { commercialUrls } : {}),
        ...(teamUrl ? { teamUrl } : {}),
      },
    },
  };
}

export interface CliDependencies {
  runImport?: typeof runImport;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
}

export async function main(argv: readonly string[], dependencies: CliDependencies = {}): Promise<0 | 1> {
  const parsed = parseCliArgs(argv);
  const stderr = dependencies.stderr ?? console.error;
  if (!parsed.ok) {
    stderr(`Import arguments rejected: ${parsed.cause}\n${USAGE}`);
    return 1;
  }
  try {
    const summary = await (dependencies.runImport ?? runImport)(parsed.options);
    (dependencies.stdout ?? console.log)(formatImportSummary(summary));
    return summary.complete ? 0 : 1;
  } catch (error) {
    stderr(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

const isDirectExecution = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  }).catch((error: unknown) => {
    console.error(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
