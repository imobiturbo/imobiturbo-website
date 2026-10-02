import { lintChecked } from "@imobiturbo/design-system/lint-runner";
const { results, warnings, output } = await lintChecked({ cwd: process.cwd(), files: ["src/**/*.{ts,tsx}"] });
if (output) console.log(output);
if (warnings.length) console.error(warnings.join("\n"));
if (!results.length || warnings.length || results.some(r => r.errorCount || r.warningCount)) process.exitCode = 1;
