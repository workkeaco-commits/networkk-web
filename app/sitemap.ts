import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
  const routes = [
    "",
    "/client/signup",
    "/client/sign-in",
    "/freelancer/signup",
    "/freelancer/sign-in",
  ];
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${base}${route || "/"}`,
    lastModified,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.6,
  }));
}
