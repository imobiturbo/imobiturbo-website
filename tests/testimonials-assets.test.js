const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
test('depoimentos mantém as provas legadas e serve todas as imagens pelo próprio site', () => {
 const source = fs.readFileSync(path.join(root,'depoimentos/index.html'),'utf8');
 const images = [...source.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m=>m[1]);
 const legacy=images.filter(p=>p.startsWith('/assets/testimonials/gallery/'));
 assert.equal(new Set(legacy).size,43);
 assert.ok(images.length>46);
 for(const image of images){
  assert.ok(!/^https?:/.test(image),image);
  assert.ok(fs.existsSync(path.resolve(root,image.startsWith('/')?'.'+image:'depoimentos/'+image)),image);
 }
});
