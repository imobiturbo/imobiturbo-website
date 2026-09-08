const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const reactPages = [
  "index.html",
  "corretor-autonomo/index.html",
  "imobiliarias/index.html",
  "construtoras-incorporadoras/index.html"
];

test("no page displays unstyled fallback HTML directly inside #root (FOUC prevention)", () => {
  for (const file of reactPages) {
    const filePath = path.join(root, file);
    const html = fs.readFileSync(filePath, "utf8");

    // #root must be empty (<div id="root" data-imt-decorate></div>) to prevent FOUC
    assert.match(
      html,
      /<div id="root" data-imt-decorate>\s*<\/div>/,
      `${file} must have an empty #root container to prevent flashing unstyled content`
    );

    // If semantic fallback exists for crawlers, it MUST be wrapped in <noscript>
    if (html.includes("Fallback semântico")) {
      assert.match(
        html,
        /<noscript>[\s\S]*?<!-- Fallback semântico[\s\S]*?<\/noscript>/,
        `${file} semantic fallback must be wrapped inside <noscript> tag`
      );
    }
  }
});

test("React and ReactDOM are loaded from local dist files and not external unpkg CDN", () => {
  for (const file of reactPages) {
    const filePath = path.join(root, file);
    const html = fs.readFileSync(filePath, "utf8");

    assert.doesNotMatch(
      html,
      /unpkg\.com\/react/,
      `${file} must not load React from external unpkg CDN`
    );

    assert.match(
      html,
      /react\.production\.min\.js/,
      `${file} must load local react.production.min.js`
    );
    assert.match(
      html,
      /react-dom\.production\.min\.js/,
      `${file} must load local react-dom.production.min.js`
    );
  }
});

test("local React and ReactDOM files exist in dist directory", () => {
  assert.ok(
    fs.existsSync(path.join(root, "dist/react.production.min.js")),
    "dist/react.production.min.js must exist"
  );
  assert.ok(
    fs.existsSync(path.join(root, "dist/react-dom.production.min.js")),
    "dist/react-dom.production.min.js must exist"
  );
});
