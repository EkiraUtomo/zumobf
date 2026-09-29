// ZumHub Obfuscator v9 — Source-Transform Architecture
// No VM. Real Luau. Executor-compatible.
// --DoggoJr Is Here

'use strict';

const IDS=['l','I','1','O','0'];
const _uid=new Set();
function rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function id(n){
  n=n||rnd(8,14);
  let s,t=0;
  do{s='_';for(let i=0;i<n;i++)s+=IDS[rnd(0,4)];t++;}
  while(_uid.has(s)&&t<2000);
  _uid.add(s);return s;
}
function resetIds(){_uid.clear();}

function luaStr(s){
  const bytes=[];
  for(let i=0;i<s.length;i++){
    const cp=s.charCodeAt(i);
    if(cp<=0x7F)bytes.push(cp);
    else if(cp<=0x7FF){bytes.push(0xC0|(cp>>6));bytes.push(0x80|(cp&0x3F));}
    else{bytes.push(0xE0|(cp>>12));bytes.push(0x80|((cp>>6)&0x3F));bytes.push(0x80|(cp&0x3F));}
  }
  let out='"';
  for(const b of bytes){
    if(b===34)out+='\\"';
    else if(b===92)out+='\\\\';
    else if(b===10)out+='\\n';
    else if(b===13)out+='\\r';
    else if(b===0)out+='\\0';
    else if(b<32||b>126)out+='\\'+b;
    else out+=String.fromCharCode(b);
  }
  return out+'"';
}

// ── Tokenizer ─────────────────────────────────────────────────────────────
const KW=new Set(['and','break','do','else','elseif','end','false','for',
  'function','if','in','local','nil','not','or','repeat','return','then',
  'true','until','while','continue','type','goto']);

function tokenize(src){
  const toks=[];let i=0;
  const len=src.length;
  while(i<len){
    if(/\s/.test(src[i])){i++;continue;}
    // comments
    if(src[i]==='-'&&src[i+1]==='-'){
      if(src[i+2]==='['){
        let eq=0,j=i+3;while(src[j]==='='){eq++;j++;}
        if(src[j]==='['){
          i=j+1;const cl=']'+'='.repeat(eq)+']';
          const e=src.indexOf(cl,i);i=e<0?len:e+cl.length;continue;
        }
      }
      while(i<len&&src[i]!=='\n')i++;continue;
    }
    // long strings
    if(src[i]==='['&&(src[i+1]==='['||src[i+1]==='=')){
      let eq=0,j=i+1;while(src[j]==='='){eq++;j++;}
      if(src[j]==='['){
        i=j+1;const cl=']'+'='.repeat(eq)+']';
        const e=src.indexOf(cl,i);
        const v=e<0?src.slice(i):src.slice(i,e);
        toks.push({t:'STR',v:v.replace(/^\n/,'')});
        i=e<0?len:e+cl.length;continue;
      }
    }
    // quoted strings
    if(src[i]==='"'||src[i]==="'"){
      const q=src[i++];let s='';
      while(i<len&&src[i]!==q){
        if(src[i]==='\\'){i++;
          const e=src[i++];
          if(e==='n')s+='\n';else if(e==='t')s+='\t';else if(e==='r')s+='\r';
          else if(e==='0')s+='\0';else if(e==='\\')s+='\\';else if(e==='"')s+='"';
          else if(e==="'")s+="'";else if(e==='z'){while(i<len&&/\s/.test(src[i]))i++;}
          else if(/\d/.test(e)){let n=e;while(/\d/.test(src[i])&&n.length<3)n+=src[i++];s+=String.fromCharCode(parseInt(n));}
          else if(e==='x'){const h=src[i++]+src[i++];s+=String.fromCharCode(parseInt(h,16));}
          else if(e==='u'){i++;let h='';while(src[i]!=='}')h+=src[i++];i++;s+=String.fromCodePoint(parseInt(h,16));}
          else s+=e;
        }else s+=src[i++];
      }
      i++;toks.push({t:'STR',v:s});continue;
    }
    // numbers
    if(/\d/.test(src[i])||(src[i]==='.'&&/\d/.test(src[i+1]))){
      let n='';
      if(src[i]==='0'&&/[xX]/.test(src[i+1])){
        n+=src[i++]+src[i++];while(/[0-9a-fA-F_]/.test(src[i]))n+=src[i++];
      }else{
        while(/[\d_]/.test(src[i]))n+=src[i++];
        if(src[i]==='.'&&src[i+1]!=='.'){n+=src[i++];while(/[\d_]/.test(src[i]))n+=src[i++];}
        if(/[eE]/.test(src[i])){n+=src[i++];if(/[+-]/.test(src[i]))n+=src[i++];while(/\d/.test(src[i]))n+=src[i++];}
      }
      toks.push({t:'NUM',v:n.replace(/_/g,'')});continue;
    }
    // identifiers / keywords
    if(/[a-zA-Z_]/.test(src[i])){
      let n='';while(i<len&&/\w/.test(src[i]))n+=src[i++];
      toks.push({t:KW.has(n)?n:'NAME',v:n});continue;
    }
    // multi-char ops
    const two=src.slice(i,i+2);
    const three=src.slice(i,i+3);
    if(three==='...'){toks.push({t:'...',v:'...'});i+=3;continue;}
    if(three==='..='){toks.push({t:'..=',v:'..='});i+=3;continue;}
    if(two==='..'){toks.push({t:'..',v:'..'});i+=2;continue;}
    if(two==='=='){toks.push({t:'==',v:'=='});i+=2;continue;}
    if(two==='~='){toks.push({t:'~=',v:'~='});i+=2;continue;}
    if(two==='<='){toks.push({t:'<=',v:'<='});i+=2;continue;}
    if(two==='>='){toks.push({t:'>=',v:'>='});i+=2;continue;}
    if(two==='<<'){toks.push({t:'<<',v:'<<'});i+=2;continue;}
    if(two==='>>'){toks.push({t:'>>',v:'>>'});i+=2;continue;}
    if(two==='->'){toks.push({t:'->',v:'->'});i+=2;continue;}
    if(two==='::'){toks.push({t:'::',v:'::'});i+=2;continue;}
    if(two==='//'){toks.push({t:'//',v:'//'});i+=2;continue;}
    if(two==='+='){toks.push({t:'+=',v:'+='});i+=2;continue;}
    if(two==='-='){toks.push({t:'-=',v:'-='});i+=2;continue;}
    if(two==='*='){toks.push({t:'*=',v:'*='});i+=2;continue;}
    if(two==='/='){toks.push({t:'/=',v:'/='});i+=2;continue;}
    if(two==='%='){toks.push({t:'%=',v:'%='});i+=2;continue;}
    toks.push({t:src[i],v:src[i]});i++;
  }
  toks.push({t:'EOF',v:''});
  return toks;
}

