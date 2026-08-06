// Skeleton loader components — blue-tinted shimmer matching 3E palette

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`skeleton-blue rounded-md ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#DBEAFE] p-6 flex flex-col gap-3 shadow-[0_1px_2px_rgba(249,115,22,0.04),_0_4px_16px_rgba(249,115,22,0.06)]">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-20" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="bg-white rounded-2xl border border-[#DBEAFE] overflow-hidden shadow-[0_1px_2px_rgba(249,115,22,0.04),_0_4px_16px_rgba(249,115,22,0.06)]"
      aria-hidden="true"
    >
      {/* Header */}
      <div className="p-4 border-b border-[#DBEAFE]">
        <Skeleton className="h-4 w-48" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-4 border-b border-[#EFF6FF] last:border-0"
        >
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full hidden sm:block" />
          <Skeleton className="h-6 w-24 rounded-full hidden sm:block" />
          <Skeleton className="h-3 w-28 hidden md:block" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="flex items-end gap-3 h-36" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-lg skeleton-blue"
          style={{ height: `${30 + (i * 13) % 70}%` }}
        />
      ))}
    </div>
  );
}
