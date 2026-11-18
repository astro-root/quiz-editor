import type { MetadataRoute } from "next";

// ログインが必要なページと管理ページは、検索に出さない
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/account", "/sets/"] }] };
}
