const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const evidence=process.env.EVIDENCE_DIR||'/tmp/depoimentos-evidence';fs.mkdirSync(evidence,{recursive:true});
 const base=process.env.TEST_URL||'http://127.0.0.1:8794';
 for(const width of [320,390,768,1440]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
 await page.goto(base+'/depoimentos/',{waitUntil:'networkidle'});
 assert.equal(await page.locator('[data-video]').count(),20);
 assert.equal(await page.locator('[data-print]').count(),46);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('img').evaluateAll(async imgs=>{await Promise.all(imgs.map(async img=>{img.loading='eager';await img.decode();}));});
 await page.locator('[data-video]').first().click();
 await page.locator('dialog[open] iframe').waitFor();
 assert.match(await page.locator('dialog iframe').getAttribute('src'),/mediadelivery.net/);
 await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
 assert.equal(await page.locator('dialog iframe').count(),0);
 const print=page.locator('[data-print]').first();await print.click();await page.locator('dialog img').evaluate(img=>img.decode());
 await page.locator('.close').click();assert.equal(await print.evaluate(el=>el===document.activeElement),true);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${evidence}/${width}-hero.png`});
 await page.evaluate(()=>scrollTo(0,document.querySelector('#prints').offsetTop));await page.screenshot({path:`${evidence}/${width}-prints.png`});
 await page.close();console.log('PASS',width);
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
