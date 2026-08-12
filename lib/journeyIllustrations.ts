export const JOURNEY_ILLUSTRATIONS = {
  homeCommunity: {
    src: "/illustrations/journey/home-community.webp",
    alt: "Three people helping one another move up a mountain trail",
    meaning: "Big goals feel lighter with people beside you",
  },
  begin: {
    src: "/illustrations/journey/begin.webp",
    alt: "A person taking their first step onto a mountain trail",
    meaning: "Choosing a goal and beginning",
  },
  move: {
    src: "/illustrations/journey/move.webp",
    alt: "A person steadily climbing a rising mountain trail",
    meaning: "Making visible progress through repeated action",
  },
  milestone: {
    src: "/illustrations/journey/milestone.webp",
    alt: "A person pausing beside a milestone flag before the trail continues",
    meaning: "Recognising meaningful progress without implying the journey is over",
  },
  support: {
    src: "/illustrations/journey/support.webp",
    alt: "Two people helping one another climb a mountain ridge",
    meaning: "Practical encouragement and shared momentum",
  },
  return: {
    src: "/illustrations/journey/return.webp",
    alt: "A person returning to an upward mountain path",
    meaning: "Rejoining the journey after an interruption",
  },
  summit: {
    src: "/illustrations/journey/summit.webp",
    alt: "A person standing at the summit of a blue mountain",
    meaning: "Completion, reflection, and earned perspective",
  },
} as const;

export type JourneyIllustrationKey = keyof typeof JOURNEY_ILLUSTRATIONS;

export function journeyIllustrationForProgress(progress: number) {
  const bounded = Math.max(0, Math.min(100, Number(progress) || 0));
  if (bounded >= 100) return JOURNEY_ILLUSTRATIONS.summit;
  if (bounded >= 60) return JOURNEY_ILLUSTRATIONS.milestone;
  if (bounded > 0) return JOURNEY_ILLUSTRATIONS.move;
  return JOURNEY_ILLUSTRATIONS.begin;
}
