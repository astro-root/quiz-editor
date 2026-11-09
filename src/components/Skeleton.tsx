// 読み込み中の、骨組みの表示。文字だけの「読み込み中…」より、読み込み後との差が小さく、画面が飛んだように見えない。
const bar = "animate-pulse rounded-md bg-slate-200/70";

export function CardsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="読み込み中" className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-xl border border-slate-100 bg-surface p-4">
          <div className={`${bar} mb-2 h-4 w-3/4`} />
          <div className={`${bar} h-3 w-1/3`} />
        </div>
      ))}
    </div>
  );
}

// 問題セットの画面全体（ヘッダー・タブ・一覧）の骨組み。認証とセットの読み込みの間に出す
export function SetShellSkeleton() {
  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-6xl px-3 pb-16 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <div className={`${bar} mb-4 h-6 w-48`} />
        <div className="mb-4 h-11 rounded-xl bg-slate-100" />
        <CardsSkeleton />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-[96rem] px-4 py-8 sm:px-6 lg:px-10">
        <div className={`${bar} mb-8 h-8 w-40`} />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[74px] rounded-xl border border-slate-100 bg-surface" />)}
        </div>
      </div>
    </div>
  );
}
