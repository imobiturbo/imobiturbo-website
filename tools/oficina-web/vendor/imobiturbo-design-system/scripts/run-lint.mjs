#!/usr/bin/env node
import { ESLint } from "eslint";

// shadcn emits discovery failures to console.warn instead of ESLint messages.
// They must fail the command even when ESLint has found zero code violations.
export async function lintChecked({ cwd, files, config }) {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const text = args.join(" ");
    if (text.includes("[@shadcn/lint]")) warnings.push(text);
    else originalWarn(...args);
  };
  try {
    const eslint = new ESLint({
      cwd,
      ...(config ? { overrideConfigFile: config } : {}),
    });
    const results = await eslint.lintFiles(files);
    const formatter = await eslint.loadFormatter("stylish");
    return { results, warnings, output: formatter.format(results) };
  } finally {
    console.warn = originalWarn;
  }
}

if (process.argv[1]?.endsWith("/run-lint.mjs")) {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf("--config");
  const config = configIndex >= 0 ? args.splice(configIndex, 2)[1] : undefined;
  if (!args.length)
    throw new Error("Informe arquivos/globs; não aprove cobertura vazia.");
  const { results, warnings, output } = await lintChecked({
    cwd: process.cwd(),
    files: args,
    config,
  });
  if (output) console.log(output);
  if (warnings.length) console.error(warnings.join("\n"));
  if (
    !results.length ||
    warnings.length ||
    results.some((r) => r.errorCount || r.warningCount)
  )
    process.exitCode = 1;
}