// ── Parser ─────────────────────────────────────────────────────────────────
function parse(src){
  const toks=tokenize(src);
  let pos=0;
  const len=toks.length;
  function peek(off=0){return toks[Math.min(pos+(off|0),len-1)];}
  function next(){const t=toks[Math.min(pos,len-1)];pos++;return t;}
  function eat(t){const tk=next();if(tk.t!==t)throw new Error('Expected '+t+', got '+tk.t+' ('+tk.v+') at '+pos);return tk;}
  function check(t){return peek().t===t;}
  function match(...ts){if(ts.includes(peek().t)){return next();}return null;}

  const BLOCK_STOP=new Set(['else','elseif','end','until','EOF']);

  function parseBlock(){
    const body=[];
    while(!BLOCK_STOP.has(peek().t)){
      while(check(';'))next();
      if(BLOCK_STOP.has(peek().t))break;
      const s=parseStat();
      if(s){body.push(s);if(s.t==='return')break;}
    }
    return {t:'block',body};
  }

  function parseStat(){
    const tk=peek();
    if(tk.t==='local'){
      next();
      if(check('function')){next();const name=eat('NAME').v;const fn=parseFuncBody(false);return {t:'localfunc',name,fn};}
      // type alias: 'local type X = ...' skip
      if(check('type')&&peek(1).t==='NAME'&&peek(2).t==='='){next();next();next();skipTypeExpr();return null;}
      const names=[eat('NAME').v];skipOptType();
      while(match(',')){names.push(eat('NAME').v);skipOptType();}
      let vals=[];if(match('=')){vals.push(parseExpr());while(match(','))vals.push(parseExpr());}
      return {t:'local',names,vals};
    }
    if(tk.t==='type'&&peek(1).t==='NAME'&&peek(2).t==='='){next();next();next();skipTypeExpr();return null;}
    if(tk.t==='function'){
      next();let chain=[eat('NAME').v];let method=false;
      while(check('.'))next(),chain.push(eat('NAME').v);
      if(check(':'))next(),chain.push(eat('NAME').v),method=true;
      return {t:'funcstat',chain,method,fn:parseFuncBody(method)};
    }
    if(tk.t==='if'){next();return parseIf();}
    if(tk.t==='while'){next();const cond=parseExpr();eat('do');const body=parseBlock();eat('end');return {t:'while',cond,body};}
    if(tk.t==='repeat'){next();const body=parseBlock();eat('until');const cond=parseExpr();return {t:'repeat',body,cond};}
    if(tk.t==='do'){next();const body=parseBlock();eat('end');return {t:'do',body};}
    if(tk.t==='for'){next();return parseFor();}
    if(tk.t==='return'){
      next();const vals=[];
      const RS=new Set(['end','else','elseif','until','EOF',';']);
      if(!RS.has(peek().t)){vals.push(parseExpr());while(match(','))vals.push(parseExpr());}
      match(';');return {t:'return',vals};
    }
    if(tk.t==='break'){next();return {t:'break'};}
    if(tk.t==='continue'){next();return {t:'continue'};}
    if(tk.t==='::'){next();const lbl=eat('NAME').v;eat('::');return {t:'label',name:lbl};}
    if(tk.t==='goto'){next();return {t:'goto',name:eat('NAME').v};}
    return parseExprStat();
  }

  function parseIf(){
    const cond=parseExpr();eat('then');const body=parseBlock();
    const elseifs=[];
    while(check('elseif')){next();const c=parseExpr();eat('then');const b=parseBlock();elseifs.push({cond:c,body:b});}
    let els=null;if(match('else'))els=parseBlock();
    eat('end');return {t:'if',cond,body,elseifs,els};
  }

  function parseFor(){
    const name=eat('NAME').v;skipOptType();
    if(match('=')){
      const start=parseExpr();eat(',');const limit=parseExpr();
      let step=null;if(match(','))step=parseExpr();
      eat('do');const body=parseBlock();eat('end');
      return {t:'fornum',name,start,limit,step,body};
    }
    // generic for: collect all names before 'in'
    const names=[name];skipOptType();
    while(check(',')&&peek(1).t!=='in'){next();names.push(eat('NAME').v);skipOptType();}
    if(check(','))next(); // trailing comma
    eat('in');
    const iters=[parseExpr()];while(match(','))iters.push(parseExpr());
    eat('do');const body=parseBlock();eat('end');
    return {t:'forgen',names,iters,body};
  }

  function skipOptType(){
    if(check(':')&&peek(1).t!=='::')next(),skipTypeExpr();
  }

  function skipTypeExpr(){
    let depth=0;
    const STMT_KW=new Set(['local','function','if','while','for','repeat','do',
      'return','break','continue','end','else','elseif','until','then','EOF']);
    while(true){
      const t=peek().t;
      if(t==='EOF')break;
      if(t==='{'||t==='('||t==='<'){depth++;next();continue;}
      if(t==='}'||t===')'||t==='>'){if(depth<=0)break;depth--;next();continue;}
      if(depth===0){
        if(STMT_KW.has(t))break;
        const STOP2=new Set(['=','then','do',')','EOF','end','else','elseif',
          'until','==','~=','{','[','::']);
        if(STOP2.has(t))break;
      }
      next();
    }
  }

  function parseFuncBody(isMethod){
    eat('(');const params=[];let vararg=false;
    if(isMethod)params.push('self');
    if(!check(')')){
      if(check('...')){next();vararg=true;}
      else{
        params.push(eat('NAME').v);skipOptType();
        while(match(',')&&!check('...')){
          if(check('...')){next();vararg=true;break;}
          params.push(eat('NAME').v);skipOptType();
        }
        if(check(',')&&check('...')){next();next();vararg=true;}
      }
    }
    eat(')');
    // skip return type
    if(check('->'))next(),skipTypeExpr();
    else if(check(':')&&peek(1).t!=='::')next(),skipTypeExpr();
    const body=parseBlock();eat('end');
    return {t:'func',params,vararg,body};
  }

  function parseExprStat(){
    const expr=parseSuffixed();
    const ASSIGNS=new Set(['=','+=','-=','*=','/=','%=','..=']);
    if(ASSIGNS.has(peek().t)||check(',')){
      const targets=[expr];
      while(match(','))targets.push(parseSuffixed());
      const op=next().t;
      const vals=[parseExpr()];while(match(','))vals.push(parseExpr());
      return {t:'assign',op,targets,vals};
    }
    if(expr.t!=='call'&&expr.t!=='methodcall')throw new Error('Expected call or assign, got '+expr.t);
    return {t:'callstat',expr};
  }

  function parseExpr(){return parseOr();}
  function parseOr(){
    let l=parseAnd();
    while(check('or')){const op=next().t;l={t:'binop',op,left:l,right:parseAnd()};}
    return l;
  }
  function parseAnd(){
    let l=parseCmp();
    while(check('and')){const op=next().t;l={t:'binop',op,left:l,right:parseCmp()};}
    return l;
  }
  function parseCmp(){
    let l=parseBor();
    while(['<','>','<=','>=','==','~='].includes(peek().t)){const op=next().t;l={t:'binop',op,left:l,right:parseBor()};}
    return l;
  }
  function parseBor(){
    let l=parseBxor();
    while(check('|')){next();l={t:'binop',op:'|',left:l,right:parseBxor()};}
    return l;
  }
  function parseBxor(){
    let l=parseBand();
    while(check('~')&&peek(1).t!=='='){next();l={t:'binop',op:'~',left:l,right:parseBand()};}
    return l;
  }
  function parseBand(){
    let l=parseShl();
    while(check('&')){next();l={t:'binop',op:'&',left:l,right:parseShl()};}
    return l;
  }
  function parseShl(){
    let l=parseConcat();
    while(['<<','>>'].includes(peek().t)){const op=next().t;l={t:'binop',op,left:l,right:parseConcat()};}
    return l;
  }
  function parseConcat(){
    const l=parseAdd();
    if(check('..')){next();return {t:'binop',op:'..',left:l,right:parseConcat()};}
    return l;
  }
  function parseAdd(){
    let l=parseMul();
    while(['+','-'].includes(peek().t)){const op=next().t;l={t:'binop',op,left:l,right:parseMul()};}
    return l;
  }
  function parseMul(){
    let l=parseUnary();
    while(['*','/','//','%'].includes(peek().t)){const op=next().t;l={t:'binop',op,left:l,right:parseUnary()};}
    return l;
  }
  function parseUnary(){
    if(check('not')){next();return {t:'unop',op:'not',operand:parseUnary()};}
    if(check('#')){next();return {t:'unop',op:'#',operand:parseUnary()};}
    if(check('-')&&peek(1).t!=='->'){next();return {t:'unop',op:'-',operand:parseUnary()};}
    if(check('~')&&peek(1).t!=='='){next();return {t:'unop',op:'~',operand:parseUnary()};}
    return parsePow();
  }
  function parsePow(){
    const b=parseSuffixed();
    if(check('^')){next();return {t:'binop',op:'^',left:b,right:parseUnary()};}
    return b;
  }

  function parseSuffixed(){
    let e=parsePrimary();
    while(true){
      if(check('.')&&peek(1).t==='NAME'){next();e={t:'field',obj:e,field:next().v};}
      else if(check('[')&&peek(1).t!=='['){next();const k=parseExpr();eat(']');e={t:'index',obj:e,key:k};}
      else if(check(':')&&peek(1).t==='NAME'&&peek(2).t!=='='){
        next();const m=next().v;const args=parseArgs();e={t:'methodcall',obj:e,method:m,args};
      }
      else if(check('(')||check('{')||check('STR')){
        e={t:'call',fn:e,args:parseArgs()};
      }
      else break;
    }
    return e;
  }

  function parseArgs(){
    if(check('(')){
      next();const args=[];
      if(!check(')')){args.push(parseExpr());while(match(','))args.push(parseExpr());}
      eat(')');return args;
    }
    if(check('{')){return [parseTable()];}
    if(check('STR')){return [{t:'str',v:next().v}];}
    throw new Error('Expected args');
  }

  function parsePrimary(){
    const tk=peek();
    if(tk.t==='NAME'){next();return {t:'name',v:tk.v};}
    if(tk.t==='('){next();const e=parseExpr();eat(')');return {t:'paren',expr:e};}
    // literals
    if(tk.t==='NUM'){next();return {t:'num',v:tk.v};}
    if(tk.t==='STR'){next();return {t:'str',v:tk.v};}
    if(tk.t==='true'){next();return {t:'bool',v:true};}
    if(tk.t==='false'){next();return {t:'bool',v:false};}
    if(tk.t==='nil'){next();return {t:'nil'};}
    if(tk.t==='...'){next();return {t:'vararg'};}
    if(tk.t==='function'){next();return parseFuncBody(false);}
    if(tk.t==='{'){return parseTable();}
    throw new Error('Unexpected token: '+tk.t+' ('+tk.v+') at pos '+pos);
  }

  function parseTable(){
    eat('{');const fields=[];
    while(!check('}')){
      if(check('[')&&peek(1).t!=='['){
        next();const key=parseExpr();eat(']');eat('=');const val=parseExpr();
        fields.push({t:'ifield',key,val});
      }else if(check('NAME')&&peek(1).t==='='){
        const k=next().v;next();const val=parseExpr();fields.push({t:'nfield',key:k,val});
      }else{
        fields.push({t:'vfield',val:parseExpr()});
      }
      if(!match(',')&&!match(';'))break;
    }
    eat('}');return {t:'table',fields};
  }

  return parseBlock();
}

