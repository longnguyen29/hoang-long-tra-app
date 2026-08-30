# House of Hoàng Long Atmosphere System

Atmosphere is a supporting layer, not the interface. It evokes Hà Giang mist,
tea liquor, old paper, smoke, blossom, and working metal while the existing
rice-paper, jade-black, brass, typography, spacing, and information hierarchy
continue to do the actual product work.

## Canonical anchors

| Token | Value | Role |
| --- | --- | --- |
| `--house-rice-paper` | `#F7F3EA` | Warm light surface |
| `--house-jade-black` | `#1C2B24` | Primary ink and deep surface |
| `--house-old-brass` | `#B08D57` | Meaningful action or selected state |

## Six families

Each family is a four-stop ramp. The CSS implementation adds two restrained
radial fields over the ramp to create the House signature: an off-centre ridge
light, never a neon glow.

| Family | Exact stops | Allowed use |
| --- | --- | --- |
| **Mountain Mist** | `#F7F3EA 0%` · `#DFE3DA 38%` · `#AEBBB1 68%` · `#5E7168 100%` | Heritage hero, origin story, discovery stage, empty or not-yet-decided paths |
| **Tea Forest** | `#EEF0E5 0%` · `#A8B39B 36%` · `#536B5B 69%` · `#1C2B24 100%` | Green-tea identity, gardens and sourcing, approved production path, CRM selected relationship path |
| **Honey Shan** | `#F7F0DF 0%` · `#E1C18A 38%` · `#B8793E 70%` · `#563522 100%` | Honey/black-tea identity, sample conversion, brewed-result evidence, warm product close-up |
| **Smoke Shan** | `#EEE9E1 0%` · `#B9B3AA 34%` · `#686660 66%` · `#282A27 100%` | Smoke-tea identity, drying/roasting process, archival factory image treatment; never an error state |
| **Lotus Dawn** | `#F7F3EA 0%` · `#EADBD2 38%` · `#D7B4A8 66%` · `#8C6D69 100%` | Floral-tea identity, tea sessions, quiet editorial openings; never a generic feminine campaign colour |
| **Old Brass** | `#F3EAD8 0%` · `#D4BA86 36%` · `#B08D57 66%` · `#675039 100%` | Approved commercial choice, pricing decision, quotation milestone, one selected path per view |

## Strength and surface rules

- `quiet` (16%): default public section atmosphere.
- `soft` (24%): product identity or a complete sample/process step.
- `present` (36%): one public campaign or product hero only. Do not repeat it
  down the same page.
- `staff` (10%, no grain): selected path, decision panel, or a short state rail.
  Never apply it to an entire staff page, data table, chart, or form.
- A page may use at most one dominant family and one supporting family.
- Avoid adjacent gradient panels. Rice paper must remain the resting state.
- Product photography stays real. Atmosphere may sit behind or beside it, not
  recolour evidence until one cannot judge the tea, leaf, or factory.
- Danger, warning, success, and disabled states keep their solid semantic
  colours. A gradient never substitutes for status language or an icon.

## Accessibility

- Treat every gradient as decorative (`aria-hidden`) and never encode meaning
  in colour alone.
- Body text must meet WCAG AA: `4.5:1`; large text and UI boundaries: `3:1`.
- Put text on a stable semantic surface whenever a gradient crosses light and
  dark stops. Default to rice paper with jade-black, or jade-black with rice
  paper. Do not sample foreground colour from the gradient.
- Focus rings remain the solid `--color-focus` token and must not blend into the
  atmosphere.
- Staff density, numbers, charts, form fields, and disabled states remain on
  solid paper surfaces.

## Motion

- Motion is optional and public-only. Use the component's `motion` prop for a
  24-second alternating drift with no hue rotation and no more than 2.5% scale.
- Do not animate staff gradients, state changes, chart fills, or button
  backgrounds.
- `prefers-reduced-motion: reduce` removes atmosphere motion completely.

## Implementation

CSS variables live in [`tokens.css`](../tokens.css). The reusable React wrapper
is [`components/Atmosphere.jsx`](../components/Atmosphere.jsx):

```jsx
<Atmosphere family="mountain-mist" strength="quiet" motion>
  <HeroContent />
</Atmosphere>
```

For Tailwind v3, map the portable aliases without copying the hex stops:

```js
theme: {
  extend: {
    backgroundImage: {
      "hl-mountain-mist": "var(--background-image-hl-mountain-mist)",
      "hl-tea-forest": "var(--background-image-hl-tea-forest)",
      "hl-honey-shan": "var(--background-image-hl-honey-shan)",
      "hl-smoke-shan": "var(--background-image-hl-smoke-shan)",
      "hl-lotus-dawn": "var(--background-image-hl-lotus-dawn)",
      "hl-old-brass": "var(--background-image-hl-old-brass)",
    },
  },
}
```

Tailwind v4 can expose the same aliases through `@theme inline`; arbitrary
values such as `bg-[image:var(--background-image-hl-old-brass)]` also work.

## Surface map

- Heritage website: Mountain Mist in the home opening; product family gradients
  only in product headers or a restrained identity edge.
- Sample funnel: Honey Shan in the proposition and the selected testing path;
  Mountain Mist for discovery before selection.
- CRM: Tea Forest on the single selected relationship path; Old Brass when a
  commercial choice is approved. The opportunity board itself stays solid.
- Factory/operations: Smoke Shan for drying/roasting context and Tea Forest for
  an approved production path. Exceptions remain lacquer/danger red.
- Decision/pricing: Old Brass behind the active decision panel at `staff`
  strength. The price ladder and margin chart remain solid and measurable.
