"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSetContext } from "@/lib/SetContext";

// 「問題」タブ内の切替：すべて／自分の問題／他の人の問題
export function ScopeNav() {
  const { set } = useSetContext();
  const pathname = usePathname();
  const base = `/sets/${set.id}`;
  const items = [
    { href: `${base}/manage`, label: "すべて" },
    { href: `${base}/mine`, label: "自分の問題" },
    { href: `${base}/others`, label: "他の人の問題" },
  ];
  return (
    <div className="mb-3 inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={pathname === i.href ? "page" : undefined}
          className={`rounded-md px-3 py-1 ${pathname === i.href ? "bg-brand-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
          {i.label}
        </Link>
      ))}
    </div>
  );
}