// ── Emitter ───────────────────────────────────────────────────────────────
function emitBlock(block,ind){
  return block.body.filter(Boolean).map(s=>emitStat(s,ind)).join('\n');
}

function emitStat(node,ind){
  const I='  '.repeat(ind);
  const I1='  '.repeat(ind+1);
  switch(node.t){
    case 'local':{
      let s=I+'local '+node.names.join(', ');
      if(node.vals.length)s+=' = '+node.vals.map(v=>emitE(v,ind)).join(', ');
      return s;
    }
    case 'localfunc':return I+'local function '+node.name+emitFn(node.fn,ind);
    case 'funcstat':{
      const chain=node.chain;
      const name=node.method?chain.slice(0,-1).join('.')+':'+chain[chain.length-1]:chain.join('.');
      return I+'function '+name+emitFn(node.fn,ind);
    }
    case 'assign':{
      const OMAP={'+=':'+=','-=':'-=','*=':'*=','/=':'/=','%=':'%=','..=':'..='};
      return I+node.targets.map(t=>emitE(t,ind)).join(', ')+' '+(OMAP[node.op]||'=')+' '+node.vals.map(v=>emitE(v,ind)).join(', ');
    }
    case 'callstat':return I+emitE(node.expr,ind);
    case 'if':{
      let s=I+'if '+emitE(node.cond,ind)+' then\n'+emitBlock(node.body,ind+1);
      for(const ei of node.elseifs)s+='\n'+I+'elseif '+emitE(ei.cond,ind)+' then\n'+emitBlock(ei.body,ind+1);
      if(node.els)s+='\n'+I+'else\n'+emitBlock(node.els,ind+1);
      return s+'\n'+I+'end';
    }
    case 'while':return I+'while '+emitE(node.cond,ind)+' do\n'+emitBlock(node.body,ind+1)+'\n'+I+'end';
    case 'repeat':return I+'repeat\n'+emitBlock(node.body,ind+1)+'\n'+I+'until '+emitE(node.cond,ind);
    case 'do':return I+'do\n'+emitBlock(node.body,ind+1)+'\n'+I+'end';
    case 'fornum':{
      let s=I+'for '+node.name+' = '+emitE(node.start,ind)+', '+emitE(node.limit,ind);
      if(node.step)s+=', '+emitE(node.step,ind);
      return s+' do\n'+emitBlock(node.body,ind+1)+'\n'+I+'end';
    }
    case 'forgen':return I+'for '+node.names.join(', ')+' in '+node.iters.map(v=>emitE(v,ind)).join(', ')+' do\n'+emitBlock(node.body,ind+1)+'\n'+I+'end';
    case 'return':return I+'return'+(node.vals.length?' '+node.vals.map(v=>emitE(v,ind)).join(', '):'');
    case 'break':return I+'break';
    case 'continue':return I+'continue';
    case 'label':return I+'::'+node.name+'::';
    case 'goto':return I+'goto '+node.name;
    default:return I+'-- unknown '+node.t;
  }
}

