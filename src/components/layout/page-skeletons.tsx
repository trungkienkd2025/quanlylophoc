import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton({ large = false }: { large?: boolean }) {
  return (
    <header className="mb-4 space-y-2" aria-label="Đang tải dữ liệu">
      <Skeleton className="h-3 w-36" />
      <Skeleton className={large ? "h-9 w-72 max-w-full" : "h-8 w-56 max-w-full"} />
      <Skeleton className="h-4 w-48 max-w-full" />
    </header>
  );
}

function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} size="sm">
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="size-6 rounded-full" />
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40 max-w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="flex items-center gap-3" key={index}>
            <Skeleton className="size-10 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-44 max-w-full" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <section aria-label="Đang tải danh sách lớp" className="mb-6">
        <Skeleton className="mb-3 h-6 w-28" />
        <CardGridSkeleton count={6} />
      </section>
      <Card>
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    </>
  );
}

export function ClassPageLoadingSkeleton() {
  return (
    <>
      <Skeleton className="mb-3 h-5 w-28" />
      <HeaderSkeleton />
      <CardGridSkeleton count={3} />
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} size="sm">
            <CardContent className="space-y-3">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-44 max-w-full" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export function StudentsLoadingSkeleton() {
  return (
    <>
      <Skeleton className="mb-3 h-5 w-32" />
      <HeaderSkeleton />
      <div className="mb-4 grid gap-2.5 sm:grid-cols-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <TableRowsSkeleton rows={8} />
    </>
  );
}

export function SessionLoadingSkeleton() {
  return (
    <>
      <Skeleton className="mb-3 h-5 w-32" />
      <HeaderSkeleton />
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
        <Skeleton className="h-10 rounded-md bg-background" />
        <Skeleton className="h-10 rounded-md" />
      </div>
      <TableRowsSkeleton rows={7} />
    </>
  );
}

export function ReportLoadingSkeleton() {
  return (
    <>
      <Skeleton className="mb-6 h-5 w-32" />
      <HeaderSkeleton large />
      <div className="mb-4 flex flex-wrap gap-2">
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
      <CardGridSkeleton count={3} />
      <div className="mt-4">
        <TableRowsSkeleton rows={5} />
      </div>
    </>
  );
}

export function StudentDetailLoadingSkeleton() {
  return (
    <>
      <Skeleton className="mb-6 h-5 w-32" />
      <HeaderSkeleton large />
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="space-y-2" key={index}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-36" />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="mt-4">
        <TableRowsSkeleton rows={4} />
      </div>
    </>
  );
}
