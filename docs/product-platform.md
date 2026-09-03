# GoMotivateMe — product platform brief

A complete picture of **what the product is for**, **who uses it**, **what value it creates**, and **how it sits next to GoFundMe and other tools**. This is not an engineering spec. It does not describe databases, auth internals, or how features are implemented.

Canonical public copy lives on [About](https://www.gomotivateme.com/about) and [FAQ](https://www.gomotivateme.com/faq). This document organises that product so a writer, partner, or new teammate can understand it in one sitting.

**Site:** https://www.gomotivateme.com  
**Tagline:** Where personal goals get done  
**Promise:** Set a goal, build a support team, and keep going with encouragement from people who want to see you succeed.

---

## What it is

GoMotivateMe is a **public home for a personal goal**. You make a page, say what progress means, share a link, post honest updates, and invite specific people to encourage you, check in, advise you, review how you are doing, or work alongside you.

The shape of the page is deliberately close to a campaign page: story, progress, people who showed up. The campaign is not raising money. It is raising **witnesses**.

> No fundraising. No follower count. Just a goal, the real work, and people who care.

The product belief: most meaningful goals stall in private. Not because the person is lazy, but because nobody can see the effort, so encouragement has nowhere to land. A goal needs a direction, a record, and a few people who know why it matters.

It does **not** promise that the user will finish. It makes returning, pausing, and stuck weeks part of the record.

---

## What it is not

| Not this | Why people mix it up |
| --- | --- |
| A fundraising site | The page looks like GoFundMe. There is nothing to donate. |
| A habit tracker | Trackers keep streaks private. This product is about being seen. |
| A to-do or project tool | Notion/Asana organise work. They do not give you a support team. |
| A quote / motivation feed | Inspiration without a goal and a record fades. |
| A stake / penalty app | StickK and Beeminder charge or fine you. This product uses people, not money. |
| Therapy or medical care | Health goals are allowed, with warnings and guidelines. The product is not treatment. |
| A social network | There is no follower-count game. Follows exist so private goals can be shared with approved people. |

Free: no payments, no subscriptions, no cut of anything. Ages 13+. Built in Dublin by Jude Okun.

---

## Who it is for

People working on a **personal goal over weeks or months**, who would do better with company than with another private list.

Typical categories: health, learning, career, launching something, creative work, habits, sports, community, travel, family, faith. The goal does not need to be impressive.

**Not a fit** when the need is a one-sitting task, a fundraiser, selling something, or a public performance.

### Three roles

| Role | Account? | Job |
| --- | --- | --- |
| **Owner** | Yes | Creates the goal, posts progress, chooses visibility, approves who joins the team |
| **Motivator / supporter** | Yes | Joins the Motivation Circle with a role and a cadence; checks in; may hide their name from the public |
| **Visitor** | No | Reads public goals, leaves an emoji reaction, shares the link |

Nobody joins a support team without the owner’s say-so. Applications are approved or declined. Private invites exist for people the owner chooses.

---

## The core loop

1. **Name the goal.** Title, why it matters, how progress is measured, optional date.
2. **Choose visibility.** Public, unlisted, private, and optionally anonymous.
3. **Ask for a kind of help.** Encouragement, accountability, advice, review, or someone who joins in.
4. **Share one link.** The page is `/o/{handle}/{slug}`. Social previews generate a card automatically.
5. **Post the honest version.** Good weeks and stuck weeks.
6. **Let people show up.** Reactions from anyone; structured support from people who joined.

How-it-works on the homepage: say what you want to do → invite the right kind of help → share the honest version.

---

## How a goal works

### Measurement (owner picks one; can change later)

| Type | What it records |
| --- | --- |
| **Number** | Count toward a target in a real unit: km, pages, kg, users |
| **Streak** | Consecutive days the owner showed up |
| **Milestones** | Named steps on a path |

### Support types (what the owner asks for)

| Kind | What the other person actually does |
| --- | --- |
| Encouragement | Shows up when motivation dips |
| Accountability | Checks in on an agreed cadence |
| Practical advice | Speaks from having done something similar |
| Progress review | Gives real feedback on the work |
| Join me | Sets their own version of the same goal |

Cadence when they join: after each update, weekly, monthly, or only when asked. Overdue check-ins get a reminder email, not a penalty.

### What visitors can do without signing up

Browse public goals and profiles. Leave one emoji reaction per goal (👍 💪 ❤️ 🔥). Sharing the URL is the main distribution mechanic.

Signing up is required to create a goal, join a team, or send a check-in.

---

## Visibility and privacy

Every goal has a visibility, independent of an optional **anonymous** toggle.

| Mode | Who can open it | Discoverable? |
| --- | --- | --- |
| **Public** | Anyone with the link; listed in Explore | Yes, including search engines, after moderation |
| **Unlisted** | Anyone with the link | No |
| **Private** | Owner and **approved followers** | No |

**Anonymous owner:** name, handle, and photo are stripped from the goal page and it does not appear on the profile. Useful for goals that are hard to say out loud. Support still works.

**Anonymous supporter:** public page shows “Someone.” The owner still sees the real name, because a check-in from an unknown person is not useful. Cheers stay account-free.

Follow policy is **approve followers** by default, or **open**. Private goals depend on that approval.

Public Explore is moderated before listing. Sensitive health/body/money/faith goals can carry a warning so supporters arrive with the right tone. Community rule of thumb: show up, be honest, be kind. No selling, no harassment, no harmful recovery or weight content.

The product does not sell data, does not run ads, and loads analytics only after consent.

---

## The rest of the product (as people use it)

**Goal page.** Cover, story, progress, how they want support, milestones if used, reactions, supporters, share and support actions. Status can be active, paused, completed, or closed. Finished goals keep the record, stuck weeks included, unless deleted.

**Profiles.** Public handle, bio, public goals, follow.

**Discovery.** Homepage feed, `/explore` (goals, motivators, categories), `/stories` (open journeys).

**Owner workspace.** My goals, supporting, my circle, settings. Per-goal dashboard for logging progress. Recap cards for a week or year of motion.

**Email.** Account and goal mail (applications, messages, deadlines, streak risk, overdue check-ins, follows). Optional weekly digest and optional “discover new goals,” both **off** until turned on. One-click unsubscribe.

**Partner.** Optional connect with AI Boss Leader so planned work can show on the public page. Not required for the core loop.

**Distribution.** Every public (and unlisted) page is a URL. Link previews are a designed part of the product, not a side effect.

---

## Use cases

These are the jobs the product is built to hold. Each one needs a page, a record, and people — not a private streak.

| Situation | Why this product |
| --- | --- |
| Training for a race or rebuilding fitness | Progress is visible to the few who asked to be involved; owner can stay anonymous |
| Writing a book, shipping an album, daily practice | The quiet middle is the failure mode; a check-in is a place for the work to land |
| Job search or career number | Unlisted link to a mentor or partner; not a LinkedIn performance |
| Launching a small product or side project | Milestones, public or unlisted, people who will actually reply |
| Learning a language or a skill | Streak or number, plus someone who already did it |
| Family time, faith practice, volunteering | Private or unlisted; not Explore theatre |
| Returning after a pause | The page is still there. Returning is part of the product story, not a reset to zero in shame |
| Supporting someone else | Join a circle instead of “liking” a story and forgetting |

A notes app, a group chat, and a fundraiser each cover a slice of this. None of them hold the goal, the record, and the asked-for help in one place the owner controls.

---

## Value

**For the owner**

- A single URL instead of re-explaining the goal every time
- Progress that can be imperfect in public (or in a tight circle)
- Help that is typed: not “support me” but “check in weekly” or “tell me if the plan is nonsense”
- Control: who sees it, whether a name is attached, who joins
- A record that survives a pause

**For the supporter**

- A job and a cadence, so showing up is specific
- A page to reopen instead of hunting a chat
- Ability to hide their name from strangers while remaining known to the owner

**For a visitor**

- A way to cheer without creating an account
- Other people’s open journeys, if the owner chose public

**What the product refuses to use as value**

- Money stakes
- Shame, streaks-as-morality, “don’t be an idiot”
- Follower counts
- Guaranteed outcomes
- Scarcity (“only 3 spots left to support”)

The literature the team treats as aligned (not as a product result): progress monitoring helps, and public reporting is associated with a larger effect (Harkin et al., 2016). That is context for *why witnessed effort matters*. It is not a claim that GoMotivateMe produces a published success rate.

---

## Comparison

### GoFundMe (the shape people recognise)

GoMotivateMe is modeled on a **campaign page**, not on a bank transfer.

| | GoFundMe | GoMotivateMe |
| --- | --- | --- |
| Object of the page | A fundraiser | A personal goal |
| What supporters give | Money | Attention, check-ins, advice, company |
| Progress bar | Toward a dollar target | Toward a number, streak, or milestones |
| Story | Why the money is needed | Why the goal matters |
| Social proof | Donors | Reactions and a support team |
| Business model | Platform fee on donations | Free; nothing to take a cut of |
| Success | Funds arrived | Effort was seen; people stayed involved. Completion is possible, not promised |

If someone says “it’s like GoFundMe,” the accurate reply is: **same kind of page, different campaign.** You are not raising cash. You are putting the work where chosen people can find it.

Related lookalikes that are still the wrong category: Kickstarter (commerce + funding), Change.org (petitions), memorial or tribute fundraisers.

### Habit trackers (Strides, Habitica, Productive, Streaks)

Private grids. Reminders. Points or game layers. The user is alone with the app.

GoMotivateMe can record a streak, but the streak is not the product. The product is the **page other people can open**. Use a tracker if the only audience is you. Use this if the missing piece is witnesses.

### Commitment contracts (StickK, Beeminder)

Those products make inaction expensive — money, a referee, a public shame risk. They work for some people. They are cold by design.

GoMotivateMe uses **invitation and encouragement**, not forfeiture. Same family of problem (goals drift), opposite mechanism.

### Task and knowledge tools (Notion, Asana, Goals.com, Apple Reminders)

Excellent for lists, docs, and team delivery. Weak as a shareable human campaign. Pasting a Notion link into a group chat is not a support team with roles and cadence.

### Motivation apps and quote feeds

They change mood for a minute. They do not hold a target, a why, or a person who will ask next week.

### Social media (Instagram, X, Discord)

You *can* post goals there. The feed buries them, the format rewards performance, and check-ins have no structure. GoMotivateMe is a **stable page** with a job for each supporter. Social is how you *point* at that page (the OG card), not the home of the goal.

### Coaching, Discord “acc” groups, human accountability partners

Those can be the people on the circle. The product is the place those people look, not a replacement for a paid coach.

### Side-by-side (quick)

| Need | Better tool |
| --- | --- |
| Raise money for a cost | GoFundMe / Kickstarter |
| Private daily ticks | Habit tracker |
| Make quitting expensive | StickK / Beeminder |
| Run a team project | Asana / Notion |
| Feel inspired for 30 seconds | Quote app |
| Perform a goal for an audience | Social feed |
| Hold a personal goal, honest progress, and chosen people | **GoMotivateMe** |

Public marketing should contrast **unseen effort vs witnessed effort**, not dunk on named apps. This comparison table is for internal and partner briefing.

---

## What “good” looks like

A goal that is alive:

- The owner posted at least one real update (including “nothing moved”)
- At least one other human can open the page without being retold the story
- Support matches what was asked (a weekly check-in is not a pile of fire emojis)
- Visibility matches the risk of the goal (private/anonymous when the story is sensitive)

A goal that is finished:

- Marked complete
- Supporters are told
- The page remains as a record unless the owner deletes it

A goal that paused:

- Still has a URL
- Returning is expected

Vanity that does not count as success: Explore ranking, reaction volume from strangers, looking busy.

---

## Surfaces (so you can find things)

| URL | What a person does there |
| --- | --- |
| `/` | Understand the product; browse public goals |
| `/explore` | Find goals, motivators, categories |
| `/stories` | Read open journeys |
| `/about` `/faq` | Mission and rules of use |
| `/signup` `/login` | Account |
| `/dashboard` `/dashboard/new` `/dashboard/[id]` | Owner workspace |
| `/dashboard/supporting` `/motivate` | Support others; circle check-ins |
| `/o/{handle}/{slug}` | The goal page (the product) |
| `/o/apply/{goalId}` `/invite/{token}` | Apply or accept a private invite |
| `/u/{handle}` | Profile |
| `/settings` | Identity, follows, notifications, delete account |
| `/legal/*` | Terms, privacy, cookies, community guidelines |

---

## Principles (product, not brand adjectives)

1. The person with the goal is the hero. The product is a guide.
2. Visibility is a choice, not a moral test.
3. Honest progress counts, including stuck weeks.
4. Support is specific. “Cheer” is optional; a role and a cadence are the real mechanic.
5. Isolation is the problem. Other apps are not villains in public copy.
6. No promised outcomes. No fundraising. No ads.

---

## Related docs

- FAQ copy: `app/faq/page.tsx`
- About: `app/about/page.tsx`
- Story-first public writing: `marketing/story-first-llm-media-guide.md`
- Social production: `marketing/gomotivateme-content-formats.md`
- GoFundMe-shaped origin note: `README.md`