function emitFn(fn,ind){
  const p=fn.vararg?[...fn.params,'...']:fn.params;
  return '('+p.join(', ')+')\n'+emitBlock(fn.body,ind+1)+'\n'+'  '.repeat(ind)+'end';
}

function emitE(node,ind){
  if(!node)return 'nil';
  switch(node.t){
    case 'num':return node.v;
    case 'str':return luaStr(node.v);
    case 'bool':return node.v?'true':'false';
    case 'nil':return 'nil';
    case 'vararg':return '...';
    case 'name':return node.v;
    case 'rawexpr':return node.v; // pre-rendered expression
    case 'paren':return '('+emitE(node.expr,ind)+')';
    case 'binop':{
      const L=emitE(node.left,ind);const R=emitE(node.right,ind);
      const op=node.op;
      // wrap sub-expressions if needed to preserve precedence
      return L+' '+op+' '+R;
    }
    case 'unop':{
      const op=node.op;const sep=(op==='not'||op==='#')?' ':'';
      return op+sep+emitE(node.operand,ind);
    }
    case 'field':return emitE(node.obj,ind)+'.'+node.field;
    case 'index':return emitE(node.obj,ind)+'['+emitE(node.key,ind)+']';
    case 'call':return emitE(node.fn,ind)+'('+node.args.map(a=>emitE(a,ind)).join(', ')+')';
    case 'methodcall':return emitE(node.obj,ind)+':'+node.method+'('+node.args.map(a=>emitE(a,ind)).join(', ')+')';
    case 'func':return 'function'+emitFn(node,ind);
    case 'table':{
      if(!node.fields.length)return '{}';
      const items=node.fields.map(f=>{
        if(f.t==='ifield')return '['+emitE(f.key,ind)+']='+emitE(f.val,ind);
        if(f.t==='nfield')return f.key+'='+emitE(f.val,ind);
        return emitE(f.val,ind);
      });
      return '{'+items.join(', ')+'}';
    }
    default:return '-- unknown expr '+node.t;
  }
}

