const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'vagas/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'vagas/vagas.css'), 'utf8');

test('vagas preserves the muted preview and keeps ThumbSniper deferred until pause', () => {
  const mainVideo = html.match(/<video id="vslVideo"([^>]*)>/);
  const retentionVideo = html.match(/<video id="vslRetentionVideo"([^>]*)>/);

  assert.ok(mainVideo, 'Main VSL video must exist');
  assert.match(mainVideo[1], /preload="auto"/);
  assert.match(mainVideo[1], /\bautoplay\b/);
  assert.match(mainVideo[1], /\bloop\b/);
  assert.match(mainVideo[1], /\bmuted\b/);
  assert.match(mainVideo[1], /data-desktop-src="https:\/\/vsl\.imobiturbo\.com\.br\/imobiturbo-vagas-horizontal-reels-sound-v5\.mp4"/);
  assert.match(mainVideo[1], /data-mobile-src="https:\/\/vsl\.imobiturbo\.com\.br\/imobiturbo-vagas-vertical-reels-sound-v5\.mp4"/);

  assert.ok(retentionVideo, 'ThumbSniper retention video must exist');
  assert.doesNotMatch(retentionVideo[1], /\bautoplay\b/);
  assert.match(retentionVideo[1], /preload="none"/);
  assert.match(retentionVideo[1], /\bloop\b/);
  assert.match(retentionVideo[1], /\bmuted\b/);
  assert.match(retentionVideo[1], /data-desktop-src="\.\/assets\/vsl-thumbsniper-desktop-ai-v2\.webm"/);
  assert.match(retentionVideo[1], /data-mobile-src="\.\/assets\/vsl-thumbsniper-mobile-ai-v2\.webm"/);
  assert.match(retentionVideo[1], /data-desktop-poster="\.\/assets\/vsl-thumbsniper-desktop-ai-v2\.webp"/);
  assert.match(retentionVideo[1], /data-mobile-poster="\.\/assets\/vsl-thumbsniper-mobile-ai-v2\.webp"/);
});

test('ThumbSniper reappears on pause/end and disappears on playback', () => {
  assert.match(html, /function setVslRetentionVisible\(visible\)/);
  assert.match(html, /video\.addEventListener\('play',[\s\S]*?setVslRetentionVisible\(false\)/);
  assert.match(html, /video\.addEventListener\('pause',[\s\S]*?setVslRetentionVisible\(true\)/);
  assert.match(html, /video\.addEventListener\('ended',[\s\S]*?setVslRetentionVisible\(true\)/);
  assert.match(css, /\.vsl-retention-video\s*\{[\s\S]*?object-fit:\s*cover/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.hero-vsl\s*\{\s*aspect-ratio:\s*9 \/ 16;/);
});

test('ThumbSniper media stays small enough for fast page delivery', () => {
  const assets = [
    'vsl-thumbsniper-desktop-ai-v2.webm',
    'vsl-thumbsniper-mobile-ai-v2.webm',
    'vsl-thumbsniper-desktop-ai-v2.webp',
    'vsl-thumbsniper-mobile-ai-v2.webp'
  ];

  for (const asset of assets) {
    const assetPath = path.join(root, 'vagas/assets', asset);
    assert.ok(fs.existsSync(assetPath), `${asset} must exist`);
    assert.ok(fs.statSync(assetPath).size < 64 * 1024, `${asset} must stay under 64 KiB`);
  }
});

// Exercise the actual controller: the preview reset is not an intentional pause.
const vm = require('node:vm');
const controller = html.slice(html.indexOf('    let vslStarted = false;'), html.indexOf('    let lastNonZeroVolume = 1.0;'));

for (const mobile of [false, true]) {
  test(`initial preview and intentional pause remain distinct on ${mobile ? 'mobile' : 'desktop'}`, () => {
    function element(hidden = false) {
      const classes = new Set(hidden ? ['vsl-hidden'] : []);
      return { dataset: {}, style: {}, setAttribute() {}, addEventListener() {}, classList: {
        contains(name) { return classes.has(name); },
        add(name) { classes.add(name); },
        toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); }
      }};
    }
    function media() {
      const el = element();
      const events = new Map();
      Object.assign(el, {paused: true, currentTime: 0, ended: false, loadCount: 0,
        addEventListener(name, fn) { events.set(name, fn); },
        emit(name) { events.get(name)?.(); },
        load() { this.loadCount++; this.currentTime = 0; },
        play() { this.paused = false; this.emit('play'); return Promise.resolve(); },
        pause() { const changed = !this.paused; this.paused = true; if(changed) this.emit('pause'); }
      });
      el.dataset = {desktopSrc: 'desktop', mobileSrc: 'mobile'};
      return el;
    }
    const video = media(), retention = media();
    const nodes = {vslVideo:video, vslRetentionVideo:retention, vslOverlay:element(true), vslInitialOverlay:element(), vslProgressFill:element(), vslSmartProgress:element()};
    const context = vm.createContext({document:{getElementById:id=>nodes[id] || null}, window:{matchMedia:()=>({matches:mobile,addEventListener(){}})}, console, requestAnimationFrame(){}, revealVslControls(){}, lastNonZeroVolume:1, setVslVolume(val){video.volume=val;video.defaultMuted=false;}});
    vm.runInContext(controller, context);
    context.initVslPlayer();
    assert.equal(video.paused, false, 'original VSL plays before the first click');
    assert.equal(video.muted, true);
    assert.equal(video.loop, true);
    assert.equal(video.src, mobile ? 'mobile' : 'desktop');
    assert.equal(nodes.vslInitialOverlay.classList.contains('vsl-hidden'), false);
    assert.equal(nodes.vslOverlay.classList.contains('vsl-hidden'), true);
    assert.equal(retention.loadCount, 0, 'pause artwork is not requested on entry');
    video.currentTime = 9;
    context.playVslVideo();
    assert.equal(video.currentTime, 0, 'first click restarts the VSL');
    assert.equal(video.muted, false);
    assert.equal(video.loop, false);
    assert.equal(nodes.vslInitialOverlay.classList.contains('vsl-hidden'), true);
    assert.equal(nodes.vslOverlay.classList.contains('vsl-hidden'), true);
    video.emit('pause'); // A delayed pause from resetting the preview while playback is active.
    assert.equal(retention.loadCount, 0, 'preview reset must not activate the pause artwork');
    video.currentTime = 12;
    video.pause();
    assert.equal(nodes.vslOverlay.classList.contains('vsl-hidden'), false);
    assert.equal(nodes.vslInitialOverlay.classList.contains('vsl-hidden'), true);
    assert.equal(retention.src, mobile ? 'mobile' : 'desktop');
    assert.equal(retention.paused, false);
    context.playVslVideo();
    assert.equal(video.currentTime, 12, 'resume preserves the watch position');
    assert.equal(video.paused, false);
    assert.equal(retention.paused, true);
    assert.equal(nodes.vslOverlay.classList.contains('vsl-hidden'), true);
  });
}
