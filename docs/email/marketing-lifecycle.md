# Marketing email lifecycle

## Objective

Increase return visits and useful encouragement between members without mixing
promotional content into accountability or security mail.

## Live campaign

### Discover new goals

- Audience: signed-in users who explicitly select Daily or Weekly in Settings.
- Default: Off. Existing and new accounts are not enrolled automatically.
- Daily send: 08:30 UTC, up to four recently launched goals. The worker sends
  nothing when there are no eligible goals from another member.
- Weekly send: Sunday 17:00 UTC, up to six goals from the week. The same
  no-content rule applies, so selecting a cadence is not a promise of an empty
  email on every scheduled run.
- Content: approved, active, public, non-anonymous goals with a public creator.
- Safety: sensitive categories and flagged moderation topics are excluded.
- Suppression: global unsubscribe and the newsletter frequency are checked
  again centrally when each email is enqueued.
- Duplicate protection: daily and weekly cadence windows prevent repeat sends.
- Measurement: send/failure status is stored locally; Resend tags each message
  with `template=platformDigest` and `category=lifecycle` for reporting.

## Message pattern

The email follows the proven compact discovery model used by product/community
platforms: a short set of fresh items, one clear action per item, and one main
call to explore. Daily is intentionally shorter than weekly.

## Consent and deliverability

- Explicit affirmative opt-in is recorded with a server timestamp.
- The latest marketing opt-out and global unsubscribe are timestamped.
- Every marketing message has a visible unsubscribe link and preference link.
- RFC 8058 one-click unsubscribe uses a POST endpoint and is honored immediately.
- Marketing uses a distinct sender and `List-ID` from account/reminder mail.
- Verification and password reset remain essential account messages.

## Sources used for this implementation

- Irish Data Protection Commission: Rules for Direct Electronic Marketing
- European Commission: When is consent valid?
- Google: Email sender and email subscription guidelines
- Resend: One-click unsubscribe and webhook/event guidance
- Product Hunt: Daily Digest and weekly Roundup formats
- Kickstarter: Projects We Love, New & Trending, and Ending Soon formats

## Next campaigns after there is enough content

1. Ending soon: weekly only, explicitly opted in, public safe goals near target date.
2. Success stories: completed public goals with creator approval for editorial use.
3. Category editions: user-selected topics, never inferred from sensitive activity.

These should not be activated until the platform has enough eligible content to
avoid repetition and the current campaign has baseline unsubscribe/click data.
