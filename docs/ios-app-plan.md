# GoMotivateMe — iOS App Plan

> Strategy for shipping a native iOS app from the existing Next.js + Convex web platform.

---

## 1. Why iOS

GoMotivateMe's core loop is a **10-second phone interaction**: log progress, mark a streak, read a cheer, approve a follow request. Every primary action is designed for one-thumb use on mobile. Push notifications create the return loop that web alone can't deliver.

The product is better suited to mobile than to desktop web.

---

## 2. Approach: Capacitor (recommended)

Capacitor wraps the existing Next.js web app in a native iOS shell. No UI rewrite, no new frontend framework, no backend changes. The React components, Convex real-time queries, and all existing features work identically inside a native webview.

| Approach | Effort | Trade-off |
|----------|--------|-----------|
| **Capacitor** ✅ | Days | Existing web app wrapped native. Push, camera, haptics via plugins. TestFlight in a week. |
| React Native / Expo | Weeks | Native feel, but full UI rewrite. Reuses Convex backend only. |
| PWA (installable web) | Hours | Installable from Safari, but no reliable iOS push, no widgets, no App Store discovery. |
| Native SwiftUI | Months | Best performance, total rebuild. Overkill at this stage. |

---

## 3. What Ships in the iOS App

### Core loop (already built)
- Goal creation (13 categories, 3 progress types)
- Progress logging: number (+1, log value), streak (mark today), milestones (toggle, add, rename, remove)
- Undo progress with reason
- Dashboard workspace with recent activity

### Social
- Follow graph with approval gate
- Private goals (followers-only)
- Profile pages (`/@handle`)
- Notification bell (in-app feed + unread badge)

### Support
- Motivation Circle (invites, applications, pledges, check-ins)
- Reactions / cheers
- Support messages
- Explore feed (goals, motivators, categories)

### Infrastructure (already built)
- Email pipeline (Resend + React Email)
- Notification queue + drain cron
- Content moderation queue
- Auth (Password + Google OAuth)
- Brand system (official wordmark, mark, colors)

### iOS-specific additions (new work)
- Push notifications (replaces email-first for mobile)
- Native camera for media uploads
- Haptic feedback on progress actions
- Lock screen widget (streak count / next milestone) — phase 2

---

## 4. Implementation Phases

### Phase 0: Web polish (before wrapping native)
**Goal:** Ensure the app doesn't feel broken on a phone screen.

| Task | Detail |
|------|--------|
| Mobile-responsive audit | Test every route on iPhone SE + iPhone 15 Pro. Fix layouts that break at narrow widths. |
| Workspace layouts | The dashboard goal workspace is desktop-first (multi-column, sidebar nav). Needs a mobile-first layout: stacked sections, bottom action bar, swipeable tabs. |
| Touch targets | All buttons ≥ 44×44px (Apple HIG). Audit the composer actions, milestone cards, follow button. |
| Loading states | Skeleton loaders on every data-dependent screen (not blank white). |
| Offline state | "You're offline — progress will sync when you reconnect" banner. Prevents crashes from failed Convex queries. |
| Safe areas | Content respects iOS safe area insets (notch, home indicator). |

**Estimated time:** 2–3 days

---

### Phase 1: Capacitor setup
**Goal:** App runs as a native iOS binary.

