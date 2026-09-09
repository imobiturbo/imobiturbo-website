const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

const pages = [
  {
    file: "politica-de-privacidade/index.html",
    canonical: "https://www.imobiturbo.com.br/politica-de-privacidade/",
    title: "Política de Privacidade | Imobiturbo",
    markers: ["Meta", "Facebook", "Instagram", "WhatsApp", "leadgen", "leads_retrieval", "cookies", "LGPD"],
  },
  {
    file: "exclusao-de-dados/index.html",
    canonical: "https://www.imobiturbo.com.br/exclusao-de-dados/",
    title: "Exclusão de Dados | Imobiturbo",
    markers: ["Data Deletion Instructions", "Apps and Websites", "Send Request", "suporte@imobiturbo.com.br", "30 dias", "revogar"],
  },
  {
    file: "termos-de-servico/index.html",
    canonical: "https://www.imobiturbo.com.br/termos-de-servico/",
    title: "Termos de Serviço | Imobiturbo",
    markers: ["Meta", "Platform Terms", "Facebook", "Instagram", "WhatsApp", "permissões", "suspensão", "lei brasileira"],
  },
];

function readPage(file) {
  const filePath = path.join(root, file);
  assert.ok(fs.existsSync(filePath), `${file} must exist`);
  return fs.readFileSync(filePath, "utf8");
}

test("legal pages are public, canonical, self-contained, and distinct from the home page", () => {
  for (const page of pages) {
    const html = readPage(page.file);

    assert.match(html, new RegExp(`<title>${page.title.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}<\\/title>`));
    assert.match(html, /<meta\s+name="description"\s+content="[^"]{40,}"\s*\/?>/i);
    assert.match(html, new RegExp(`<link\\s+rel="canonical"\\s+href="${page.canonical.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}"\\s*\\/?>`));
    assert.match(html, /<meta\s+property="og:title"\s+content="[^"]+"\s*\/?>/i);
    assert.match(html, /<meta\s+property="og:description"\s+content="[^"]+"\s*\/?>/i);
    assert.match(html, /<meta\s+property="og:url"\s+content="https:\/\/www\.imobiturbo\.com\.br\/[^"]+"\s*\/?>/i);
    assert.match(html, /<script type="application\/ld\+json">[\s\S]+<\/script>/i);
    assert.match(html, /href="\.\.\/legal\.css"/i);
    assert.match(html, /href="\/politica-de-privacidade\/"/i);
    assert.match(html, /href="\/exclusao-de-dados\/"/i);
    assert.match(html, /href="\/termos-de-servico\/"/i);
    assert.match(html, /mailto:suporte@imobiturbo\.com\.br/i);

    for (const marker of page.markers) {
      assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${page.file} must mention ${marker}`);
    }

    assert.doesNotMatch(html, /home-hero-operacao-imobiliaria|dist\/home\.bundle|ReactDOM\.createRoot/i);
  }
});

test("legal pages are included in the Cloudflare Pages build and sitemap", () => {
  const build = fs.readFileSync(path.join(root, "build-pages.js"), "utf8");
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

  assert.match(build, /'legal\.css'/);
  for (const page of pages) {
    const [directory] = page.file.split("/");
    assert.match(build, new RegExp(`'${directory}'`), `build must copy ${directory}`);
    assert.match(sitemap, new RegExp(`<loc>${page.canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/loc>`));
  }
});
