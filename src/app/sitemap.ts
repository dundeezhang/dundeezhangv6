import type { MetadataRoute } from "next";

const siteUrl = "https://dundeezhang.com";

const routes = ["/", "/experiences", "/projects", "/photos"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({ url: `${siteUrl}${route}` }));
}