| Task | Detail |
|------|--------|
| Install Capacitor | `npm install @capacitor/core @capacitor/cli && npx cap init` |
| Build configuration | Static export of Next.js (`output: 'export'` or Capacitor's Next.js integration). Configure `capacitor.config.ts`. |
| iOS platform | `npx cap add ios` — generates Xcode project. |
| Native project | Open in Xcode, set bundle ID (`com.gomotivateme.app`), signing team, app name, icons. |
| App icons | Generate from `public/brand/GoMotivateMe_Logo.png` via Xcode's asset catalog (all required sizes). |
| Launch screen | Simple branded screen using the wordmark + brand colors. |
| Test on simulator | Verify every route loads, navigation works, Convex client connects. |

**Estimated time:** 1–2 days

---

### Phase 2: Push notifications
**Goal:** Users get notified on their phone, not just email.

| Task | Detail |
|------|--------|
| APNs setup | Create APNs key in Apple Developer console. Upload to Convex (or a push provider like OneSignal). |
| Device registration | On app launch, request push permission. Register device token → store in a `deviceTokens` table linked to the user. |
| Convex integration | When `internal.emails.enqueue` fires, also send a push notification to the user's registered devices (if they have one). |
| Notification types | Map the same 14 template types to push titles/bodies. Deep link to the right page on tap. |
| Permission timing | Don't ask on launch. Ask after the user creates their first goal or gets their first supporter — when the value of notifications is self-evident. |

**Schema addition:**
```
deviceTokens: defineTable({
  userId: v.id("users"),
  token: v.string(),
  platform: v.union(v.literal("ios"), v.literal("android")),
  createdAt: v.number(),
  lastSeenAt: v.number(),
}).index("by_user", ["userId"])
```

**Estimated time:** 2–3 days

---

### Phase 3: Native capabilities
**Goal:** The app feels native, not like a website.

| Capability | Plugin | Effort |
|------------|--------|--------|
| Camera (media uploads) | `@capacitor/camera` | Hours — replace `<input type="file">` with native camera on mobile. |
| Haptics (progress actions) | `@capacitor/haptics` | Hours — light impact on +1, success on milestone toggle, medium on follow approved. |
| Share sheet | `@capacitor/share` | Hours — native share for goal links + profile links. |
| Status bar | `@capacitor/status-bar` | Minutes — match brand color on status bar. |
| Splash screen | `@capacitor/splash-screen` | Minutes — branded launch screen. |
| App metadata | Xcode | Hours — display name, version, permissions strings. |

**Estimated time:** 1–2 days

---

### Phase 4: App Store submission prep
**Goal:** Pass App Store review on first attempt.

| Task | Detail |
|------|--------|
| Privacy policy | Required (Guideline 5.1.2). Host at `gomotivateme.com/privacy`. Must match actual data collection. |
| Account deletion | Required (Guideline 5.1.1(v)). Must be accessible in-app, not just via email request. The `admin:deleteUserByEmail` mutation exists but needs a user-facing UI. |
| Sign in with Apple | Already implemented ✅ (Google + Password both exist; Sign in with Apple already wired). |
| Demo account | Create a test account with sample goals for App Review (Guideline 2.1). Document credentials in App Review Notes. |
| Reviewer notes | Explain: login required (social accountability app), how to reach core features, demo account credentials, what permissions are needed and why. |
| Screenshots | Required for all device sizes (6.7", 6.5", 5.5" at minimum). Capture: goal creation, dashboard, public goal page, profile. |
| Metadata | App name, subtitle, description, keywords, category (Lifestyle or Health & Fitness), age rating questionnaire. |
| Content moderation | Already built ✅ — moderation queue, report system, community guidelines reference. Document in reviewer notes. |
| UGC compliance | The app has user-generated content (goals, updates, messages). Apple requires: block/report user, content reporting, and a way to contact you. Reports table + report button exist ✅. |

**App Store review skills** (from the GitHub repos):
- `app-store-review` — already installed, provides guideline knowledge
- `apple-appstore-reviewer` — reviewer persona for codebase audit
- `asc-submission-health` — CLI for submission status monitoring

Install the remaining two before this phase to run the submission readiness check.

**Estimated time:** 2–3 days

---

## 5. What's Already Done (no rework needed)

| Area | Status |
|------|--------|
| Backend (Convex) | ✅ Works identically in webview — no changes |
| Auth (Password + Google + Apple-ready) | ✅ |
| Real-time queries | ✅ Convex WebSocket works in Capacitor |
| All 3 progress types | ✅ Number, streak, milestones |
| Goal lifecycle | ✅ Create, edit, log, undo, complete, close |
| Follow graph | ✅ Approval-gated, private goals |
| Notification system | ✅ Email + in-app bell (push is additive) |
| Moderation | ✅ Queue, reports, review flow |
| Brand assets | ✅ Wordmark, mark, colors, favicon |
| Email pipeline | ✅ Resend + React Email + cron |

---

## 6. Timeline

| Phase | Duration | Output |
|-------|----------|--------|
| Phase 0: Web polish | 2–3 days | Mobile-responsive web app |
| Phase 1: Capacitor setup | 1–2 days | Native iOS binary running on simulator |
| Phase 2: Push notifications | 2–3 days | Users get push, deep links work |
| Phase 3: Native capabilities | 1–2 days | Camera, haptics, share sheet, splash |
| Phase 4: App Store prep | 2–3 days | Submission-ready, TestFlight build |
| **Total** | **8–13 days** | **App Store submission** |

---

## 7. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| App Store rejects for "minimum functionality" (4.2) | Low | The app is fully functional with real content — not a thin wrapper. Dogfood with the existing goals. |
| App Store rejects for UGC policy | Medium | Moderation + reporting already exists. Add a "block user" feature and link to community guidelines. |
| Webview performance issues | Medium | The app is mostly text + images, not heavy animation. Should be smooth. Profile on older devices. |
| Push notification delivery | Low | Use APNs directly or a reliable provider (OneSignal). Convex actions can call the push API. |
| Next.js static export incompatibility | Medium | Some Next.js features (middleware, edge runtime) don't work with static export. May need to adjust routing or use a hybrid approach. |
| Apple's review process takes longer than expected | Medium | Submit early, respond fast in Resolution Center. Use the `asc-submission-health` skill to monitor status. |

---

## 8. Cost

| Item | Cost |
|------|------|
| Apple Developer Program | $99/year |
| Capacitor | Free (open source) |
| Push notifications (APNs) | Free (direct) or OneSignal free tier |
| Convex | Existing plan (no change) |
| Resend | Existing plan (no change) |
| App Store submission | Free (included in developer program) |

**Total new cost: $99/year** (Apple Developer Program)

---

## 9. Post-Launch (Phase 2 features)

| Feature | Priority | Notes |
|---------|----------|-------|
| Lock screen widget (streak count) | High | Requires WidgetKit (native Swift, small) |
| iPad optimization | Medium | Responsive layouts should mostly work; test and adjust. |
| Dark mode | Medium | Brand tokens already support it via CSS variables. |
| Offline-first progress logging | Medium | Queue log actions locally, sync when online. |
| Apple Watch complication | Low | Streak count on the watch face. Very high cool factor. |
| Siri shortcuts | Low | "Log my progress" via voice. |

---

## 10. Decision Points

1. **Capacitor vs Expo vs PWA** — This plan assumes Capacitor. If you prefer Expo, the backend stays but the frontend needs a React Native rewrite. PWA is fastest but limits you (no App Store, unreliable push).

2. **Push provider** — Direct APNs (free, more setup) vs OneSignal (free tier, faster setup, third-party dependency).

3. **When to start** — Phase 0 (web polish) can start immediately. The rest follows once you have an Apple Developer account.

---

*Last updated: July 2026*
*Status: Planning*
