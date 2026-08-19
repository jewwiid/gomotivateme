import Link from "next/link";
import { SITE_URL } from "@/lib/site";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function PageBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${SITE_URL}${item.href === "/" ? "" : item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav aria-label="Breadcrumb" className="font-mono text-xs text-[var(--color-text-muted)]">
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => {
            const last = index === items.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                {index > 0 ? (
                  <span aria-hidden className="text-[var(--color-border)]">
                    /
                  </span>
                ) : null}
                {last || !item.href ? (
                  <span aria-current={last ? "page" : undefined} className="text-[var(--color-text-secondary)]">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className="transition hover:text-[var(--color-primary)]">
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
