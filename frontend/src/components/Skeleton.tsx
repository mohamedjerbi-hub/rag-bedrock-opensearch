/**
 * MJ Studio - Reusable Skeleton Loaders for Instant Feedback (< 200ms)
 */

export function SkeletonLine({ className = 'w-full h-4' }: { className?: string }) {
  return (
    <div className={`bg-secondary/60 animate-pulse rounded-md ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 rounded-2xl border border-border/60 bg-background/50 space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonLine className="w-1/3 h-5" />
        <SkeletonLine className="w-12 h-5 rounded-full" />
      </div>
      <SkeletonLine className="w-full h-4" />
      <SkeletonLine className="w-2/3 h-4" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3 p-4">
      <div className="flex justify-between items-center pb-3 border-b border-border/40">
        <SkeletonLine className="w-1/4 h-5" />
        <SkeletonLine className="w-1/6 h-5" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-border/20">
          <SkeletonLine className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="w-1/3 h-4" />
            <SkeletonLine className="w-1/2 h-3" />
          </div>
          <SkeletonLine className="w-20 h-6 rounded-full" />
        </div>
      ))}
    </div>
  );
}