// ── Pass 1: Rename ────────────────────────────────────────────────────────
function passRename(ast){
  function scope(parent=null){return {vars:{},parent};}
  function decl(sc,name){if(!sc.vars[name])sc.vars[name]=id();return sc.vars[name];}
  function resolve(sc,name){let s=sc;while(s){if(s.vars[name])return s.vars[name];s=s.parent;}return name;}

  function block(blk,sc){
    // hoist declarations
    for(const s of blk.body){
      if(!s)continue;
      if(s.t==='local')for(const n of s.names)decl(sc,n);
      if(s.t==='localfunc')decl(sc,s.name);
    }
    for(const s of blk.body)if(s)stat(s,sc);
  }

  function stat(node,sc){
    if(!node)return;
    switch(node.t){
      case 'local':
        node.vals=node.vals.map(v=>expr(v,sc));
        node.names=node.names.map(n=>sc.vars[n]||n);
        break;
      case 'localfunc':
        node.name=sc.vars[node.name]||node.name;
        node.fn=fnbody(node.fn,sc);break;
      case 'funcstat':node.fn=fnbody(node.fn,sc);break;
      case 'assign':
        node.targets=node.targets.map(t=>expr(t,sc));
        node.vals=node.vals.map(v=>expr(v,sc));break;
      case 'callstat':node.expr=expr(node.expr,sc);break;
      case 'if':
        node.cond=expr(node.cond,sc);block(node.body,scope(sc));
        for(const ei of node.elseifs){ei.cond=expr(ei.cond,sc);block(ei.body,scope(sc));}
        if(node.els)block(node.els,scope(sc));break;
      case 'while':node.cond=expr(node.cond,sc);block(node.body,scope(sc));break;
      case 'repeat':{const bs=scope(sc);block(node.body,bs);node.cond=expr(node.cond,bs);break;}
      case 'do':block(node.body,scope(sc));break;
      case 'fornum':{
        node.start=expr(node.start,sc);node.limit=expr(node.limit,sc);
        if(node.step)node.step=expr(node.step,sc);
        const bs=scope(sc);decl(bs,node.name);node.name=bs.vars[node.name];
        block(node.body,bs);break;
      }
      case 'forgen':{
        node.iters=node.iters.map(v=>expr(v,sc));
        const bs=scope(sc);
        node.names=node.names.map(n=>{decl(bs,n);return bs.vars[n]||n;});
        block(node.body,bs);break;
      }
      case 'return':node.vals=node.vals.map(v=>expr(v,sc));break;
    }
  }

  function expr(node,sc){
    if(!node)return node;
    switch(node.t){
      case 'name':return {t:'name',v:resolve(sc,node.v)};
      case 'binop':return {...node,left:expr(node.left,sc),right:expr(node.right,sc)};
      case 'unop':return {...node,operand:expr(node.operand,sc)};
      case 'paren':return {t:'paren',expr:expr(node.expr,sc)};
      case 'field':return {t:'field',obj:expr(node.obj,sc),field:node.field};
      case 'index':return {t:'index',obj:expr(node.obj,sc),key:expr(node.key,sc)};
      case 'call':return {t:'call',fn:expr(node.fn,sc),args:node.args.map(a=>expr(a,sc))};
      case 'methodcall':return {t:'methodcall',obj:expr(node.obj,sc),method:node.method,args:node.args.map(a=>expr(a,sc))};
      case 'func':return fnbody(node,sc);
      case 'table':
        node.fields=node.fields.map(f=>{
          if(f.t==='ifield')return {...f,key:expr(f.key,sc),val:expr(f.val,sc)};
          if(f.t==='nfield')return {...f,val:expr(f.val,sc)};
          return {t:'vfield',val:expr(f.val,sc)};
        });return node;
      default:return node;
    }
  }

  function fnbody(fn,sc){
    const inner=scope(sc);
    for(const p of fn.params)decl(inner,p);
    const newFn={...fn,params:fn.params.map(p=>inner.vars[p]||p)};
    const newBody=JSON.parse(JSON.stringify(fn.body));
    newFn.body=newBody;block(newFn.body,inner);
    return newFn;
  }

  block(ast,scope());
  return ast;
}

