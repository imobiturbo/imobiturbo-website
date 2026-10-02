import { kebab } from "./model.mjs";
export function baseClass(value) {
  let depth = 0,
    start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "[" || value[i] === "(") depth++;
    if (value[i] === "]" || value[i] === ")") depth--;
    if (value[i] === ":" && depth === 0) start = i + 1;
  }
  return value.slice(start).replace(/^!|!$/g, "");
}
export function vocabularyError(token, source) {
  const name = baseClass(token),
    spacing = new Set(Object.keys(source.spacing.spacing));
  const numeric = name.match(
    /^-?(p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy]|scroll-[pm][xytrblse]?|(?:(?:min|max)-)?[hw]|size)-(it-)?([\d.]+)$/,
  );
  if (numeric && (!numeric[2] || !spacing.has(numeric[3])))
    return `IT-SPACE: "${token}" não pertence à escala namespaced. Use ${numeric[1]}-it-3 ou ${numeric[1]}-it-4; origem: tokens/spacing.json. Frações não são uma correção.`;
  const radius = name.match(/^rounded(?:-[trblse]{1,2})?-(it-)?(.+)$/);
  if (
    radius &&
    (!radius[1] || !Object.hasOwn(source.spacing.radius, radius[2]))
  )
    return `IT-RADIUS: "${token}" fora do contrato. Use rounded-it-lg ou rounded-it-xl; origem: tokens/spacing.json → radius.`;
  if (/\[|\(--/.test(name))
    return `IT-VALUE: "${token}" contorna os tokens; use classe it-* ou size/variant do componente. Origem: /catalog.`;
  if (
    /^(?:p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?)-it-/.test(name) &&
    !spacing.has(name.split("-").at(-1))
  )
    return `IT-SPACE: "${token}" não existe em tokens/spacing.json.`;
  const duration = name.match(/^duration-(.+)$/);
  if (duration && !["it-fast", "it-base", "it-slow"].includes(duration[1]))
    return `IT-MOTION: "${token}"; use duration-it-fast, duration-it-base ou duration-it-slow.`;
  const font = name.match(/^font-(.+)$/);
  if (
    font &&
    ![
      "normal",
      ...Object.keys(source.typography.fontWeight).map((k) => "it-" + k),
      ...Object.keys(source.typography.fontFamily).map((k) => "it-" + k),
    ].includes(font[1])
  )
    return `IT-TYPE: "${token}"; use font-it-primary, font-it-editorial ou font-it-mono. Origem: tokens/typography.json.`;
  if (/^text-(?:xs|sm|base|lg|xl|\d+xl)$/.test(name))
    return `IT-TYPE: "${token}" usa a escala do produto; use text-it-${name.slice(5)}. Origem: tokens/typography.json.`;
  if (/^shadow-(?!it-|none$)/.test(name))
    return `IT-ELEVATION: "${token}"; use shadow-it-sm, shadow-it-md ou shadow-it-lg. Origem: tokens/spacing.json.`;
  if (
    /^(?:bg|text|border|ring|fill|stroke|outline|decoration)-(?:black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d+)?(?:\/\d+)?$/.test(
      name,
    )
  )
    return `IT-COLOR: "${token}" usa paleta fora do tema. Use bg-it-accent para ação, text-it-accent-text para link ou border-it-border para borda. Origem: tokens/colors.json → semantic.`;
  const color = name.match(
    /^(bg|text|border|ring|fill|stroke)-it-([a-z][\w-]*)(?:\/\d+)?$/,
  );
  if (
    color &&
    ![
      "dark-green",
      ...Object.keys(source.colors.semantic.light).map(kebab),
    ].includes(color[2]) &&
    !(
      color[1] === "text" && Object.hasOwn(source.typography.fontSize, color[2])
    )
  )
    return `IT-COLOR: "${token}" não é token semântico. Use bg-it-accent / text-it-text-primary; origem: tokens/colors.json → semantic.`;
  if (
    /^(bg|text|border|ring|fill|stroke)-(primary|secondary|accent|background|foreground|muted|destructive|surface)(?:-|$)/.test(
      name,
    )
  )
    return `IT-COLOR: "${token}" pode resolver para outro tema. Use o nome it-* de /catalog.`;
  return null;
}
