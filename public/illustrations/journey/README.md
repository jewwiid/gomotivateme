# GoMotivateMe journey illustrations — v1

This is the stable narrative illustration set for the product. Together, the images describe a goal as a human journey rather than a scoreboard.

## Asset map

| Asset | Meaning | Recommended product use |
| --- | --- | --- |
| `home-community.webp` | Big goals feel lighter with people beside you | Homepage hero, broad community storytelling |
| `begin.webp` | Choosing a goal and beginning | Onboarding, new-goal flow, first empty state |
| `move.webp` | Small repeated actions create progress | Progress updates, active goals, streaks |
| `milestone.webp` | A checkpoint worth recognising | Milestone completion, achievement moments |
| `support.webp` | People help people keep going | Invitations, supporters, motivation circle, check-ins |
| `return.webp` | Returning counts | Re-engagement, missed check-ins, recovery copy, reminders |
| `summit.webp` | Completion and earned perspective | Goal completion, annual recap, major celebration |

All production files are 1254 × 1254 WebP images with stable public URLs under `/illustrations/journey/`.

## Visual grammar

- Warm ivory uncoated paper: `#FBFAF6`.
- One cobalt ink signal: `#2856C7`.
- The sun is the exact yellow-orange from the GoMotivateMe wordmark: `#FEB704`.
- Tactile monoprint and torn-paper collage; imperfect transfer is intentional.
- Human figures stay small relative to the landscape: the goal is meaningful, but the person remains human.
- A tactile screen-printed yellow sun focuses the narrative action and is the only secondary colour.
- Each image communicates one action. Do not combine several journey stages in a single illustration.
- Keep raster artwork free of text, logos, UI, arrows, emojis, gradients, and decorative icons.
- Preserve the generous upper negative space when placing headings over or above an image.
- Use `object-contain` for empty states and cards. Use a deliberate wide `object-cover` crop only for immersive recap or campaign moments.
- Do not use `summit.webp` for routine success. Reserve it for genuine completion so the metaphor keeps its meaning.

## Accessibility

Use the alt text exported in `lib/journeyIllustrations.ts` when the image carries meaning. Use an empty alt attribute only when adjacent copy already communicates the exact same state.

## Generation method

Built-in ImageGen was used with `recap-summit.png` as the original style reference. Version 2 preserves each composition and changes the pale halo into the brand-yellow printed sun. The dedicated homepage community composition was then generated from the updated support image.

### Version 2 sun refinement

Every journey image used the same precise edit instruction, with the named figures and scene invariants adjusted to that asset:

```text
Use case: precise-object-edit
Asset type: GoMotivateMe journey illustration color-system update
Input image: edit target.
Primary request: Change only the large pale circular sun/halo behind the subject into a warm screen-printed golden yellow using the exact GoMotivateMe logo color #FEB704. Make it visibly yellow-orange with tactile uneven ink and paper grain.
Invariants: Preserve every person, object, trail, mountain silhouette, cobalt-blue ink, composition, crop, negative space, ivory paper background, texture, and proportion exactly as they are.
Constraints: Yellow appears only inside the circular sun. No text, logo, UI, border, new objects, color changes elsewhere, gradient, photorealism, or watermark.
```

### Homepage community prompt

```text
Use case: stylized-concept
Asset type: GoMotivateMe homepage hero illustration
Input image: style reference only. Match its cobalt-and-gold visual language, print texture, paper stock, and human scale; create a new composition.
Primary request: Create exactly three human figures moving up a broad mountain route together. One figure is a little higher and reaching back, one is accepting the hand, and the third is walking alongside on the same route. Nobody has reached the summit. The scene should communicate “big goals feel lighter with people beside you” through action rather than symbols.
Scene/backdrop: warm ivory uncoated paper with subtle natural fibre grain and generous calm negative space.
Style/medium: tactile cobalt-blue monoprint and torn-paper collage, imperfect ink transfer, rough deckled mountain edges, dense stamped texture, subtle off-white dry-brush gaps. A large screen-printed golden sun in exact GoMotivateMe logo yellow #FEB704 sits behind the connected group.
Composition/framing: square homepage hero, figures centered in the middle third, mountain rising from lower left toward upper right, generous top and side safe areas, readable when cropped to 4:3 or 1:1.
Color palette: cobalt blue #2856C7, logo yellow #FEB704, ivory #FBFAF6 only.
Constraints: exactly three people, practical mutual support rather than rescue, no text, logo, UI, border, gradient, photorealism, extra colors, decorative icons, heart symbol, trophy, or watermark.
```

### Begin prompt

```text
Use case: stylized-concept
Asset type: reusable GoMotivateMe product illustration — journey stage “Begin”
Input image: style reference only. Match its exact visual language, not its composition.
Primary request: Create a lone human figure at the foot of a low rising mountain, taking their first deliberate step onto a clear upward trail. The image should communicate choosing a goal and beginning before feeling fully ready.
Scene/backdrop: warm ivory uncoated paper with subtle natural fibre grain and large calm negative space.
Style/medium: tactile cobalt-blue monoprint and torn-paper collage, imperfect ink transfer, rough deckled edges, dense stamped texture, subtle off-white dry-brush gaps. Include the same quiet blind-embossed circular halo behind the central subject.
Composition/framing: square, centered, full figure small in scale, mountain occupying the lower half, trail visibly leading upward, generous safe margins for use in cards and empty states.
Color palette: GoMotivateMe cobalt blue #2856C7, warm ivory #FBFAF6, faint paper-shadow beige only.
Constraints: preserve the restrained handmade print character and simple silhouette of the reference. No text, no logo, no UI, no border, no gradient, no photorealism, no extra colors, no decorative icons, no watermark.
```