// ── Pass 2: String encryption ─────────────────────────────────────────────
function passStrings(ast){
  const KEY=rnd(3,250);
  const dFn=id(10);
  const kV=id(4),sV=id(3),rV=id(3),iV=id(3);

  function encStr(s){
    const bytes=[];
    for(let i=0;i<s.length;i++){
      const cp=s.charCodeAt(i);
      if(cp<=0x7F)bytes.push(cp);
      else if(cp<=0x7FF){bytes.push(0xC0|(cp>>6));bytes.push(0x80|(cp&0x3F));}
      else{bytes.push(0xE0|(cp>>12));bytes.push(0x80|((cp>>6)&0x3F));bytes.push(0x80|(cp&0x3F));}
    }
    let out='"';
    for(const b of bytes)out+='\\'+((b^KEY)&0xFF);
    return out+'"';
  }

  const decSrc='local '+dFn+'=(function()\nlocal '+kV+'='+KEY+'\nreturn function('+sV+')\n'+
    'local '+rV+'={}\nfor '+iV+'=1,#'+sV+' do\n'+
    rV+'['+iV+']=string.char(bit32.bxor(string.byte('+sV+','+iV+'),'+kV+'))\n'+
    'end\nreturn table.concat('+rV+')\nend\nend)()';

  function walkBlock(blk){blk.body=blk.body.filter(Boolean).map(walkStat);}
  function walkStat(n){
    if(!n)return n;
    switch(n.t){
      case 'local':n.vals=n.vals.map(walkExpr);break;
      case 'localfunc':walkBlock(n.fn.body);break;
      case 'funcstat':walkBlock(n.fn.body);break;
      case 'assign':n.targets=n.targets.map(walkExpr);n.vals=n.vals.map(walkExpr);break;
      case 'callstat':n.expr=walkExpr(n.expr);break;
      case 'if':n.cond=walkExpr(n.cond);walkBlock(n.body);
        n.elseifs.forEach(e=>{e.cond=walkExpr(e.cond);walkBlock(e.body);});
        if(n.els)walkBlock(n.els);break;
      case 'while':n.cond=walkExpr(n.cond);walkBlock(n.body);break;
      case 'repeat':walkBlock(n.body);n.cond=walkExpr(n.cond);break;
      case 'do':walkBlock(n.body);break;
      case 'fornum':n.start=walkExpr(n.start);n.limit=walkExpr(n.limit);
        if(n.step)n.step=walkExpr(n.step);walkBlock(n.body);break;
      case 'forgen':n.iters=n.iters.map(walkExpr);walkBlock(n.body);break;
      case 'return':n.vals=n.vals.map(walkExpr);break;
    }
    return n;
  }
  function walkExpr(n){
    if(!n)return n;
    switch(n.t){
      case 'str':return {t:'rawexpr',v:dFn+'('+encStr(n.v)+')'};
      case 'binop':return {...n,left:walkExpr(n.left),right:walkExpr(n.right)};
      case 'unop':return {...n,operand:walkExpr(n.operand)};
      case 'paren':return {t:'paren',expr:walkExpr(n.expr)};
      case 'field':return {...n,obj:walkExpr(n.obj)};
      case 'index':return {...n,obj:walkExpr(n.obj),key:walkExpr(n.key)};
      case 'call':return {...n,fn:walkExpr(n.fn),args:n.args.map(walkExpr)};
      case 'methodcall':return {...n,obj:walkExpr(n.obj),args:n.args.map(walkExpr)};
      case 'func':walkBlock(n.body);return n;
      case 'table':n.fields=n.fields.map(f=>{
        if(f.t==='ifield')return {...f,key:walkExpr(f.key),val:walkExpr(f.val)};
        if(f.t==='nfield')return {...f,val:walkExpr(f.val)};
        return {...f,val:walkExpr(f.val)};
      });return n;
      default:return n;
    }
  }

  walkBlock(ast);
  return {ast,decSrc,dFn};
}

