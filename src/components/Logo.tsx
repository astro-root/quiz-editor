import { useId } from "react";

// Qraft のロゴ。Q の輪を、内側から突き抜ける鉛筆が貫いている（「書く」道具が Q の尾になっている）。
// src/app/icon.svg（ファビコン）と同じ絵。飾りなので、読み上げからは外す。
export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  const gid = `logo-${useId().replace(/:/g, "")}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gid} x1="8" y1="4" x2="58" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6d70f5" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${gid})`} />
      <circle cx="31" cy="30" r="15" fill="none" stroke="#fff" strokeWidth="6.5" />
      <g transform="translate(27 26) rotate(45)">
        <rect x="0" y="-3.4" width="19" height="6.8" fill="#fff" />
        <path d="M19 -3.4 L27 0 L19 3.4 Z" fill="#c7d2fe" />
        <path d="M24.6 -1 L27 0 L24.6 1 Z" fill="#312e81" />
      </g>
    </svg>
  );
}
