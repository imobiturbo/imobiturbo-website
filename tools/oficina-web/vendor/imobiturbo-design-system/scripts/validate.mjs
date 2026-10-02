import { readFileSync, existsSync } from "node:fs";
import { resolve as pathResolve, relative, join } from "node:path";
import { createHash } from "node:crypto";
import Ajv from "ajv";
import { resolve, contrast, tokenCatalog } from "./model.mjs";
import { imageDimensions } from "./image-dimensions.mjs";
import { vocabularyError } from "./vocabulary.mjs";
export function validateSources(source, root) {
  const errors = [],
    ajv = new Ajv({ allErrors: true, strict: false });
  for (const [name, key] of [
    ["tokens", "colors"],
    ["tokens", "spacing"],
    ["tokens", "typography"],
    ["components", "components"],
    ["policy", "policy"],
    ["assets", "assets"],
    ["fonts", "fonts"],
  ]) {
    const schema = JSON.parse(
      readFileSync(join(root, "schemas", name + ".schema.json"), "utf8"),
    );
    const validate = ajv.compile(schema);
    if (!validate(source[key]))
      for (const error of validate.errors)
        errors.push(`IT-SCHEMA ${key}${error.instancePath}: ${error.message}`);
  }
  if (errors.length) return errors;
  let m;
  try {
    tokenCatalog(source);
    m = resolve(source, source);
  } catch (error) {
    return [error.message];
  }
  for (const required of ["brand", "semantic", "primitives"])
    if (!m.colors[required])
      errors.push(`IT-TOKEN: colors.${required} obrigatório`);
  for (const group of [
    "spacing",
    "radius",
    "shadow",
    "motion",
    "control",
    "layout",
  ])
    if (!m.spacing[group])
      errors.push(`IT-TOKEN: spacing.${group} obrigatório`);
  if (errors.length) return errors;
  for (const group of ["fontFamily", "fontSize", "lineHeight", "fontWeight"])
    if (!m.typography[group])
      errors.push(`IT-TOKEN: typography.${group} obrigatório`);
  for (const [path, token] of Object.entries(tokenCatalog(source))) {
    if (path.startsWith("colors.")) {
      try {
        contrast(token.value, "#FFFFFF");
      } catch (error) {
        errors.push(`${path}: ${error.message}`);
      }
    }
    if (path.startsWith("spacing.spacing.") && !/^\d+px$/.test(token.value))
      errors.push(`IT-SPACE: dimensão px inválida ${path}`);
  }
  for (const mode of ["light", "dark"])
    for (const [name, node] of Object.entries(source.colors.semantic[mode]))
      if (!node.value.startsWith("{colors."))
        errors.push(
          `IT-TOKEN: semantic.${mode}.${name} deve referenciar um primitive/alias existente.`,
        );
  if (errors.length) return errors;
  if (
    JSON.stringify(Object.keys(m.colors.semantic.light).sort()) !==
    JSON.stringify(Object.keys(m.colors.semantic.dark).sort())
  )
    errors.push("IT-THEME: light/dark precisam expor os mesmos nomes.");
  for (const mapping of [
    m.policy.aliases.shadcnCss,
    m.policy.aliases.legacyCss,
    m.policy.aliases.tailwindV3,
  ])
    for (const name of Object.values(mapping))
      if (!Object.hasOwn(m.colors.semantic.light, name))
        errors.push(`IT-ALIAS: destino semântico inexistente ${name}`);
  for (const mode of ["light", "dark"])
    for (const [fg, bg] of source.policy.contrastPairs) {
      try {
        const ratio = contrast(
          m.colors.semantic[mode][fg].value,
          m.colors.semantic[mode][bg].value,
          m.colors.semantic[mode].canvas.value,
        );
        if (ratio < 4.5)
          errors.push(
            `IT-CONTRAST ${mode}.${fg}/${bg}: ${ratio.toFixed(3)}:1 < 4.5:1`,
          );
      } catch (error) {
        errors.push(error.message);
      }
    }
  for (const [name, c] of Object.entries(m.components.components)) {
    if (c.variantTarget !== "root" && !Object.hasOwn(c.slots, c.variantTarget))
      errors.push(
        `IT-CONTRACT: ${name}.variantTarget precisa existir em slots.`,
      );
    for (const [axis, value] of Object.entries(c.defaults))
      if (!Object.hasOwn(axis === "variant" ? c.variants : c.sizes, value))
        errors.push(
          `IT-CONTRACT: ${name}.${axis} default inexistente: ${value}`,
        );
    for (const [part, text] of Object.entries({
      base: c.base,
      ...c.variants,
      ...c.sizes,
      ...c.slots,
    }))
      for (const token of text.split(/\s+/).filter(Boolean)) {
        const error = vocabularyError(token, m);
        if (error) errors.push(`${name}.${part}: ${error}`);
      }
  }
  const ids = new Set();
  for (const asset of source.assets.assets) {
    if (ids.has(asset.id)) errors.push(`IT-ASSET: ID repetido ${asset.id}`);
    ids.add(asset.id);
    const path = pathResolve(root, asset.file);
    if (
      relative(root, path).startsWith("..") ||
      !asset.file.startsWith("assets/")
    ) {
      errors.push(`IT-ASSET: caminho fora do pacote ${asset.file}`);
      continue;
    }
    if (!existsSync(path)) {
      errors.push(`IT-ASSET: arquivo ausente ${asset.file}`);
      continue;
    }
    const bytes = readFileSync(path);
    const hash = createHash("sha256").update(bytes).digest("hex");
    try {
      const [width, height] = imageDimensions(bytes);
      if (width !== asset.width || height !== asset.height)
        errors.push(
          `IT-ASSET: metadata não corresponde à imagem ${asset.file}`,
        );
    } catch (error) {
      errors.push(`IT-ASSET: ${asset.file}: ${error.message}`);
    }
    if (hash !== asset.sha256)
      errors.push(`IT-ASSET: hash divergente ${asset.file}`);
    const declared = asset.file.match(/(?:icon-|favicon-)(\d+)x(\d+)/);
    if (
      asset.status === "active" &&
      declared &&
      (asset.width !== Number(declared[1]) ||
        asset.height !== Number(declared[2]))
    )
      errors.push(`IT-ASSET: dimensões incompatíveis ${asset.file}`);
  }
  for (const asset of source.assets.assets)
    if (asset.aliasOf) {
      const target = source.assets.assets.find((a) => a.id === asset.aliasOf);
      if (!target) errors.push(`IT-ASSET: alias sem destino ${asset.id}`);
      else if (target.sha256 !== asset.sha256)
        errors.push(`IT-ASSET: alias não é cópia byte-a-byte ${asset.id}`);
    }
  for (const font of source.fonts.fonts) {
    const path = join(root, font.file);
    if (
      !existsSync(path) ||
      createHash("sha256").update(readFileSync(path)).digest("hex") !==
        font.sha256
    )
      errors.push(`IT-FONT: arquivo/hash inválido ${font.file}`);
  }
  return errors;
}
