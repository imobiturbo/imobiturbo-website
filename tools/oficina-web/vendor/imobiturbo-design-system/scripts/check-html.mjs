import { readFileSync } from "node:fs";
import { parse } from "parse5";
import { resolve } from "./model.mjs";
import { vocabularyError } from "./vocabulary.mjs";
import { authoredCssErrors } from "./authored-css.mjs";

export function htmlErrors(html, source, filename = "UI.html") {
  const model = resolve(source, source),
    errors = [],
    tree = parse(html, { sourceCodeLocationInfo: true });
  const nodes = [];
  function walk(n) {
    if (n.tagName) nodes.push(n);
    for (const child of n.childNodes ?? []) walk(child);
    if (n.content) walk(n.content);
  }
  walk(tree);
  const attrs = (n) =>
    Object.fromEntries((n.attrs ?? []).map((a) => [a.name, a.value]));
  const text = (n) =>
    n.nodeName === "#text" ? n.value : (n.childNodes ?? []).map(text).join("");
  const report = (n, message) =>
    errors.push(
      `${filename}:${n.sourceCodeLocation?.startLine ?? 1} ${message}`,
    );
  const allowed = (c, pattern) =>
    new RegExp(
      "^" +
        pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*") +
        "$",
    ).test(c);
  for (const node of nodes) {
    const a = attrs(node),
      classes = (a.class ?? "").split(/\s+/).filter(Boolean);
    for (const c of classes) {
      const error = vocabularyError(c, source);
      if (error) report(node, error);
    }
    if (a.style !== undefined)
      report(
        node,
        "IT-INLINE: aparência inline não é verificável. Use classes/tokens do contrato.",
      );
    if (node.tagName === "style")
      for (const error of authoredCssErrors(text(node), filename))
        report(node, error);
    if (node.tagName === "img") {
      if (a.alt === undefined)
        report(node, "IT-A11Y: img exige alt, vazio somente se decorativa.");
      const path = decodeURI((a.src ?? "").replace(/^\.\//, ""));
      const asset = model.assets.assets.find((x) => x.file === path);
      if (asset && !["active", "source"].includes(asset.status))
        report(
          node,
          `IT-ASSET: ${asset.id} é ${asset.status}; use ID ativo de assets-manifest.json.`,
        );
    }
    if (
      node.tagName === "button" &&
      !text(node).trim() &&
      !a["aria-label"] &&
      !a["aria-labelledby"]
    )
      report(node, "IT-A11Y: botão sem nome. Forneça texto ou aria-label.");
    if (
      node.tagName === "input" &&
      a.type !== "hidden" &&
      !a["aria-label"] &&
      !a["aria-labelledby"] &&
      !nodes.some((n) => n.tagName === "label" && attrs(n).for === a.id)
    )
      report(node, "IT-A11Y: input exige label associado ou nome acessível.");
    if (
      ["button", "input"].includes(node.tagName) &&
      a.type !== "hidden" &&
      !a["data-it-component"]
    )
      report(
        node,
        "IT-CONTRACT: controle sem contrato. Declare data-it-component e use as classes de /catalog.",
      );
    const name = a["data-it-component"];
    if (!name) continue;
    const c = model.components.components[name];
    if (!c) {
      report(node, `IT-CONTRACT: ${name} não existe em components.json.`);
      continue;
    }
    const variant = a["data-variant"] ?? c.defaults.variant,
      size = a["data-size"] ?? c.defaults.size;
    if (variant && !Object.hasOwn(c.variants, variant))
      report(
        node,
        `IT-CONTRACT: ${name}.variant="${variant}"; use ${Object.keys(c.variants).join(", ")}.`,
      );
    if (size && !Object.hasOwn(c.sizes, size))
      report(
        node,
        `IT-CONTRACT: ${name}.size="${size}"; use ${Object.keys(c.sizes).join(", ")}.`,
      );
    const expected = [
      c.base,
      c.variantTarget === "root" ? c.variants[variant] : "",
      c.sizes[size],
    ]
      .filter(Boolean)
      .join(" ")
      .split(/\s+/)
      .filter(Boolean);
    for (const required of expected)
      if (!classes.includes(required))
        report(
          node,
          `IT-CONTRACT: ${name} exige "${required}"; copie /recipes com variant=${variant ?? "none"}, size=${size ?? "none"}.`,
        );
    for (const actual of classes)
      if (
        !expected.includes(actual) &&
        !c.allowedOverrides.some((p) => allowed(actual, p))
      )
        report(
          node,
          `IT-RESTYLE: ${name} não permite "${actual}". Use variant/size ou override de layout de components.json.`,
        );
    for (const [slot, slotClasses] of Object.entries(c.slots)) {
      const target = [];
      function find(n) {
        for (const child of n.childNodes ?? []) {
          if (attrs(child)["data-it-slot"] === slot) target.push(child);
          find(child);
        }
      }
      find(node);
      if (!target.length) {
        report(node, `IT-CONTRACT: ${name} exige slot "${slot}".`);
        continue;
      }
      const required = [
        slotClasses,
        c.variantTarget === slot ? c.variants[variant] : "",
      ]
        .filter(Boolean)
        .join(" ")
        .split(/\s+/)
        .filter(Boolean);
      for (const part of target)
        for (const cls of required)
          if (!(attrs(part).class ?? "").split(/\s+/).includes(cls))
            report(part, `IT-CONTRACT: ${name}.${slot} exige "${cls}".`);
    }
  }
  return errors;
}
export function checkHtmlFiles(files, source) {
  return files.flatMap((file) =>
    htmlErrors(readFileSync(file, "utf8"), source, file),
  );
}
