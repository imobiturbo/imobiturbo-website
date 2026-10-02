import { compile } from "@tailwindcss/node";
import { resolve } from "./model.mjs";
import { renderCSS, themeEntries } from "./render.mjs";
import { showcase, showcaseStyle } from "./showcase.mjs";

export function recipeCandidates(source) {
  const classes = Object.values(source.components.components).flatMap((c) => [
    c.base,
    ...Object.values(c.variants),
    ...Object.values(c.sizes),
    ...Object.values(c.slots),
  ]);
  return [
    ...new Set(classes.flatMap((s) => s.split(/\s+/)).filter(Boolean)),
  ].sort();
}
async function compiled(source, root, reference) {
  const css =
    '@import "tailwindcss";\n' +
    renderCSS(source, "../", reference) +
    '\n@custom-variant dark (&:where(.dark,.dark *,[data-theme="dark"],[data-theme="dark"] *));\n@theme inline {\n' +
    Object.entries(themeEntries(resolve(source, source)))
      .map(([key, value]) => `${key}:${value};`)
      .join("\n") +
    "\n}\n" +
    ["fast", "base", "slow"]
      .map(
        (speed) =>
          `@utility duration-it-${speed}{transition-duration:var(--it-motion-duration-${speed});}`,
      )
      .join("\n") +
    (reference ? showcaseStyle(source) : "");
  const compiler = await compile(css, { base: root, onDependency() {} });
  const candidates = recipeCandidates(source);
  if (reference)
    candidates.push(
      ...[...showcase(source).matchAll(/class="([^"]*)"/g)].flatMap((m) =>
        m[1].split(/\s+/),
      ),
    );
  return compiler.build([...new Set(candidates)].filter(Boolean).sort());
}
export const compileShowcase = (source, root) => compiled(source, root, true);
export const compileRecipes = (source, root) => compiled(source, root, false);
