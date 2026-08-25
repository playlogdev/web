# Playlog brand reference pack

This directory is the source of truth for Playlog visual identity. Product screenshots under `docs/screenshots/` are verification evidence from individual pull requests; they are not brand specifications.

## Source precedence

When implementing or reviewing a Playlog interface, use sources in this order:

1. `brand-guidelines.md` and the JSON files in `tokens/`
2. Approved SVG assets in `logos/`
3. Topic-specific visual boards in `boards/`
4. The supplied logo reference `source/playlog-logo-reference.jpeg`
5. The original concept board in `source/`

The supplied logo reference defines the mark geometry and appearance. `source/playlog-mark-exact.png` is the background-removed derivative used inside the approved SVG files; it preserves the reference pixels instead of retracing the shape. Do not manually redraw, reinterpret, or generate the mark. If the available sources do not cover a use case, record the gap and ask for a brand decision.

## Contents

| Topic | Visual reference |
| --- | --- |
| Brand identity | `boards/01-playlog-brand-identity.svg` |
| Logo variations | `boards/02-logo-variations.svg` |
| Color palette | `boards/03-color-palette.svg` |
| Typography | `boards/04-typography.svg` |
| Brand in use — web | `boards/05-brand-in-use-web.svg` |
| Brand in use — mobile | `boards/06-brand-in-use-mobile.svg` |
| Brand tone | `boards/07-brand-tone.svg` |
| Brand values | `boards/08-brand-values.svg` |

The mobile board is a cross-platform concept reference only. This repository does not contain or implement the mobile application.

## Logo usage

- Use `logos/playlog-mark.svg` for compact placements.
- Use `logos/favicon.svg` when the complete square reference, including its dark field and original spacing, is required.
- Use the horizontal light-wordmark lockup on dark surfaces.
- Use the horizontal dark-wordmark lockup on light surfaces.
- Preserve clear space equal to at least one controller-dot diameter around the mark.
- Do not recolor individual logo parts, stretch the artwork, add shadows, or place it on a low-contrast background.
- The wordmark uses Sora Bold. Product UI should compose the SVG mark with real Sora text when font consistency across SVG renderers matters.
- `public/brand/playlog-mark.svg` is a runtime copy served to the web app. It must remain byte-for-byte identical to `logos/playlog-mark.svg`; `docs/brand` stays the source of truth, and the no-redraw rule applies to the runtime copy as well.
