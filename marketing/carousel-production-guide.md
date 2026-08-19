# GoMotivateMe carousel production guide

This is the repeatable system for designing Instagram, LinkedIn, and Canva carousels. It combines the brand’s real typography, colours, illustration pack, and story-first language so that a carousel can be produced without inventing a visual or narrative approach each time.

## The non-negotiables

- **The reader is the hero; GoMotivateMe is the guide.** Start with their moment of tension, not an announcement about us.
- **One carousel, one idea.** It can teach one lesson, tell one short story, or invite one action—never all three.
- **Use only one primary CTA.** Usually “Start your page”, “Share your goal”, or “Invite your people”.
- **Use one illustration per slide.** Do not collage artwork, screenshots, icons, emojis, or decorative graphics on top of it.
- **Do not promise outcomes.** Write about support, clarity, momentum, or the possibility of returning—not guaranteed achievement.

## Canva brand setup

Create one GoMotivateMe Brand Kit and add these approved assets.

| Element | Approved choice |
| --- | --- |
| Heading font | IBM Plex Sans, SemiBold (600) |
| Body font | IBM Plex Sans, Regular (400) |
| Labels / slide number | IBM Plex Mono, Medium (500), uppercase only |
| Background | `#FBFAF6` warm ivory |
| Main text / ink | `#18201C` |
| Cobalt | `#2856C7` |
| Cobalt dark | `#1C419F` |
| Sun accent | `#FEB704` |
| Wordmark | `public/brand/GoMotivateMe_Wordmark.svg` |
| Art | `marketing/canva-social-pack/*.png` |

On a Canva plan that includes Brand Kit, add the logo, fonts, colours, imagery, and templates there before publishing content so the approved choices are always available. If the IBM Plex faces are unavailable in the account, upload the approved font files before building the templates; do not silently replace them with a different font.

## Master carousel template

Create and save this as a locked Canva Brand Template.

| Setting | Specification |
| --- | --- |
| Primary canvas | 1080 × 1350 px (4:5) |
| Alternative canvas | 1080 × 1080 px (1:1) for LinkedIn or X |
| Outer safe margin | 72 px on every edge |
| Artwork placement | 1080 × 1080 px, aligned to the bottom; do not crop it. The art’s own upper negative space remains clear for text. |
| Headline block | x: 72, y: 84, width: 936 px; IBM Plex Sans 600; 76–94 px on 4:5; maximum 3 lines. |
| Supporting line | x: 72, below headline; IBM Plex Sans 400; 30–38 px; maximum 2 lines. |
| Folio | Bottom-right; IBM Plex Mono 500; 20–24 px; cobalt; `01 / 06` format. |
| CTA button | Final slide only; cobalt fill, ivory text; no more than 4 words. |

Keep the slide background ivory. Use cobalt for most text. Use the yellow only as the existing sun in the artwork or a very small divider/underline; never as a large text field. The wordmark can appear small on the final slide only.

## The reliable 6-slide structure

Use this default flow for insight, education, and launch carousels.

| Slide | Job | Copy limit | Recommended art |
| --- | --- | --- | --- |
| 1. Hook | Name a recognisable tension or a hopeful truth. | 8–14 words | `quiet-middle.png`, `returning-counts.png`, or `make-a-plan.png` |
| 2. Recognition | Make the reader feel understood; describe the difficult middle. | 18–30 words | `quiet-middle.png` |
| 3. Reframe | Give one small, credible change of perspective. | 12–24 words | `small-check-in.png` or `looking-back-moving-forward.png` |
| 4. Plan | Explain a single concrete next step. | 18–30 words | `make-a-plan.png` or `share-your-goal.png` |
| 5. Support | Show what changes when people can see the effort. | 12–24 words | `people-in-your-corner.png` or `encouragement.png` |
| 6. CTA | Invite one specific action. | 4–10 words | `share-your-goal.png` or `people-in-your-corner.png` |

For a 5-slide carousel, combine Slides 2 and 3. For a 7-slide carousel, add a single concrete example after Slide 4—only when it is factual, approved, and not a fabricated testimonial.

## Ready-to-use carousel brief

**Topic:** The quiet middle of a goal

1. **The quiet middle still counts.**
2. The hard part is often not starting. It is continuing after the excitement fades and nobody is watching.
3. A pause in visible progress does not erase the effort you have already made.
4. Make one small check-in. Name what moved, what felt hard, and what comes next.
5. When a few people know the goal matters, your progress has somewhere to land.
6. **Share your goal with your people.**

This is a model for structure and tone, not a claim about outcomes.

## LLM carousel prompt

Copy and complete this prompt. It is designed to return production-ready copy, not finished visual artwork.

```text
Create a 6-slide 4:5 carousel for GoMotivateMe.

Topic: [TOPIC]
Audience: [AUDIENCE]
Specific tension: [THE MOMENT THEY RECOGNISE]
One true product capability: [CAPABILITY]
Primary CTA: [ONE CTA]
Approved facts or links: [FACTS/LINKS]

Brand rules:
- The reader is the hero. GoMotivateMe is the empathetic, capable guide.
- Write warm, grounded, specific language. No hype, shame, vague inspiration, invented testimonials, or promised outcomes.
- Use IBM Plex Sans for headings/body and IBM Plex Mono for slide labels.
- Each slide uses one approved journey-style asset and no more than one core idea.
- Headline: 8–14 words. Supporting copy: 30 words maximum. CTA: 4–10 words.

Use this structure: Hook → Recognition → Reframe → One practical step → Support → One CTA.

Return a table with: slide number, purpose, headline, supporting copy, recommended asset filename, and any factual-risk note. Then return a caption of 100 words or fewer with the same single CTA.
```

## Pre-publish check

- Is the reader, rather than the company, the active character?
- Does Slide 1 make sense without the caption?
- Does each slide have one job and one illustration?
- Does the artwork remain uncropped, text-free, and visually quiet?
- Are IBM Plex Sans and IBM Plex Mono used exactly as specified?
- Is every fact, metric, quote, and customer example verified?
- Does the final slide have one CTA only?
- Is the caption an extension of the carousel, not a repeat of it?

## Source materials

- [Story-first LLM media guide](story-first-llm-media-guide.md)
- [Canva social illustration pack](canva-social-pack/README.md)
- [Journey illustration guide](../public/illustrations/journey/README.md)
- [Canva Brand Kit guidance](https://www.canva.com/business/features/brand/)
