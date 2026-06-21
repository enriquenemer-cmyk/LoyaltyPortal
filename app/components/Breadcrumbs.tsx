'use client';

import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="breadcrumb" className="flex items-center mb-1">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center">
            {index > 0 && (
              <span className="text-slate-400 mx-1.5 text-xs">/</span>
            )}
            {isLast || !item.href ? (
              <span className="text-slate-600 font-semibold text-xs">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-blue-500 hover:text-blue-700 text-xs font-medium transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
