/* Imobiturbo 5.0.2. GERADO: edite as fontes estruturadas; npm run design:check. */
export const BUTTON_RECIPES = {
  "base": "inline-flex items-center justify-center font-it-primary font-it-semibold select-none transition-colors duration-it-fast ease-it-out disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-it-ring focus-visible:ring-offset-2 focus-visible:ring-offset-it-ring-offset",
  "variants": {
    "primary": "bg-it-accent text-it-accent-fg hover:bg-it-accent-hover shadow-it-sm",
    "authority": "bg-it-dark-green text-it-text-inverse shadow-it-sm",
    "secondary": "bg-it-surface-elevated text-it-text-primary hover:bg-it-surface-hover border border-it-border",
    "outline": "border border-it-border bg-transparent text-it-text-primary hover:bg-it-surface-hover",
    "ghost": "bg-transparent text-it-text-primary hover:bg-it-surface-hover",
    "destructive": "bg-it-destructive text-it-destructive-fg shadow-it-sm",
    "link": "text-it-accent-text underline underline-offset-4 bg-transparent"
  },
  "sizes": {
    "sm": "h-it-control-sm px-it-3 rounded-it-md text-it-xs gap-it-1",
    "md": "h-it-control-md px-it-4 rounded-it-lg text-it-sm gap-it-2",
    "lg": "h-it-control-lg px-it-6 rounded-it-lg text-it-base gap-it-2",
    "icon": "h-it-control-md w-it-control-md rounded-it-lg p-it-0"
  },
  "defaults": {
    "variant": "primary",
    "size": "md"
  },
  "variantTarget": "root"
};
export const INPUT_RECIPES = {
  "base": "w-full font-it-primary bg-it-surface text-it-text-primary border border-it-border placeholder:text-it-text-subtle transition-colors duration-it-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-it-ring disabled:opacity-50 disabled:cursor-not-allowed aria-invalid:border-it-danger",
  "variants": {},
  "sizes": {
    "sm": "h-it-control-sm px-it-3 rounded-it-md text-it-xs gap-it-1",
    "md": "h-it-control-md px-it-4 rounded-it-lg text-it-sm gap-it-2",
    "lg": "h-it-control-lg px-it-6 rounded-it-lg text-it-base gap-it-2"
  },
  "defaults": {
    "size": "md"
  },
  "variantTarget": "root"
};
export const BADGE_RECIPES = {
  "base": "inline-flex items-center rounded-it-full font-it-mono uppercase",
  "variants": {
    "default": "bg-it-accent-soft text-it-accent-text",
    "neutral": "bg-it-surface-elevated text-it-text-muted",
    "success": "bg-it-success-bg text-it-success",
    "warning": "bg-it-warning-bg text-it-warning",
    "danger": "bg-it-danger-bg text-it-danger",
    "mono": "bg-it-surface-elevated text-it-text-primary"
  },
  "sizes": {
    "sm": "text-it-xs px-it-2 py-it-1",
    "md": "text-it-sm px-it-3 py-it-1"
  },
  "defaults": {
    "variant": "default",
    "size": "sm"
  },
  "variantTarget": "root"
};
export const CARD_RECIPES = {
  "base": "font-it-primary rounded-it-xl",
  "variants": {
    "default": "bg-it-surface border border-it-border shadow-it-sm text-it-text-primary",
    "interactive": "bg-it-surface border border-it-border hover:shadow-it-md transition-shadow duration-it-fast text-it-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-it-ring",
    "authority": "bg-it-dark-green text-it-text-inverse shadow-it-lg"
  },
  "sizes": {},
  "defaults": {
    "variant": "default"
  },
  "variantTarget": "root",
  "content": "p-it-6",
  "interactive": "bg-it-surface border border-it-border hover:shadow-it-md transition-shadow duration-it-fast text-it-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-it-ring",
  "authority": "bg-it-dark-green text-it-text-inverse shadow-it-lg"
};
export const KPI_TILE_RECIPES = {
  "base": "font-it-primary p-it-6 bg-it-surface border border-it-border rounded-it-xl flex flex-col gap-it-2",
  "variants": {
    "default": "text-it-text-muted",
    "positive": "text-it-success",
    "negative": "text-it-danger"
  },
  "sizes": {},
  "defaults": {
    "variant": "default"
  },
  "variantTarget": "change",
  "label": "text-it-xs font-it-mono uppercase text-it-text-muted",
  "value": "text-it-2xl font-it-bold font-it-primary text-it-text-primary",
  "change": "text-it-xs font-it-mono font-it-medium inline-flex items-center gap-it-1",
  "container": "font-it-primary p-it-6 bg-it-surface border border-it-border rounded-it-xl flex flex-col gap-it-2"
};
export const HERO_RECIPES = {
  "base": "bg-it-canvas text-it-text-primary p-it-8",
  "variants": {
    "default": "font-it-primary text-it-4xl leading-it-tight",
    "editorial": "font-it-editorial italic text-it-4xl leading-it-tight"
  },
  "sizes": {},
  "defaults": {
    "variant": "default"
  },
  "variantTarget": "heading",
  "heading": "",
  "description": "font-it-primary text-it-base leading-it-base"
};
