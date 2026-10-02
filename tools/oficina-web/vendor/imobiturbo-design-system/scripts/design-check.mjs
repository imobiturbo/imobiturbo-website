#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "./model.mjs";
import { outputs } from "./render.mjs";
import { compileShowcase, compileRecipes } from "./build-showcase.mjs";
import { validateSources } from "./validate.mjs";
if (process.argv.includes("--html")) {
  const { checkHtmlFiles } = await import("./check-html.mjs");
  const args = process.argv.slice(process.argv.indexOf("--html") + 1);
  if (!args.length) throw new Error("Use --html arquivo.html [...].");
  const model = load(dirname(dirname(fileURLToPath(import.meta.url))));
  const errors = checkHtmlFiles(args, model);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      "HTML: contratos, classes, tokens, assets e presença de nomes acessíveis aprovados.",
    );
} else {
  const root = dirname(dirname(fileURLToPath(import.meta.url))),
    source = load(root),
    errors = validateSources(source, root);
  if (!errors.length) {
    for (const [name, expected] of Object.entries(outputs(source))) {
      if (
        !existsSync(join(root, name)) ||
        readFileSync(join(root, name), "utf8") !== expected
      )
        errors.push(
          `IT-DRIFT: ${name} diverge. Edite a fonte e gere os artefatos na VPS3.`,
        );
    }
    for (const file of ["dist/tokens.css", "tokens.css"])
      if (existsSync(join(root, file)))
        for (const match of readFileSync(join(root, file), "utf8").matchAll(
          /url\("([^"\)]+)"\)/g,
        ))
          if (!existsSync(resolve(root, dirname(file), match[1])))
            errors.push(`IT-URL: ${file} → ${match[1]} não existe.`);
    if (
      !existsSync(join(root, "dist/showcase.css")) ||
      readFileSync(join(root, "dist/showcase.css"), "utf8") !==
        (await compileShowcase(source, root))
    )
      errors.push("IT-DRIFT: showcase.css divergente.");
    if (
      !existsSync(join(root, "dist/recipes.css")) ||
      readFileSync(join(root, "dist/recipes.css"), "utf8") !==
        (await compileRecipes(source, root))
    )
      errors.push("IT-DRIFT: recipes.css divergente.");
    const exports = Object.values(source.package.exports).flatMap((e) =>
      typeof e === "string" ? [e] : Object.values(e),
    );
    for (const file of exports)
      if (!file.includes("*") && !existsSync(resolve(root, file)))
        errors.push(`IT-EXPORT: ${file} ausente.`);
  }
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      `Imobiturbo ${source.package.version}: schema, referências, contraste, contratos, assets, fontes, exports e drift aprovados. Nenhum arquivo foi escrito.`,
    );
}