// ── Pass 3: Number obfuscation ────────────────────────────────────────────
function passNumbers(ast){
  function obf(v){
    const n=Number(v);
    if(!Number.isFinite(n)||n!==Math.floor(n)||Math.abs(n)>0xFFFFFF)return null;
    const u=n>>>0;const k=rnd(1,0xFFFF);
    return 'bit32.bxor('+(u^k)+','+k+')';
  }
  function wb(blk){blk.body=blk.body.filter(Boolean).map(ws);}
  function ws(n){
    if(!n)return n;
    switch(n.t){
      case 'local':n.vals=n.vals.map(we);break;
      case 'localfunc':wb(n.fn.body);break;
      case 'funcstat':wb(n.fn.body);break;
      case 'assign':n.vals=n.vals.map(we);break;
      case 'callstat':n.expr=we(n.expr);break;
      case 'if':n.cond=we(n.cond);wb(n.body);n.elseifs.forEach(e=>{e.cond=we(e.cond);wb(e.body);});if(n.els)wb(n.els);break;
      case 'while':n.cond=we(n.cond);wb(n.body);break;
      case 'repeat':wb(n.body);n.cond=we(n.cond);break;
      case 'do':wb(n.body);break;
      case 'fornum':n.start=we(n.start);n.limit=we(n.limit);if(n.step)n.step=we(n.step);wb(n.body);break;
      case 'forgen':n.iters=n.iters.map(we);wb(n.body);break;
      case 'return':n.vals=n.vals.map(we);break;
    }
    return n;
  }
  function we(n){
    if(!n)return n;
    switch(n.t){
      case 'num':{if(Math.random()<0.55){const o=obf(n.v);if(o)return {t:'rawexpr',v:o};}return n;}
      case 'binop':return {...n,left:we(n.left),right:we(n.right)};
      case 'unop':return {...n,operand:we(n.operand)};
      case 'paren':return {t:'paren',expr:we(n.expr)};
      case 'field':return {...n,obj:we(n.obj)};
      case 'index':return {...n,obj:we(n.obj),key:we(n.key)};
      case 'call':return {...n,fn:we(n.fn),args:n.args.map(we)};
      case 'methodcall':return {...n,obj:we(n.obj),args:n.args.map(we)};
      case 'func':wb(n.body);return n;
      case 'table':n.fields=n.fields.map(f=>({...f,val:we(f.val)}));return n;
      default:return n;
    }
  }
  wb(ast);
}

