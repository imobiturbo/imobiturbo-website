import { readFileSync } from "node:fs";
import { join } from "node:path";
export const kebab = (name) => name.replace(/([A-Z])/g, "-$1").toLowerCase();
export const json = (value) => JSON.stringify(value, null, 2) + "\n";
export function load(root) {
  const read = (name) => JSON.parse(readFileSync(join(root, name), "utf8"));
  return {
    package: read("package.json"),
    colors: read("tokens/colors.json"),
    typography: read("tokens/typography.json"),
    spacing: read("tokens/spacing.json"),
    components: read("components.json"),
    policy: read("policy.json"),
    assets: read("assets-manifest.json"),
    fonts: read("fonts/manifest.json"),
  };
}
export function resolve(model, value, trail = []) {
  if (typeof value === "string")
    return value.replace(/\{([a-zA-Z0-9_.]+)\}/g, (_, path) => {
      if (trail.includes(path))
        throw new Error(`IT-REF: ciclo ${[...trail, path].join(" → ")}`);
      let target = model;
      for (const part of path.split(".")) target = target?.[part];
      if (target === undefined)
        throw new Error(`IT-REF: referência inexistente ${path}`);
      const result = resolve(model, target?.value ?? target, [...trail, path]);
      if (typeof result !== "string")
        throw new Error(`IT-REF: ${path} não aponta para um valor`);
      return result;
    });
  if (Array.isArray(value))
    return value.map((entry) => resolve(model, entry, trail));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        key.startsWith("$") || key === "description"
          ? entry
          : resolve(model, entry, trail),
      ]),
    );
  return value;
}
export const values = (group) =>
  Object.fromEntries(
    Object.entries(group).map(([name, node]) => [name, node?.value ?? node]),
  );
export function tokenCatalog(model) {
  const out = {};
  function walk(value, path) {
    if (typeof value === "string") {
      out[path] = {
        value: resolve(model, value),
        source: "tokens/" + path.split(".")[0] + ".json",
        alias: /^\{/.test(value) ? value : null,
      };
      return;
    }
    if (value?.value !== undefined) {
      out[path] = {
        value: resolve(model, value.value),
        source: "tokens/" + path.split(".")[0] + ".json",
        alias: /^\{/.test(value.value) ? value.value : null,
      };
      return;
    }
    for (const [key, child] of Object.entries(value ?? {}))
      if (!key.startsWith("$") && key !== "description")
        walk(child, `${path}.${key}`);
  }
  for (const domain of ["colors", "typography", "spacing"])
    walk(model[domain], domain);
  return out;
}
export function color(value, background = [1, 1, 1]) {
  if (/^#[\da-f]{6}$/i.test(value))
    return [1, 3, 5].map(
      (index) => parseInt(value.slice(index, index + 2), 16) / 255,
    );
  const match = value.match(/^rgba?\(([^)]+)\)$/);
  if (match) {
    const parts = match[1].split(",").map(Number);
    if (
      ![3, 4].includes(parts.length) ||
      parts.some((v) => !Number.isFinite(v)) ||
      parts.slice(0, 3).some((v) => v < 0 || v > 255) ||
      (parts[3] !== undefined && (parts[3] < 0 || parts[3] > 1))
    )
      throw new Error(`IT-COLOR: canais inválidos ${value}`);
    return parts
      .slice(0, 3)
      .map(
        (channel, index) =>
          (channel / 255) * (parts[3] ?? 1) +
          background[index] * (1 - (parts[3] ?? 1)),
      );
  }
  throw new Error(`IT-COLOR: formato não validado ${value}`);
}
export function contrast(foreground, background, canvas = "#FFFFFF") {
  const bg = color(background, color(canvas));
  const fg = color(foreground, bg);
  const luminance = (rgb) =>
    rgb
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, index) => sum + v * [0.2126, 0.7152, 0.0722][index], 0);
  const [low, high] = [luminance(fg), luminance(bg)].sort((a, b) => a - b);
  return (high + 0.05) / (low + 0.05);
}
