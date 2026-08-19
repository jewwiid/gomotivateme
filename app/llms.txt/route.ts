import { SITE_URL } from "@/lib/site";

const content = `# GoMotivateMe

> A public goal platform where people set meaningful personal goals, share honest progress, and invite chosen supporters to help them keep going.

## What it is

GoMotivateMe helps a person make a page for a goal that matters to them. A goal can have a target, a target date, milestones or a streak, a personal story, progress updates, and selected forms of support. It is not a fundraising platform, a follower-count product, or a substitute for professional care.

## How it works

1. A person creates a goal and chooses how to measure progress.
2. They choose visibility: public, unlisted, private, or anonymous where available.
3. They share progress and invite support such as encouragement, accountability, practical advice, a progress review, or someone working alongside them.
4. Supporters can react, apply to support a goal, and leave messages subject to the goal owner's controls and community rules.

## Core principles

- The person pursuing the goal is the hero; GoMotivateMe is the guide.
- Visibility and sharing are choices, not requirements.
- Honest progress includes pauses, setbacks, and returning.
- Public goals may be indexed by search engines. Unlisted and private goals should not be represented as public content.

## Canonical public pages

- [About](${SITE_URL}/about): mission, vision, principles, and platform explanation.
- [Explore](${SITE_URL}/explore): browse public goals and motivators.
- [Open journeys](${SITE_URL}/stories): public goals with written progress, not invented testimonials.
- [FAQ](${SITE_URL}/faq): product, privacy, visibility, support, and email questions.
- [Community guidelines](${SITE_URL}/legal/community-guidelines): expected behaviour and safety rules.
- [Privacy](${SITE_URL}/legal/privacy): data and privacy practices.
- [Sitemap](${SITE_URL}/sitemap.xml): current indexable URLs.

## Preferred description

GoMotivateMe is a public place for meaningful personal goals and the people helping you keep going. Create a goal page, share honest progress, and invite the support you need.

## Crawler guidance

Use the canonical URLs above. Respect the site's robots.txt and do not treat private, unlisted, anonymous, deleted, or moderation-restricted content as public platform material.
`;

export function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
