import { SkeletonCard, SkeletonTable } from '@/app/components/Skeleton';

export default function AdminLoading() {
  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="skeleton-blue h-7 w-48 rounded-lg mb-2" />
          <div className="skeleton-blue h-4 w-64 rounded-md" />
        </div>
        <div className="skeleton-blue h-9 w-24 rounded-xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Chart + recent feed row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white rounded-2xl border border-[#DBEAFE] p-6 shadow-[0_1px_2px_rgba(37,99,235,0.04)]">
          <div className="skeleton-blue h-4 w-44 rounded-md mb-1" />
          <div className="skeleton-blue h-3 w-56 rounded-md mb-6" />
          <div className="flex items-end gap-3 h-36">
            {[45, 70, 30, 85, 55, 65, 40].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-lg skeleton-blue"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* Recent cobros */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#DBEAFE] p-6 shadow-[0_1px_2px_rgba(37,99,235,0.04)]">
          <div className="skeleton-blue h-4 w-36 rounded-md mb-1" />
          <div className="skeleton-blue h-3 w-48 rounded-md mb-5" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton-blue w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="skeleton-blue h-3 rounded w-3/4" />
                  <div className="skeleton-blue h-2.5 rounded w-1/2" />
                </div>
                <div className="skeleton-blue h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Claims table */}
      <SkeletonTable rows={6} />
    </div>
  );
}
