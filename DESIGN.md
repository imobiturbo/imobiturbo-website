---
name: Imobiturbo Design System
description: Black-and-Lime design language for high-performance real estate operations.
colors:
  primary: "#BFD730"
  primary-hover: "#D2E854"
  primary-press: "#A6BC1F"
  neutral-bg: "#000000"
  neutral-surface: "#0A0A0A"
  neutral-surface-raised: "#141414"
  neutral-card: "#1F1F1F"
  text-primary: "#FFFFFF"
  text-muted: "#B8B8B8"
  text-dark: "#5C5C5C"
typography:
  display:
    fontFamily: '"Futura LT Cond", "Barlow Condensed", "Oswald", system-ui, sans-serif'
    fontSize: "clamp(54px, 16vw, 78px)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  body:
    fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
rounded:
  xs: "2px"
  sm: "4px"
  md: "8px"
  lg: "14px"
  xl: "22px"
  pill: "999px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "24px"
  space-6: "32px"
  space-7: "48px"
  space-8: "64px"
  space-9: "96px"
  space-10: "128px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System: Imobiturbo

## 1. Overview

**Creative North Star: "The High-Performance Black Canvas"**

Imobiturbo is a premium, technology-oriented ecosystem that rejects the generic, low-contrast SaaS templates of the 2020s. Instead of soft warm-neutrals or gray cards with subtle purple gradients, Imobiturbo utilizes a deep, pitch-black dark mode ("black canvas") combined with razor-sharp, high-contrast hits of Pantone Lime Punch (`#BFD730`). The typography is aggressive, condensed, and tightly tracked to evoke the precision and speed of a professional real estate operations center.

**Key Characteristics:**
- Pitch-black background (`#000000`) serving as the high-contrast stage.
- Saturated Pantone Lime Punch (`#BFD730`) as a singular accent color used on ≤10% of any screen.
- Grotesque condensed typography with tight tracking (floor of `-0.04em`).
- Flat surfaces at rest, using subtle dark borders (`#2A2A2A`) or tonal elevations instead of standard SaaS shadows.

## 2. Colors

The color strategy is committed and restrained. We use a pitch-black canvas with one high-voltage lime accent and sharp neutral values. No other hue is permitted without strategic intent.

### Primary
- **Pantone Lime Punch** (`#BFD730` / `oklch(84% 0.21 113)`): The core brand accent. Used sparingly for interactive cues, buttons, hover states, and critical highlighted text.
- **Lime Hover** (`#D2E854`): Lifted interactive states.
- **Lime Press** (`#A6BC1F`): Active/pressed interactive states.

### Neutral
- **Black Canvas** (`#000000`): The base background color. Never use pure grays or warm off-whites.
- **Ink Surface** (`#0A0A0A`): The primary raised surface for panels and structures.
- **Ink Raised** (`#141414`): Sibling raised layers.
- **Card Surface** (`#1F1F1F`): The standard container background for testimonial cards and content units.
- **Hairlines** (`#2A2A2A`): Subtle borders on dark containers.

### Named Rules
**The 10% Accent Rule.** The primary Lime Punch accent is used on ≤10% of any given screen. Its rarity is the source of its high-impact energy.

## 3. Typography

**Display Font:** "Futura LT Cond" (Barlow Condensed, Oswald fallbacks)
**Body Font:** "Inter" (Helvetica Neue fallback)

### Hierarchy
- **Display** (800, clamp(54px, 16vw, 78px), 0.92, -0.04em): Used exclusively for hero H1 headers and large display headers. Letters must stay tight.
- **Headline** (800, clamp(28px, 6vw, 46px), 1.05, -0.02em): Section headers (H2).
- **Title** (700, 20px, 1.45, normal): Card and subsection headers (H3).
- **Body** (400, 15px, 1.45, normal): Main content body. Max line length capped at 65-75ch.
- **Label** (800, 13px, uppercase, 0px): Eyebrows, UI labels, tags.

### Named Rules
**The Display Floor Rule.** Display H1 typography should never have a letter-spacing tighter than `-0.04em` to ensure readability.

## 4. Elevation

The system is flat by default. Depth is conveyed using dark tonal layering rather than drop shadows.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Drop shadows are prohibited. Interactive depth is conveyed through subtle border shifts (`#3A3A3A`) and lime-green border flashes.

## 5. Components

### Buttons
- **Shape:** Full pill (`rounded-pill`, `999px` radius).
- **Primary:** Pantone Lime Punch background (`#BFD730`), black text (`#000000`), bold weight (800).
- **Hover / Focus:** Changes background to Lime Hover (`#D2E854`) and shifts up slightly.

### Cards / Containers
- **Corner Style:** Large curves (14px radius).
- **Background:** Ink raised (`#141414`) or Card surface (`#1F1F1F`).
- **Border:** 1px solid dark border (`#2A2A2A`).

### Inputs / Fields
- **Style:** Flat background (`#0A0A0A`), 1px solid border (`#2A2A2A`), fully rounded corners (8px radius).
- **Focus:** 1px solid Pantone Lime Punch border (`#BFD730`) with a focus-ring glow.

## 6. Do's and Don'ts

### Do:
- **Do** respect the 10% Accent Rule: keep Lime Punch rare.
- **Do** pair display text with wide tracking labels for typographical contrast.
- **Do** use `text-wrap: balance` on H1 headings.

### Don't:
- **Don't** use standard SaaS gradients (like blue-to-purple) on headings or containers.
- **Don't** use side-stripe borders as card accents.
- **Don't** use card rounding larger than 16px (except for tags and buttons).
- **Don't** pair a soft drop shadow with a border on the same container.
