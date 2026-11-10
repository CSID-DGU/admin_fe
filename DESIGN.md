---
name: DECS Admin FE
description: Cloudscape-derived operations UI with an orange brand accent (DGU AI LAB GPU console).
colors:
  brand-500: "#f68313"
  brand-700: "#be5a0a"
  brand-100: "#fdebd7"
  blue-600: "#0972d3"
  green-600: "#037f0c"
  amber-600: "#8d6605"
  red-600: "#d91515"
  surface-app: "#f2f3f3"
  surface-container: "#ffffff"
  border-container: "#e9ebed"
  text-heading: "#000716"
  text-secondary: "#414d5c"
typography:
  body:
    fontFamily: "Open Sans, Noto Sans KR, system-ui, sans-serif"
    fontSize: "15px"
    lineHeight: "22px"
  body-s:
    fontSize: "13px"
    lineHeight: "18px"
  heading-s:
    fontSize: "18px"
    fontWeight: 700
rounded:
  badge: "4px"
  item: "8px"
  button: "20px"
  container: "16px"
spacing:
  xs: "8px"
  s: "12px"
  m: "16px"
  l: "20px"
  xl: "24px"
---

# Design System: DECS Admin FE

## Overview

**Creative North Star: "The Console, Not the Brochure"**

Mode: Operate. A Cloudscape-derived task UI: white containers on a light grey app background, one orange accent for the primary action, semantic status colors (green/amber/red/blue) kept Cloudscape-standard. Users glance at state and act. Korean copy, Open Sans + Noto Sans KR. The user surface is comfortable density; the admin surface is compact, same scale.

**Key Characteristics:**
- Everything is built from `src/design-system` components (Container, Header, Cards, Badge, StatusIndicator, ProgressBar, KeyValuePairs). New UI reuses them before adding markup.
- Never hardcode a color or px spacing; reference `--decs-*` tokens (`src/design-system/tokens/*.css`).
- Inline `style` objects with tokens are the house style (no CSS modules).

## Colors

- **Brand orange** (`--decs-brand-500`): primary buttons, selected-card ring. Rare on any screen.
- **Status**: success green, warning amber, error red, info blue via `--decs-status-*`. Used for usage tones (70% warning, 90% error).
- **Neutrals**: `--decs-surface-app`, `--decs-surface-container`, `--decs-border-container`, text heading/secondary/inactive.

**The Token Rule.** No raw hex in components.

## Typography

Body 15/22, small 13/18 for secondary text, heading-s 18 bold for card titles, heading-xl 30 bold for key numbers. Weights 400/600/700 only.

## Layout

Page column `maxWidth: 820` centered, vertical stack with `--decs-space-l` gap. Grids use `repeat(N, minmax(0,1fr))` with `--decs-space-m` gap and collapse to one column under `PHONE_QUERY` (`useMediaQuery`).

## Elevation & Depth

Tonal plus one ambient shadow: `--decs-shadow-container` on every Container/Card, border `--decs-border-container`. Flat inside containers (dividers, no nested shadows).

## Shapes

Container 16px, items/inputs 8px, buttons 20px pill-ish, badges 4px.

## Components

- **Container + Header**: standard section card.
- **Cards**: selectable grid cards (`columns`, phone = 1).
- **Badge**: tinted tag (grey, blue, green, brand) for server / account / port.
- **ProgressBar**: 4px track, tone prop for usage thresholds.
- **StatusIndicator**: dot + label for running/stopped/error.

## Do's and Don'ts

- Do compare-at-a-glance data in grids/rows, not tall stacks of near-identical cards.
- Do keep copy Korean and accurate about why data is missing.
- Don't introduce new colors, fonts, or radii; don't add side-stripe borders or gradient text.
- Don't use motion for this surface beyond the existing 90-180ms token transitions.
