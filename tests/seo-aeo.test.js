const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("sitemap.xml exists, is valid XML, and covers all canonical routes", () => {
  const sitemapPath = path.join(root, "sitemap.xml");
  assert.ok(fs.existsSync(sitemapPath), "sitemap.xml must exist in root");

  const content = fs.readFileSync(sitemapPath, "utf8");
  assert.ok(content.startsWith("<?xml"), "sitemap must start with XML declaration");
  assert.ok(content.includes("<urlset"), "sitemap must include <urlset>");

  const requiredUrls = [
    "https://www.imobiturbo.com.br/",
    "https://www.imobiturbo.com.br/corretor-autonomo/",
    "https://www.imobiturbo.com.br/imobiliarias/",
    "https://www.imobiturbo.com.br/construtoras-incorporadoras/",
    "https://www.imobiturbo.com.br/depoimentos/",
    "https://www.imobiturbo.com.br/lovable/",
    "https://www.imobiturbo.com.br/guia/meta-lead-ads/"
  ];

  for (const url of requiredUrls) {
    assert.ok(content.includes(`<loc>${url}</loc>`), `sitemap must include ${url}`);
  }
});

test("robots.txt is configured for search engines and AI user agents", () => {
  const robotsPath = path.join(root, "robots.txt");
  assert.ok(fs.existsSync(robotsPath), "robots.txt must exist in root");

  const content = fs.readFileSync(robotsPath, "utf8");
  assert.ok(content.includes("Sitemap: https://www.imobiturbo.com.br/sitemap.xml"), "robots.txt must declare official sitemap URL");
  assert.ok(content.includes("User-agent: *"), "robots.txt must have default user-agent");
  assert.ok(content.includes("User-agent: Googlebot"), "robots.txt must welcome Googlebot");
  assert.ok(content.includes("User-agent: GPTBot"), "robots.txt must welcome GPTBot for AEO");
  assert.ok(content.includes("User-agent: PerplexityBot"), "robots.txt must welcome PerplexityBot for AEO");
});

test("llms.txt and llms-full.txt are present and properly formatted", () => {
  const llmsPath = path.join(root, "llms.txt");
  const llmsFullPath = path.join(root, "llms-full.txt");

  assert.ok(fs.existsSync(llmsPath), "llms.txt must exist in root");
  assert.ok(fs.existsSync(llmsFullPath), "llms-full.txt must exist in root");

  const llmsContent = fs.readFileSync(llmsPath, "utf8");
  const llmsFullContent = fs.readFileSync(llmsFullPath, "utf8");

  assert.ok(llmsContent.includes("# Imobiturbo"), "llms.txt must have H1 # Imobiturbo");
  assert.ok(llmsContent.includes("Natan Pimentel"), "llms.txt must identify founder");
  assert.ok(llmsContent.includes("https://www.imobiturbo.com.br/corretor-autonomo/"), "llms.txt must link corretor route");
  assert.ok(llmsContent.includes("https://www.imobiturbo.com.br/imobiliarias/"), "llms.txt must link imobiliarias route");

  assert.ok(llmsFullContent.includes("Captação"), "llms-full.txt must detail 5 pillars");
  assert.ok(llmsFullContent.includes("Fechamento"), "llms-full.txt must detail closing");
});

test("all public HTML pages contain required SEO & AEO meta tags and structured JSON-LD", () => {
  const pages = [
    { file: "index.html", canonical: "https://www.imobiturbo.com.br/" },
    { file: "corretor-autonomo/index.html", canonical: "https://www.imobiturbo.com.br/corretor-autonomo/" },
    { file: "imobiliarias/index.html", canonical: "https://www.imobiturbo.com.br/imobiliarias/" },
    { file: "construtoras-incorporadoras/index.html", canonical: "https://www.imobiturbo.com.br/construtoras-incorporadoras/" },
    { file: "depoimentos/index.html", canonical: "https://www.imobiturbo.com.br/depoimentos/" },
    { file: "lovable/index.html", canonical: "https://www.imobiturbo.com.br/lovable/" },
    { file: "guia/meta-lead-ads/index.html", canonical: "https://www.imobiturbo.com.br/guia/meta-lead-ads/" }
  ];

  for (const { file, canonical } of pages) {
    const filePath = path.join(root, file);
    assert.ok(fs.existsSync(filePath), `file ${file} must exist`);

    const html = fs.readFileSync(filePath, "utf8");

    // Title tag
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    assert.ok(titleMatch && titleMatch[1].length > 10, `${file} must have descriptive title`);

    // Meta description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                      html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
    assert.ok(descMatch && descMatch[1].length >= 40, `${file} must have a meta description with at least 40 characters`);

    // Canonical link
    const canonicalMatch = html.match(new RegExp(`<link\\s+rel=["\x27]canonical["\x27]\\s+href=["\x27]${canonical}["\x27]\\s*\\/?>`, 'i'));
    assert.ok(canonicalMatch, `${file} must have canonical link pointing to ${canonical}`);

    // OpenGraph tags
    assert.ok(html.includes('property="og:title"'), `${file} must have og:title`);
    assert.ok(html.includes('property="og:description"'), `${file} must have og:description`);
    assert.ok(html.includes('property="og:image"'), `${file} must have og:image`);

    // Twitter card
    assert.ok(html.includes('name="twitter:card"'), `${file} must have twitter:card`);

    // JSON-LD structured data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    assert.ok(jsonLdMatch, `${file} must contain application/ld+json structured data`);

    // Parse JSON-LD to ensure valid syntax
    const jsonLd = JSON.parse(jsonLdMatch[1]);
    assert.ok(jsonLd["@context"] === "https://schema.org", `${file} JSON-LD must declare schema.org context`);
  }
});
