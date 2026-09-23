'use strict';
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../api/pastefy.js'),'utf8');

function load(fetchImpl){
  const sandbox={fetch:fetchImpl,module:{exports:null},exports:{},console};
  vm.runInNewContext(source,sandbox,{filename:'pastefy.js'});
  return sandbox.module.exports;
}
function res(){return{headers:{},statusCode:0,body:null,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;},end(){this.ended=true;return this;}};}

(async()=>{
  let seen=null;
  const handler=load(async(url,options)=>{seen={url,options};return{status:200,text:async()=>JSON.stringify({paste:{id:'abc',raw_url:'https://pastefy.app/abc/raw',title:'Test'}})};});
  const r= res();
  await handler({method:'POST',headers:{},body:{token:'TOKEN',paste:{title:'Test',content:'print(1)',visibility:'UNLISTED',type:'LUA'}}},r);
  if(r.statusCode!==200)throw new Error('unexpected success status');
  if(seen.url!=='https://pastefy.app/api/v2/paste')throw new Error('wrong upstream URL');
  if(seen.options.headers.Authorization!=='Bearer TOKEN')throw new Error('wrong Authorization header');
  const payload=JSON.parse(seen.options.body);
  if(payload.content!=='print(1)'||payload.type!=='LUA')throw new Error('wrong upstream payload');
  console.log('PASS Pastefy proxy forwards documented v2 create-paste request');

  const bad=load(async()=>({status:401,text:async()=>JSON.stringify({error:'Unauthorized'})}));
  const r2=res(); await bad({method:'POST',headers:{},body:{token:'BAD',paste:{content:'x'}}},r2);
  if(r2.statusCode!==401||!r2.body||r2.body.error!=='Unauthorized')throw new Error('upstream errors not preserved');
  console.log('PASS Pastefy proxy preserves upstream API errors');
  console.log('2/2 Pastefy proxy tests passed');
})().catch(e=>{console.error(e);process.exit(1);});
