import type { APIRoute } from "astro";

const getRobotsTxt = (host: string, sitemapURL: URL) => `\
User-agent: *
Allow: /

Host: ${host}

Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL("sitemap-index.xml", site);
  if (!site) {
    return new Response(getRobotsTxt("https://cleanmylinux.com", sitemapURL));
  }
  return new Response(getRobotsTxt(site.origin, sitemapURL));
};
