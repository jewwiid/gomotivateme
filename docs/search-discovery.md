# Search and AI discovery

GoMotivateMe already publishes a public `robots.txt`, dynamic `sitemap.xml`, canonical URLs, social metadata, Organization/WebSite JSON-LD, FAQPage JSON-LD, and BreadcrumbList JSON-LD. This document covers the final setup required to monitor Google Search and make the platform easy for language-model crawlers to identify accurately.

## Google Search Console

1. In Google Search Console, add a **Domain property** for `gomotivateme.com`.
2. Verify it with the TXT record Google supplies at the domain DNS provider. This covers both the apex domain and `www`.
3. After verification, submit `https://www.gomotivateme.com/sitemap.xml` in the Sitemaps report.
4. Keep the TXT record in DNS permanently. Add a second verified owner from the team so access does not depend on one account.

Google also offers HTML-tag verification for a URL-prefix property. This codebase supports it when `GOOGLE_SITE_VERIFICATION` is set in Vercel. Copy **only the token** from the `content` value in Google’s tag, set it for the Production environment, and redeploy. Next.js will publish the required `google-site-verification` meta tag in the home page head.

```text
GOOGLE_SITE_VERIFICATION=the-token-from-google
```

Prefer the DNS-verified Domain property for the complete site. The environment variable is a useful secondary verification method and does not prove ownership until Google confirms it in Search Console.

Useful Google references:

- [Verify site ownership](https://support.google.com/webmasters/answer/9008080?hl=en)
- [Getting started with Search Console](https://support.google.com/webmasters/answer/10267942?hl=en)
- [Sitemaps report](https://support.google.com/webmasters/answer/7451001?hl=en)

## Public discovery surfaces

| Surface | URL or implementation | Purpose |
| --- | --- | --- |
| Robots policy | `/robots.txt` | Allows public pages and excludes signed-in, token, and private workflows. |
| Sitemap | `/sitemap.xml` | Includes the homepage, About, FAQ, Explore, selected categories, public goals, and public profiles. |
| About | `/about` | Canonical mission, vision, platform explanation, and Organisation schema. |
| FAQ | `/faq` | Human-readable answers plus FAQPage schema. |
| LLM summary | `/llms.txt` | A concise platform explanation and preferred canonical sources for AI clients that choose to use it. |
| Public goals | `/o/[handle]/[slug]` | Canonical goal pages, social cards, and BreadcrumbList schema. |

## LLM guidance

`/llms.txt` is a voluntary convenience file, not a universal crawler standard or a guarantee of inclusion in any AI product. The durable signals remain indexable HTML, clear About and FAQ content, canonical metadata, JSON-LD, sitemap entries, and the robots policy.

Never publish private, unlisted, anonymous, deleted, or moderation-restricted goal content through a public index, sitemap, marketing asset, or AI summary.
