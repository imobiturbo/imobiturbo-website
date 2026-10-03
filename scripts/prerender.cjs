const fs = require('fs');
const path = require('path');
const vm = require('vm');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

// Evaluate the exact browser bundles. Effects and event handlers do not run in SSR.
module.exports = function prerender() {
  const root = path.resolve(__dirname, '..');
  const vendor = require(path.join(root, 'dist/react.production.min.js'));
  const domVendor = fs.readFileSync(path.join(root, 'dist/react-dom.production.min.js'), 'utf8');
  if (React.version !== vendor.version || !domVendor.includes(`reconcilerVersion:"${React.version}"`)) {
    throw new Error('Prerender React must match the browser React and ReactDOM vendors');
  }
  const pages = [
    ['index.html', 'home', 'HomePrototypes', {}],
    ['corretor-autonomo/index.html', 'audience', 'AudiencePage', { pageId: 'corretor' }],
    ['imobiliarias/index.html', 'audience', 'AudiencePage', { pageId: 'imobiliarias' }],
    ['construtoras-incorporadoras/index.html', 'audience', 'AudiencePage', { pageId: 'incorporadoras' }],
  ];
  for (const [file, bundle, component, props] of pages) {
    const context = vm.createContext({ React, window: {}, console });
    vm.runInContext(fs.readFileSync(path.join(root, `dist/${bundle}.bundle.js`), 'utf8'), context);
    const markup = ReactDOMServer.renderToString(React.createElement(context.window[component], props));
    const target = path.join(root, file);
    const html = fs.readFileSync(target, 'utf8');
    // Markers make repeated builds replace the entire tree, including nested divs.
    const pattern = /<div id="root" data-imt-decorate>(?:<!--prerender:start-->[\s\S]*?<!--prerender:end-->)?<\/div>/;
    if (!pattern.test(html)) throw new Error(`Missing prerender root in ${file}`);
    fs.writeFileSync(target, html.replace(pattern, () => `<div id="root" data-imt-decorate><!--prerender:start-->${markup}<!--prerender:end--></div>`));
    console.log(`Prerendered ${file}`);
  }
};