### Move prompt

```text
Use case: stylized-concept
Asset type: reusable GoMotivateMe product illustration — journey stage “Move”
Input image: style reference only. Match its exact visual language, not its composition.
Primary request: Create one human figure partway up a steep diagonal mountain ridge, actively stepping upward with a grounded, determined posture. A narrow pale trail should connect the lower slope to the next higher ledge. The image should communicate visible progress through small repeated actions, not speed or competition.
Scene/backdrop: warm ivory uncoated paper with subtle natural fibre grain and large calm negative space.
Style/medium: tactile cobalt-blue monoprint and torn-paper collage, imperfect ink transfer, rough deckled edges, dense stamped texture, subtle off-white dry-brush gaps. Include the same quiet blind-embossed circular halo behind the central action.
Composition/framing: square, centered, full figure modest in scale, strong upward diagonal from lower left to upper right, mountain occupying the lower two-thirds, generous safe margins.
Color palette: GoMotivateMe cobalt blue #2856C7, warm ivory #FBFAF6, faint paper-shadow beige only.
Constraints: preserve the restrained handmade print character and simple silhouette of the reference. Exactly one person. No text, no logo, no UI, no border, no gradient, no photorealism, no extra colors, no arrows, no decorative icons, no watermark.
```

### Milestone prompt

```text
Use case: stylized-concept
Asset type: reusable GoMotivateMe product illustration — journey stage “Milestone”
Input image: style reference only. Match its exact visual language, not its composition.
Primary request: Create one human figure pausing on a small mountain ridge checkpoint beside a simple planted trail flag. The ridge continues upward beyond the checkpoint, showing that this is meaningful progress rather than the final summit. The figure should feel quietly proud and grounded.
Scene/backdrop: warm ivory uncoated paper with subtle natural fibre grain and large calm negative space.
Style/medium: tactile cobalt-blue monoprint and torn-paper collage, imperfect ink transfer, rough deckled edges, dense stamped texture, subtle off-white dry-brush gaps. Include the same quiet blind-embossed circular halo behind the figure and flag.
Composition/framing: square, centered, full figure and flag modest in scale, checkpoint ridge across the lower half, a second higher ridge visible beyond, generous safe margins.
Color palette: GoMotivateMe cobalt blue #2856C7, warm ivory #FBFAF6, faint paper-shadow beige only.
Constraints: preserve the restrained handmade print character and simple silhouette of the reference. Exactly one person and one plain flag. No text, no logo, no UI, no border, no gradient, no photorealism, no extra colors, no trophy, no decorative icons, no watermark.
```

### Support prompt

```text
Use case: stylized-concept
Asset type: reusable GoMotivateMe product illustration — journey stage “Support”
Input image: style reference only. Match its exact visual language, not its composition.
Primary request: Create exactly two human figures on a rising mountain slope. The higher figure is securely planted and reaching one hand down; the lower figure is stepping upward and taking that hand. The gesture should clearly communicate practical encouragement and people helping people keep going, never rescue or dependency.
Scene/backdrop: warm ivory uncoated paper with subtle natural fibre grain and large calm negative space.
Style/medium: tactile cobalt-blue monoprint and torn-paper collage, imperfect ink transfer, rough deckled edges, dense stamped texture, subtle off-white dry-brush gaps. Include the same quiet blind-embossed circular halo behind the connected figures.
Composition/framing: square, centered interaction, both full bodies readable as small silhouettes, rising diagonal ridge across the lower two-thirds, clear hand connection, generous safe margins.
Color palette: GoMotivateMe cobalt blue #2856C7, warm ivory #FBFAF6, faint paper-shadow beige only.
Constraints: preserve the restrained handmade print character of the reference. Exactly two people. No text, no logo, no UI, no border, no gradient, no photorealism, no extra colors, no heart icon, no decorative symbols, no watermark.
```

### Return prompt

```text
Use case: stylized-concept
Asset type: reusable GoMotivateMe product illustration — journey stage “Return”
Input image: style reference only. Match its exact visual language, not its composition.
Primary request: Create one human figure rejoining an upward mountain trail after a visible break in the path. Behind them, the pale trail curves away and briefly fades; ahead, it becomes clear again and rises toward a distant ridge. The figure is stepping forward with calm resolve. The image should communicate that returning counts and a setback is not the end.
Scene/backdrop: warm ivory uncoated paper with subtle natural fibre grain and large calm negative space.
Style/medium: tactile cobalt-blue monoprint and torn-paper collage, imperfect ink transfer, rough deckled edges, dense stamped texture, subtle off-white dry-brush gaps. Include the same quiet blind-embossed circular halo behind the figure.
Composition/framing: square, centered, full figure modest in scale at the reconnecting section of trail, layered mountain forms across the lower half, generous safe margins.
Color palette: GoMotivateMe cobalt blue #2856C7, warm ivory #FBFAF6, faint paper-shadow beige only.
Constraints: preserve the restrained handmade print character and simple silhouette of the reference. Exactly one person. No text, no logo, no UI, no border, no gradient, no photorealism, no extra colors, no warning symbols, no broken-heart imagery, no arrows, no watermark.
```

### Summit prompt

```text
Use case: stylized-concept
Asset type: reusable GoMotivateMe product illustration — journey stage “Summit”
Primary request: Isolate and recreate only the blue hand-printed summit and lone person from the supplied recap reference.
Scene/backdrop: warm ivory paper background.
Style/medium: cobalt stamped-paper mountain texture with a quiet embossed circular halo.
Composition/framing: centered square composition with the person at the peak and generous upper negative space.
Constraints: no words, logos, interface elements, borders, buttons, extra colors, or watermark.
```