// ── Pass 4-6: Source-level transforms ────────────────────────────────────
function isSafeLine(line,nextLine){
  const t=line.trim(),nx=(nextLine||'').trim();
  return t.length>3&&!t.startsWith('--')
    &&!/\bthen\b/.test(t)
    &&!/\bdo\s*$/.test(t)
    &&!/^(else|elseif|end|until)/.test(t)
    &&!/^(elseif|else|end|until)/.test(nx);
}

function passDeadCode(code){
  const preds=[
    ()=>'if ('+rnd(1,9)+'>999) then local '+id(4)+'='+rnd(0,9)+' end',
    ()=>'if (bit32.band(0,1)==1) then local '+id(4)+'=nil end',
    ()=>'if (type(nil)=="number") then local '+id(4)+'=false end',
    ()=>'if (rawequal(1,2)) then local '+id(4)+'="" end',
    ()=>'if (select("#")<-1) then local '+id(4)+'={} end',
  ];
  const lines=code.split('\n');const out=[];
  for(let i=0;i<lines.length;i++){
    out.push(lines[i]);
    if(isSafeLine(lines[i],lines[i+1])&&Math.random()<0.12){
      const ind=lines[i].match(/^(\s*)/)[1];
      out.push(ind+preds[rnd(0,preds.length-1)]());
    }
  }
  return out.join('\n');
}

function passJunk(code){
  const ops=[
    ()=>'local '+id(5)+'=tostring('+rnd(1,999)+')',
    ()=>'local '+id(5)+'=type({})==\"table\"',
    ()=>'local '+id(5)+'=bit32.bxor('+rnd(1,15)+','+rnd(1,15)+')',
    ()=>'local '+id(5)+'=(function() return '+rnd(0,1)+' end)()',
    ()=>{const t=id(5);return 'local '+t+'={}\nlocal '+id(5)+'=#'+t;},
    ()=>'local '+id(5)+'=select("#")',
    ()=>'local '+id(5)+'=math.max(0,0)',
  ];
  const lines=code.split('\n');const out=[];
  for(let i=0;i<lines.length;i++){
    out.push(lines[i]);
    if(isSafeLine(lines[i],lines[i+1])&&Math.random()<0.10){
      const ind=lines[i].match(/^(\s*)/)[1];
      out.push(ind+ops[rnd(0,ops.length-1)]());
    }
  }
  return out.join('\n');
}

function passScope(code){
  for(let i=0;i<3;i++){
    const a=id(),b=id();
    code='do\nlocal '+a+'='+rnd(1,9999)+'\nlocal '+b+'=type(nil)\n'+code+'\n'+a+'=nil\nend';
  }
  return code;
}

function passWatermark(code){
  const wm='ZumHub/DoggoJr';
  const wmB=Array.from(wm).map(c=>c.charCodeAt(0));
  const key=rnd(10,200);const enc=wmB.map(b=>b^key);
  const wV=id(8),kV=id(4),iV=id(4),rV=id(8);
  const wmark='local '+wV+'={'+enc.join(',')+'}\nlocal '+kV+'='+key+'\n'+
    'if ('+wV+' and #'+wV+'<0) then\n'+
    '  local '+rV+'={}\n'+
    '  for '+iV+'=1,#'+wV+' do '+rV+'['+iV+']=string.char(bit32.bxor('+wV+'['+iV+'],'+kV+')) end\n'+
    '  print(table.concat('+rV+'))\nend';
  return wmark+'\n'+code;
}

// ── Main ──────────────────────────────────────────────────────────────────
function obfuscate(src,opts={}){
  resetIds();
  const intensity=opts.intensity||3;

  const ast=parse(src);
  passRename(ast);
  const {ast:ast2,decSrc}=passStrings(ast);
  if(intensity>=2)passNumbers(ast2);

  let code=emitBlock(ast2,0);
  code=decSrc+'\n'+code;

  if(intensity>=2)code=passDeadCode(code);
  if(intensity>=3)code=passJunk(code);
  if(intensity>=2)code=passScope(code);
  code=passWatermark(code);
  code='--DoggoJr Is Here\n'+code;
  return code;
}

if(typeof module!=='undefined')module.exports={obfuscate,parse,emitBlock,emitE,resetIds};
