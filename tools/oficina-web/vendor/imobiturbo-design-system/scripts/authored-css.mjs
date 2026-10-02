import postcss from "postcss";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { load, kebab } from "./model.mjs";
import { renderCSS } from "./render.mjs";
const source = load(dirname(dirname(fileURLToPath(import.meta.url))));
const knownVariables = new Set(
  [...renderCSS(source).matchAll(/(--it-[\w-]+)\s*:/g)].map((m) => m[1]),
);
const colorVariables = new Set([
  ...Object.keys(source.colors.semantic.light).map((k) => `--it-${kebab(k)}`),
  "--it-dark-green",
]);
export function colorValueError(value) {
  if (
    /^(?:none|transparent|currentColor|inherit|initial|unset|revert|revert-layer)$/i.test(
      value,
    )
  )
    return null;
  const variable = value.match(/^var\(\s*(--it-[\w-]+)\s*\)$/)?.[1];
  return variable && colorVariables.has(variable)
    ? null
    : `IT-COLOR: ${value}; use var(--it-accent), var(--it-danger) ou outro semantic token de /catalog. Origem: tokens/colors.json.`;
}
export function authoredCssErrors(css, filename = "inline CSS") {
  const errors = [];
  let tree;
  try {
    tree = postcss.parse(css, { from: filename });
  } catch (error) {
    return [`IT-CSS: ${error.reason}`];
  }
  tree.walkDecls((d) => {
    const prop = d.prop.toLowerCase(),
      value = d.value;
    if (prop.startsWith("--"))
      errors.push(
        `IT-TOKEN: ${prop} define regra local. Edite tokens/ ou declare um perfil aprovado.`,
      );
    for (const match of value.matchAll(/var\(\s*(--[\w-]+)/g))
      if (!knownVariables.has(match[1]))
        errors.push(
          `IT-TOKEN: ${match[1]} não existe no catálogo canônico. Escolha a variável de /catalog; não declare um fallback local.`,
        );
    const isColor =
      /^(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?-color|outline-color|fill|stroke|caret-color|accent-color|text-decoration-color)$/.test(
        prop,
      );
    if (isColor && colorValueError(value))
      errors.push(`${prop}: ${colorValueError(value)}`);
    else if (
      !isColor &&
      /#[\da-f]{3,8}\b|\b(?:rgb|hsl|oklab|oklch)a?\(/i.test(value)
    )
      errors.push(
        `IT-COLOR: ${prop}: ${value}; use var(--it-accent) ou outro semantic token de /catalog.`,
      );
    if (
      prop === "font-family" &&
      !/^var\(--it-font-(primary|editorial|mono)\)$/.test(value)
    )
      errors.push(
        `IT-TYPE: ${value}; importe as fontes do pacote e use var(--it-font-primary).`,
      );
    if (
      /^(?:padding|margin|gap|row-gap|column-gap|border-radius|font-size|box-shadow|transition-duration)(?:-|$)/.test(
        prop,
      ) &&
      !/^((?:var\(--it-[\w-]+\)|0(?:px)?|auto|none)\s*)+$/.test(value)
    )
      errors.push(`IT-VALUE: ${prop}: ${value}; use o token it-* do catálogo.`);
    if (
      /^(?:(?:min|max)-)?(?:width|height)$/.test(prop) &&
      !/^(?:var\(--it-[\w-]+\)|0(?:px)?|auto|none|inherit|initial|min-content|max-content|fit-content|100(?:%|d?v[wh]))$/.test(
        value,
      )
    )
      errors.push(
        `IT-VALUE: ${prop}: ${value}; use var(--it-control-md), var(--it-space-4) ou layout fluido permitido.`,
      );
  });
  return errors;
}
