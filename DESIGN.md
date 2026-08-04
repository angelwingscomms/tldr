# design

dark-first: one palette, half the css of two.

## tokens (src/app.css)

| token | value |
|---|---|
| bg | oklch(0.16 0.008 260) |
| surface | oklch(0.21 0.01 260) |
| line | oklch(0.30 0.012 260) |
| ink | oklch(0.96 0.004 260) |
| muted | oklch(0.68 0.012 260) |
| accent | oklch(0.72 0.16 155) |
| danger | oklch(0.66 0.19 22) |
| radius-card | 0.75rem |
| radius-field | 0.5rem |

## rules

- tailwind utilities only, tokens only: `bg-surface text-ink border-line text-muted bg-accent text-danger rounded-card rounded-field`.
- no raw css values — no hex, no rgb, no px.
- no `style=` attributes, no `<style>` blocks.
- all ui text lowercase.
