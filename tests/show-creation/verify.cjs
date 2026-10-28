/* Run with SCENEGEN_TEST_TOOLS pointing to a directory containing esbuild and playwright.
   Uses real components/styles, mocked hooks and HTTP: no emails or production data. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const http = require('node:http');
const root = path.resolve(__dirname, '../..');
function tool(name) { return require(process.env.SCENEGEN_TEST_TOOLS ? path.join(process.env.SCENEGEN_TEST_TOOLS,name) : name); }
const esbuild = tool('esbuild');
const { chromium, webkit } = tool('playwright');
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const loadConfig = require('tailwindcss/loadConfig');
const out = fs.mkdtempSync(path.join(os.tmpdir(),'scenegen-show-ui-'));
const stubs = {
 'next-auth/react': `export const useSession=()=>({data:{}});`,
 '@/store/useProfileStore': `const profile={id:'band-1',name:'Test Band',entityType:new URLSearchParams(location.search).get('role')||'artist'};export const useProfileStore=()=>({activeProfile:profile});`,
 '@/hooks/useShows': `export const useShows=()=>({createShow:async x=>{window.saved=x;return {...x,id:'show-1'}},updateShow:async(id,x)=>{window.saved=x;return {...x,id}},isLoading:false,error:null});`,
 '@/hooks/useTours': `export const useTours=()=>({fetchTours:async()=>[]});`,
 '@/components/search/EntitySearch': `import React from 'react';export default ({onSelect})=><button type="button" onClick={()=>onSelect({id:'promoter-1',name:'Test Promoter'})}>Select test promoter</button>;`,
 '@/components/invites/GenerateInvite': `import React from 'react';export default ({onConfigured})=><button type="button" onClick={()=>onConfigured({email:'promoter@example.test',editScope:'none',financialAccess:'hidden',expiresInDays:7,requireApproval:true})}>Prepare test invite</button>;`,
 '@/components/tours/CreateTourModal': `export const CreateTourModal=()=>null;`,
 './VenueDirectoryAutocomplete': `import React from 'react';export default ({value,onChange,className})=><input className={className} aria-label="Venue search" value={value||''} onChange={e=>onChange?.(e.target.value)}/>;`,
 'sonner': `export const toast={success:()=>{},error:()=>{}};`,
};
async function main(){
 await esbuild.build({entryPoints:[path.join(root,'src/app/api/shows/route.ts')],bundle:true,platform:'node',format:'cjs',outfile:path.join(out,'route.cjs'),plugins:[{name:'route-test',setup(build){
  build.onResolve({filter:/^next\/server$/},()=>({path:require.resolve('next/server'),external:true}));
  build.onResolve({filter:/^@\/lib\/backend$/},()=>({path:'backend',namespace:'route-mock'}));
  build.onLoad({filter:/.*/,namespace:'route-mock'},()=>({contents:"export const getBackendUrl=()=> 'https://backend.example.test'"}));
 }}]});
 const {POST}=require(path.join(out,'route.cjs'));
 const realFetch=global.fetch; const oldLog=console.log;console.log=()=>{};
 try {
  for(const contact of [{},{contactName:'Alex',contactEmail:'alex@example.test',contactPhone:'123'}]){
   let sent;global.fetch=async(url,options)=>{sent=JSON.parse(options.body);return Response.json({show:{id:'test-show',...sent}})};
   const response=await POST(new Request('https://app.example.test/api/shows',{method:'POST',headers:{authorization:'Bearer test','x-entity-id':'band-1','content-type':'application/json'},body:JSON.stringify({showDate:'2026-10-11',showTime:'20:00',venueCity:'London',currency:'GBP',...contact})}));
   assert.equal(response.status,200);assert.equal(sent.entityId,'band-1');assert.equal(sent.promoterName,contact.contactName||null);assert.equal(sent.promoterEmail,contact.contactEmail||null);assert.equal(sent.promoterPhone,contact.contactPhone||null);
  }
 }finally{global.fetch=realFetch;console.log=oldLog}
 console.log('API contact payload tests passed (absent and supplied contact).');
 if(process.argv.includes('--api-only')) return;

 const config=loadConfig(path.join(root,'tailwind.config.ts'));
 config.content=[path.join(root,'src/**/*.{ts,tsx}'),{raw:'<div class="mx-auto max-w-4xl p-4 sm:p-6"></div>'}];
 const css=await postcss([tailwind(config)]).process(fs.readFileSync(path.join(root,'src/app/globals.css'),'utf8'),{from:path.join(root,'src/app/globals.css')});
 fs.writeFileSync(path.join(out,'style.css'),css.css);
 await esbuild.build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import Form from './src/components/shows/CreateShowForm';
 const mode=new URLSearchParams(location.search).get('mode');
 const show={id:'show-1',showDate:'2026-10-11',showTime:'20:00',doorsTime:'19:00',setLength:'45',venueCity:'London',venueState:'London',venueCountry:'United Kingdom',currency:'GBP',dealType:'guarantee'};
 createRoot(document.getElementById('root')).render(<main className="mx-auto max-w-4xl p-4 sm:p-6"><Form show={mode==='edit'?show:undefined} fromCalendarEvent={mode==='calendar'} onSuccess={()=>{window.finished=true}} onCancel={()=>{}}/><section aria-label="Control regression fixtures"><div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:16}}><label>Date<input type="date" value="2026-10-11" readOnly/></label><label>Time<input type="time" defaultValue="20:00"/></label><label>Flight<input type="datetime-local" defaultValue="2026-10-11T20:00"/></label><label>Locked<input type="date" disabled defaultValue="2026-10-11"/></label></div></section></main>);`,resolveDir:root,loader:'tsx'},bundle:true,jsx:'automatic',outfile:path.join(out,'app.js'),plugins:[{name:'fixtures',setup(build){build.onResolve({filter:/.*/},args=>stubs[args.path]?{path:args.path,namespace:'fixture'}:undefined);build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:stubs[args.path],loader:'jsx',resolveDir:root}));}}]});
 fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/app.js"></script>');
 const server=http.createServer((req,res)=>{const file=req.url.split('?')[0];const name=file==='/app.js'?'app.js':file==='/style.css'?'style.css':'index.html';res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(path.join(out,name)));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`;
 let checks=0;
 async function bounds(page){const errors=await page.evaluate(()=>{const out=[];for(const el of document.querySelectorAll('input:not([type=radio]),select,textarea')){const r=el.getBoundingClientRect(),p=el.parentElement.getBoundingClientRect();if(r.width&&r.right>p.right+1)out.push(el.id||el.type);if(r.width&&r.right>innerWidth+1)out.push('viewport:'+el.type)}if(document.documentElement.scrollWidth>innerWidth+1)out.push('page overflow');return out});assert.deepEqual(errors,[]);checks++;}
 async function fill(page){await page.getByLabel('Show Date', {exact:false}).first().fill('2026-10-11');await page.getByLabel('Show Time',{exact:false}).fill('20:00');await page.getByLabel('Doors Time',{exact:false}).fill('19:00');await page.getByLabel('Set Length',{exact:false}).fill('45 minutes');await page.locator('#show-venueCity').fill('London');await page.getByLabel('State',{exact:false}).fill('London');await page.getByLabel('Country',{exact:false}).fill('United Kingdom');await page.getByLabel('Currency',{exact:false}).selectOption('GBP');}
 try {
 for(const [engine,browserType]of [['chromium',chromium],['webkit',webkit]].filter(([name])=>!process.env.SCENEGEN_TEST_ENGINE||name===process.env.SCENEGEN_TEST_ENGINE)){
  const launchOptions={headless:true};
  if(engine==='chromium'&&process.env.SCENEGEN_PACKAGED_CHROMIUM){const {default:packaged}=await import(require('node:url').pathToFileURL(path.join(process.env.SCENEGEN_TEST_TOOLS,'@sparticuz/chromium/build/index.js')).href);launchOptions.executablePath=process.env.SCENEGEN_CHROMIUM_PATH || await packaged.executablePath();launchOptions.args=packaged.args.filter(arg=>arg!=="--single-process");}
  const browser=await browserType.launch(launchOptions);
  try{for(const width of [320,375,390,430,768,1440]){
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768});const page=await context.newPage();
   await page.goto(url);await page.getByRole('button',{name:'We’re promoting this show ourselves'}).click();await fill(page);await bounds(page);
   if(width===390)await page.screenshot({path:path.join(out,engine+'-self-promoted.png'),fullPage:true});
   const style=await page.locator('#show-showDate').evaluate(el=>({bg:getComputedStyle(el).backgroundColor,disabled:el.disabled}));assert.equal(style.bg,'rgb(255, 255, 255)');assert.equal(style.disabled,false);checks++;
   await page.getByRole('button',{name:'Create Show',exact:true}).click();await page.waitForFunction(()=>window.finished);const saved=await page.evaluate(()=>window.saved);assert.equal(saved.artistEntityId,'band-1');assert.equal(saved.promoterEntityId,undefined);assert.equal(saved.contactEmail,'');checks++;
   await context.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(url);await page.getByRole('button',{name:'Invite New',exact:false}).click();await page.getByRole('button',{name:'Prepare test invite'}).click();await page.getByRole('button',{name:'Change promoter access'}).click();await page.getByRole('button',{name:'We’re promoting this show ourselves'}).click();await fill(page);
  // Door split must keep its required currency selector available.
  await page.locator('select').filter({has:page.locator('option[value="door_split"]')}).selectOption('door_split');await page.getByLabel('Currency',{exact:false}).selectOption('EUR');
  let invitations=0;await page.route('**/api/day-sheet-collaborators/invite',route=>{invitations++;return route.fulfill({json:{inviteUrl:'test'}})});
  await page.getByRole('button',{name:'Create Show',exact:true}).click();await page.waitForFunction(()=>window.finished);assert.equal(invitations,0);assert.equal(await page.evaluate(()=>window.saved.currency),'EUR');checks++;
  await page.goto(url);await page.getByRole('button',{name:'Search Existing',exact:false}).click();await page.getByRole('button',{name:'Select test promoter'}).click();await fill(page);
  await page.locator('#show-contactName').fill('Alex');await page.locator('#show-contactPhone').fill('123');await page.locator('#show-contactEmail').fill('alex@example.test');await page.getByRole('button',{name:'Create Show',exact:true}).click();await page.waitForFunction(()=>window.finished);assert.equal(await page.evaluate(()=>window.saved.promoterEntityId),'promoter-1');checks++;
  await page.goto(url+'?role=promoter');assert.equal(await page.getByRole('button',{name:'We’re promoting this show ourselves'}).count(),0);checks++;
  await page.goto(url+'?mode=edit');await bounds(page);assert.equal(await page.getByRole('button',{name:'Update Show',exact:true}).count(),1);checks++;
  await page.goto(url+'?mode=calendar');assert.equal(await page.locator('#show-contactEmail').getAttribute('required'),null);await bounds(page);checks++;
  await page.screenshot({path:path.join(out,engine+'-calendar.png'),fullPage:true});await page.close();console.log(engine+' checks passed');
  }finally{await browser.close()}
 }
 }finally{await new Promise(r=>server.close(r))}
 console.log(`${checks} browser assertions passed. Screenshots and compiled fixtures: ${out}`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
