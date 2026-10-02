import { resolve, kebab } from "./model.mjs";
export function showcase(source) {
  const m = resolve(source, source),
    components = m.components.components,
    asset = (theme) =>
      m.assets.assets.find(
        (a) => a.id === `logo.imobiturbo.${theme}` && a.status === "active",
      );
  const button = (variant, size) =>
    `<button type="button" data-it-component="Button" data-variant="${variant}" data-size="${size}" class="${components.Button.base} ${components.Button.variants[variant]} ${components.Button.sizes[size]}">${variant} ${size}</button>`;
  const body = (mode) =>
    `<section data-theme="${mode}" class="it-showcase"><header><img src="${asset(mode === "dark" ? "dark" : "light").file}" alt="Imobiturbo" width="${asset(mode === "dark" ? "dark" : "light").width}" height="${asset(mode === "dark" ? "dark" : "light").height}"/><h2>${mode === "dark" ? "Tema escuro" : "Tema claro"}</h2></header><section id="buttons-${mode}" aria-label="Botões">${Object.keys(
      components.Button.variants,
    )
      .flatMap((v) => ["sm", "md", "lg"].map((s) => button(v, s)))
      .join("\n")}</section><section aria-label="Badges">${Object.entries(
      components.Badge.variants,
    )
      .map(
        ([name, classes]) =>
          `<span data-it-component="Badge" data-variant="${name}" data-size="sm" class="${components.Badge.base} ${classes} ${components.Badge.sizes.sm}">${name}</span>`,
      )
      .join(
        " ",
      )}</section><section><label for="input-${mode}">Nome</label><input data-it-component="Input" id="input-${mode}" placeholder="Seu nome" class="${components.Input.base} ${components.Input.sizes.md}"/></section><section data-it-component="KpiTile" data-variant="positive" class="${components.KpiTile.base}"><span data-it-slot="label" class="${components.KpiTile.slots.label}">Leads qualificados</span><strong data-it-slot="value" class="${components.KpiTile.slots.value}">128</strong><span data-it-slot="change" class="${components.KpiTile.slots.change} ${components.KpiTile.variants.positive}">+24% · exemplo demonstrativo</span></section><section data-it-component="Card" data-variant="default" class="${components.Card.base} ${components.Card.variants.default}"><div data-it-slot="content" class="${components.Card.slots.content}"><h3>Card padrão</h3><p>Tokens e variantes definidos em uma origem.</p></div></section><section data-it-component="Hero" data-variant="editorial" class="${components.Hero.base}"><h3 data-it-slot="heading" class="${components.Hero.variants.editorial}">Sua operação, com clareza.</h3><p data-it-slot="description" class="${components.Hero.slots.description}">Hero editorial usa o tema deste bloco.</p></section></section>`;
  return `<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Imobiturbo Design System ${m.package.version}</title><link rel="stylesheet" href="dist/showcase.css"></head><body><main><h1>Imobiturbo Design System ${m.package.version}</h1><p>Referência gerada. Consulte <a href="dist/reference.md">tokens e contratos</a>.</p><nav><a href="templates/low-ticket-03/index.html">Template low ticket aprovado</a></nav>${body("light")}${body("dark")}</main></body></html>\n`;
}
export function showcaseStyle(source) {
  const m = resolve(source, source);
  return `@layer base{body{margin:0;font-family:var(--it-font-primary);background:var(--it-canvas);color:var(--it-text-primary)}main{max-width:var(--it-layout-container);margin:auto;padding:var(--it-space-4)}h1{font-size:var(--it-fs-3xl)}h2{font-size:var(--it-fs-xl)}h3{font-size:var(--it-fs-lg)}p{font-size:var(--it-fs-base);line-height:var(--it-lh-base)}.it-showcase{background:var(--it-canvas);color:var(--it-text-primary);padding:var(--it-space-6);margin-block:var(--it-space-6);border-radius:var(--it-radius-xl)}.it-showcase header img{width:auto;height:var(--it-control-lg);max-width:100%;object-fit:contain}.it-showcase>section{margin-block:var(--it-space-6)}.it-showcase section[aria-label]{display:flex;gap:var(--it-space-3);flex-wrap:wrap}.it-showcase input{display:block}.it-showcase label{display:block;margin-bottom:var(--it-space-2)}button:focus-visible,input:focus-visible{outline:2px solid var(--it-ring);outline-offset:2px}@media(max-width:${m.spacing.layout.mobile.value}){.it-showcase{padding:var(--it-space-4)}.it-showcase header img{height:var(--it-space-10)}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important}}}`;
}
