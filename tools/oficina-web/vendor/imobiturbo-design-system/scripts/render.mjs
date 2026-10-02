import { showcase } from "./showcase.mjs";
import { json, kebab, resolve, values, tokenCatalog } from "./model.mjs";
const header = (version) =>
  `/* Imobiturbo ${version}. GERADO: edite as fontes estruturadas; npm run design:check. */\n`;
export function renderCSS(source, fontPrefix = "../", compatibility = true) {
  const m = resolve(source, source);
  const declarations = (object) =>
    Object.entries(object)
      .map(([name, value]) => `  ${name}: ${value};`)
      .join("\n");
  const fontFaces = m.fonts.fonts
    .map(
      (f) =>
        `@font-face { font-family: ${JSON.stringify(f.family)}; src: url(${JSON.stringify(fontPrefix + f.file)}) format("truetype"); font-weight: ${f.weight}; font-style: ${f.style}; font-display: swap; }`,
    )
    .join("\n");
  const shadcn = m.policy.aliases.shadcnCss;
  const block = (mode) => {
    const semantic = m.colors.semantic[mode];
    const vars = {};
    for (const [name, node] of Object.entries(semantic))
      vars[`--it-${kebab(name)}`] = node.value;
    for (const [name, value] of Object.entries(
      m.colors.brand.accentScale[mode],
    ))
      vars[`--it-accent-${name}`] = value;
    for (const [name, value] of Object.entries(m.colors.brand.neutralScale))
      vars[`--it-neutral-${name}`] = value;
    vars["--it-dark-green"] = m.colors.brand.accent.darkGreen.value;
    if (compatibility)
      for (const [alias, name] of Object.entries(shadcn))
        vars[`--${alias}`] = `var(--it-${kebab(name)})`;
    const legacy = m.policy.aliases.legacyCss;
    if (compatibility)
      for (const name of Object.keys(semantic))
        vars[`--color-${kebab(name)}`] = `var(--it-${kebab(name)})`;
    if (compatibility)
      for (const [alias, name] of Object.entries(legacy))
        vars[`--color-${alias}`] = `var(--it-${kebab(name)})`;
    for (const [name, node] of Object.entries(m.spacing.shadow[mode]))
      vars[`--it-shadow-${name}`] = node.value;
    if (compatibility)
      for (const name of Object.keys(m.spacing.shadow[mode]))
        vars[`--shadow-${name}`] = `var(--it-shadow-${name})`;
    if (mode === "light") {
      for (const [group, prefix] of [
        ["fontFamily", "font"],
        ["fontSize", "fs"],
        ["lineHeight", "lh"],
        ["fontWeight", "fw"],
      ])
        for (const [name, value] of Object.entries(
          values(m.typography[group]),
        )) {
          vars[`--it-${prefix}-${name}`] = value;
          if (compatibility)
            vars[`--${prefix}-${name}`] = `var(--it-${prefix}-${name})`;
        }
      for (const [group, prefix] of [
        ["spacing", "space"],
        ["radius", "radius"],
        ["control", "control"],
        ["layout", "layout"],
      ])
        for (const [name, value] of Object.entries(values(m.spacing[group]))) {
          vars[`--it-${prefix}-${name}`] = value;
          if (compatibility)
            vars[`--${prefix}-${name}`] = `var(--it-${prefix}-${name})`;
        }
      for (const [name, value] of Object.entries(values(m.spacing.motion))) {
        vars[`--it-motion-${kebab(name)}`] = value;
        if (compatibility)
          vars[`--motion-${kebab(name)}`] = `var(--it-motion-${kebab(name)})`;
      }
      if (compatibility) vars["--radius"] = "var(--it-radius-md)";
      if (compatibility)
        for (const [alias, target] of Object.entries(m.policy.aliases.css))
          vars[alias] = `var(${target})`;
    }
    return `${mode === "light" ? ':root, [data-theme="light"]' : '.dark, [data-theme="dark"]'} {\n${declarations(vars)}\n}\n`;
  };
  const touch =
    "@media (pointer: coarse) {\n" +
    Object.entries(m.components.components)
      .filter(([, c]) => c.touchMinHeight !== "0px")
      .map(
        ([name, c]) =>
          `[data-it-component="${name}"] { min-height: ${c.touchMinHeight}; }`,
      )
      .join("\n") +
    "\n}\n";
  return (
    header(m.package.version) +
    touch +
    fontFaces +
    "\n" +
    block("light") +
    block("dark") +
    (compatibility
      ? `::selection { background: var(--it-accent); color: var(--it-accent-fg); }\n`
      : "")
  );
}
export function themeEntries(m) {
  const entries = {};
  for (const name of Object.keys(m.colors.semantic.light))
    entries[`--color-it-${kebab(name)}`] = `var(--it-${kebab(name)})`;
  entries["--color-it-dark-green"] = "var(--it-dark-green)";
  for (const [name] of Object.entries(m.colors.brand.neutralScale))
    entries[`--color-it-neutral-${name}`] = `var(--it-neutral-${name})`;
  for (const [name] of Object.entries(m.colors.brand.accentScale.light))
    entries[`--color-it-accent-${name}`] = `var(--it-accent-${name})`;
  for (const [group, theme, prefix] of [
    ["fontFamily", "font", "font"],
    ["fontSize", "text", "fs"],
    ["lineHeight", "leading", "lh"],
    ["fontWeight", "font-weight", "fw"],
  ])
    for (const name of Object.keys(m.typography[group]))
      entries[`--${theme}-it-${name}`] = `var(--it-${prefix}-${name})`;
  for (const [group, theme, prefix] of [
    ["spacing", "spacing", "space"],
    ["radius", "radius", "radius"],
    ["control", "spacing-control", "control"],
  ])
    for (const name of Object.keys(m.spacing[group]))
      entries[
        `--${theme === "spacing-control" ? "spacing-it-control" : theme + "-it"}-${name}`
      ] = `var(--it-${prefix}-${name})`;
  for (const name of Object.keys(m.spacing.shadow.light))
    entries[`--shadow-it-${name}`] = `var(--it-shadow-${name})`;
  entries["--ease-it-out"] = "var(--it-motion-ease-out)";
  entries["--ease-it-in-out"] = "var(--it-motion-ease-in-out)";
  entries["--breakpoint-sm"] = m.spacing.layout.mobile.value;
  entries["--breakpoint-md"] = m.spacing.layout.tablet.value;
  entries["--breakpoint-lg"] = m.spacing.layout.desktop.value;
  return entries;
}
export function preset(source) {
  const m = resolve(source, source),
    colors = {},
    spacing = {};
  for (const name of Object.keys(m.colors.semantic.light))
    colors[`it-${kebab(name)}`] = `var(--it-${kebab(name)})`;
  colors["it-dark-green"] = "var(--it-dark-green)";
  const compat = m.policy.aliases.tailwindV3;
  for (const [alias, name] of Object.entries(compat))
    colors[alias] = `var(--it-${kebab(name)})`;
  for (const name of Object.keys(m.spacing.spacing))
    spacing[`it-${name}`] = `var(--it-space-${name})`;
  for (const name of Object.keys(m.spacing.control))
    spacing[`it-control-${name}`] = `var(--it-control-${name})`;
  return {
    darkMode: ["class", '[data-theme="dark"]'],
    theme: {
      extend: {
        colors,
        spacing,
        fontFamily: {
          ...values(m.typography.fontFamily),
          ...Object.fromEntries(
            Object.entries(values(m.typography.fontFamily)).map(([k, v]) => [
              "it-" + k,
              v,
            ]),
          ),
        },
        fontSize: Object.fromEntries(
          Object.entries(values(m.typography.fontSize)).map(([k, v]) => [
            "it-" + k,
            v,
          ]),
        ),
        lineHeight: Object.fromEntries(
          Object.entries(values(m.typography.lineHeight)).map(([k, v]) => [
            "it-" + k,
            v,
          ]),
        ),
        borderRadius: {
          ...Object.fromEntries(
            Object.keys(m.spacing.radius).map((k) => [
              "it-" + k,
              `var(--it-radius-${k})`,
            ]),
          ),
          DEFAULT: "var(--radius)",
        },
        boxShadow: Object.fromEntries(
          Object.keys(m.spacing.shadow.light).map((k) => [
            "it-" + k,
            `var(--it-shadow-${k})`,
          ]),
        ),
        transitionDuration: {
          "it-fast": m.spacing.motion.durationFast.value,
          "it-base": m.spacing.motion.durationBase.value,
          "it-slow": m.spacing.motion.durationSlow.value,
        },
        transitionTimingFunction: {
          "it-out": m.spacing.motion.easeOut.value,
          "it-in-out": m.spacing.motion.easeInOut.value,
        },
      },
    },
  };
}
export function lintPolicy(m) {
  return {
    settings: {
      shadcn: {
        componentImports: m.policy.componentImports,
        mergeFunctions: m.policy.mergeFunctions,
        variantFunctions: m.policy.variantFunctions,
        note: m.policy.note,
      },
    },
    rules: {
      "shadcn/no-restyle": [
        "error",
        {
          allow: [],
          contracts: Object.entries(m.components.components).map(
            ([name, c]) => ({
              pattern: `^(Imobiturbo)?${name}$`,
              allow: c.allowedOverrides,
              message: {
                spacing: `IT-COMPONENT: "{{className}}" em {{component}} não permite padding/altura. Use size: ${Object.keys(c.sizes).join(", ") || "não disponível"}. Origem: components.json → ${name}.`,
                default: `IT-COMPONENT: "{{className}}" em {{component}} exige variant: ${Object.keys(c.variants).join(", ") || "não disponível"}. Origem: components.json → ${name}; implementação: {{file}}.`,
              },
            }),
          ),
        },
      ],
      "shadcn/no-raw-colors": [
        "error",
        {
          message:
            'IT-COLOR: "{{className}}" usa cor fora do tema. Use token semântico it-*; opções: {{tokens}}. Origem: tokens/colors.json; {{file}}.',
        },
      ],
      "shadcn/no-arbitrary-values": [
        "error",
        {
          message:
            'IT-VALUE: "{{className}}" é arbitrário. Use a escala finita it-* em /catalog; não substitua por uma fração como p-3.25.',
        },
      ],
      "shadcn/no-inline-styles": [
        "error",
        {
          message:
            "IT-INLINE: remova aparência inline; use token/variant do catálogo. Valores dinâmicos exigem exceção explícita do adapter.",
        },
      ],
      "shadcn/no-unknown-classes": [
        "error",
        {
          message:
            'IT-CLASS: "{{className}}" não gera CSS. {{suggestions|Consulte o catálogo e o tema carregado.}}',
        },
      ],
      "shadcn/require-static-classes": [
        "error",
        {
          message:
            "IT-STATIC: use classes completas ou variant/size em {{component}}; a expressão não pode ser verificada.",
        },
      ],
      "imobiturbo/finite-vocabulary": "error",
      "imobiturbo/component-contract": "error",
      "imobiturbo/native-controls": "error",
    },
    overrides: [
      {
        files: m.policy.componentFiles,
        rules: {
          "shadcn/no-restyle": "off",
          "shadcn/require-static-classes": "off",
          "imobiturbo/native-controls": "off",
        },
      },
    ],
  };
}
function reference(m, tokens) {
  let text = `# Referência Imobiturbo ${m.package.version}\n\nGerada de tokens, components.json, policy.json e manifests. Não editar.\n\n## Tokens\n\n| Origem | Valor resolvido | Alias |\n|---|---|---|\n`;
  for (const [path, t] of Object.entries(tokens))
    text += `| ${path} | ${t.value.replaceAll("|", "\\|")} | ${t.alias ?? ""} |\n`;
  text += "\n## Componentes\n\n";
  for (const [name, c] of Object.entries(m.components.components))
    text += `### ${name}\n\nVariants: ${Object.keys(c.variants).join(", ") || "nenhuma"}. Sizes: ${Object.keys(c.sizes).join(", ") || "nenhum"}. Defaults: ${JSON.stringify(c.defaults)}. Target de variant: ${c.variantTarget}. Overrides: ${c.allowedOverrides.join(", ")}.\n\n`;
  text +=
    "## Assets ativos\n\n| ID | Arquivo | Fundo | Dimensão |\n|---|---|---|---|\n";
  for (const a of m.assets.assets.filter((a) => a.status === "active"))
    text += `| ${a.id} | ${a.file} | ${a.theme} | ${a.width}×${a.height} |\n`;
  return text;
}
export function outputs(source) {
  const m = resolve(source, source),
    version = m.package.version,
    tokens = tokenCatalog(source),
    css = renderCSS(source),
    p = preset(source),
    out = {};
  out["dist/tokens-scoped.css"] = renderCSS(
    source,
    source.package.name + "/",
    false,
  );
  out["dist/tokens.css"] = css;
  out["tokens.css"] = renderCSS(source, "");
  out["colors_and_type.css"] =
    header(version) +
    '/* Alias de compatibilidade; a definição está em tokens/. */\n@import "./tokens.css";\n';
  out["dist/tailwind-v4.css"] =
    header(version) +
    '@import "./tokens-scoped.css";\n@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));\n@theme inline {\n' +
    Object.entries(themeEntries(m))
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n") +
    "\n}\n@utility duration-it-fast { transition-duration: var(--it-motion-duration-fast); }\n@utility duration-it-base { transition-duration: var(--it-motion-duration-base); }\n@utility duration-it-slow { transition-duration: var(--it-motion-duration-slow); }\n";
  out["dist/tailwind-v3.cjs"] =
    header(version) + "module.exports = " + JSON.stringify(p, null, 2) + ";\n";
  out["dist/tailwind-preset.js"] =
    header(version) + 'export { default } from "./tailwind-v3.cjs";\n';
  const exports = {
    VERSION: version,
    BRAND: {
      accent: values(m.colors.brand.accent),
      accentScale: m.colors.brand.accentScale,
      neutralScale: m.colors.brand.neutralScale,
    },
    SEMANTIC: {
      light: values(m.colors.semantic.light),
      dark: values(m.colors.semantic.dark),
    },
    FONT_FAMILY: values(m.typography.fontFamily),
    FONT_SIZE: values(m.typography.fontSize),
    FONT_WEIGHT: values(m.typography.fontWeight),
    LINE_HEIGHT: values(m.typography.lineHeight),
    SPACING: values(m.spacing.spacing),
    RADIUS: values(m.spacing.radius),
    SHADOW: {
      light: values(m.spacing.shadow.light),
      dark: values(m.spacing.shadow.dark),
    },
    MOTION: values(m.spacing.motion),
    CONTROL: values(m.spacing.control),
    LAYOUT: values(m.spacing.layout),
  };
  out["dist/tokens.js"] =
    header(version) +
    Object.entries(exports)
      .map(([k, v]) => `export const ${k} = ${JSON.stringify(v, null, 2)};`)
      .join("\n") +
    "\n";
  const declaration = (value) =>
    typeof value === "string"
      ? JSON.stringify(value)
      : "{ " +
        Object.entries(value)
          .map(([k, v]) => `readonly ${JSON.stringify(k)}: ${declaration(v)}`)
          .join("; ") +
        " }";
  out["dist/tokens.d.ts"] =
    Object.entries(exports)
      .map(([k, v]) => `export declare const ${k}: ${declaration(v)};`)
      .join("\n") +
    "\nexport type ThemeMode = keyof typeof SEMANTIC;\nexport type AccentStep = keyof typeof BRAND.accentScale.light;\n";
  out["dist/tokens.ts"] =
    header(version) +
    Object.entries(exports)
      .map(
        ([k, v]) =>
          `export const ${k} = ${JSON.stringify(v, null, 2)} as const;`,
      )
      .join("\n") +
    "\nexport type ThemeMode = keyof typeof SEMANTIC;\nexport type AccentStep = keyof typeof BRAND.accentScale.light;\n";
  const recipes = {};
  for (const [name, c] of Object.entries(m.components.components))
    recipes[
      name.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase() + "_RECIPES"
    ] = {
      base: c.base,
      variants: c.variants,
      sizes: c.sizes,
      defaults: c.defaults,
      variantTarget: c.variantTarget,
      ...c.slots,
    };
  recipes.KPI_TILE_RECIPES.container = recipes.KPI_TILE_RECIPES.base;
  recipes.CARD_RECIPES.interactive =
    m.components.components.Card.variants.interactive;
  recipes.CARD_RECIPES.authority =
    m.components.components.Card.variants.authority;
  out["dist/recipes.js"] =
    header(version) +
    Object.entries(recipes)
      .map(([k, v]) => `export const ${k} = ${JSON.stringify(v, null, 2)};`)
      .join("\n") +
    "\n";
  out["dist/recipes.d.ts"] =
    Object.entries(recipes)
      .map(([k, v]) => `export declare const ${k}: ${declaration(v)};`)
      .join("\n") + "\n";
  out["dist/recipes.ts"] =
    header(version) +
    Object.entries(recipes)
      .map(
        ([k, v]) =>
          `export const ${k} = ${JSON.stringify(v, null, 2)} as const;`,
      )
      .join("\n") +
    "\n";
  out["dist/catalog.json"] = json({
    version,
    tokens,
    components: m.components.components,
    assets: m.assets.assets.filter((a) => a.status === "active"),
    policy: m.policy,
  });
  out["dist/design-system.lint.json"] = json(lintPolicy(m));
  out["dist/reference.md"] = reference(m, tokens);
  out["index.html"] = showcase(source);
  out["components.html"] = showcase(source);
  for (const page of [
    "spacing-scale",
    "kpi-card",
    "type-scale",
    "btn-primary",
    "iconography",
    "color-neutral-dark",
    "logo-primary",
    "toggle-switch",
    "color-semantic",
    "type-display",
    "color-lime-scale",
    "motif-chevron",
    "type-body",
    "type-eyebrow-mono",
    "brand-voice",
    "btn-secondary",
    "nav-tabs",
    "badges-chips",
    "motion",
    "radii",
    "elevation",
    "logo-light",
    "color-neutral-light",
    "color-brand",
    "input-field",
    "symbol-mark",
  ])
    out[`preview/${page}.html`] = showcase(source)
      .replaceAll('href="dist/', 'href="../dist/')
      .replaceAll('src="assets/', 'src="../assets/')
      .replaceAll('href="templates/', 'href="../templates/');
  out["preview/_base.css"] =
    '/* Gerado: previews usam os mesmos contratos. */\n@import "../dist/showcase.css";\n';
  return out;
}
