// ══════════════════════════════════════════════════════════════════════════════
// LEXER
// ══════════════════════════════════════════════════════════════════════════════
const TK={NUM:'NUM',STR:'STR',NAME:'NAME',TRUE:'true',FALSE:'false',NIL:'nil',AND:'and',OR:'or',NOT:'not',LOCAL:'local',FUNCTION:'function',IF:'if',THEN:'then',ELSE:'else',ELSEIF:'elseif',END:'end',WHILE:'while',DO:'do',FOR:'for',IN:'in',REPEAT:'repeat',UNTIL:'until',RETURN:'return',BREAK:'break',DOTDOT:'..',DOTDOTDOT:'...',EQ:'==',NEQ:'~=',LTE:'<=',GTE:'>=',LT:'<',GT:'>',ASSIGN:'=',ADDASSIGN:'+=',SUBASSIGN:'-=',MULASSIGN:'*=',DIVASSIGN:'/=',MODASSIGN:'%=',PLUS:'+',MINUS:'-',STAR:'*',SLASH:'/',PERCENT:'%',CARET:'^',HASH:'#',DOT:'.',COLON:':',SEMI:';',COMMA:',',LPAREN:'(',RPAREN:')',LBRACKET:'[',RBRACKET:']',LBRACE:'{',RBRACE:'}',EOF:'EOF'};
const KW=new Set(['and','or','not','local','function','if','then','else','elseif','end','while','do','for','in','repeat','until','return','break','true','false','nil']);
function lex(src){const toks=[];let i=0;while(i<src.length){if(/\s/.test(src[i])){i++;continue;}if(src[i]==='-'&&src[i+1]==='-'){if(src[i+2]==='['&&src[i+3]==='['){i+=4;while(i<src.length&&!(src[i]===']'&&src[i+1]===']'))i++;i+=2;}else{while(i<src.length&&src[i]!=='\n')i++;}continue;}if(src[i]==='['&&src[i+1]==='['){i+=2;let s='';while(i<src.length&&!(src[i]===']'&&src[i+1]===']')){s+=src[i++];}i+=2;toks.push({t:TK.STR,v:s});continue;}if(src[i]==='"'||src[i]==="'"){const q=src[i++];let s='';while(i<src.length&&src[i]!==q){if(src[i]==='\\'){i++;const e=src[i++];if(e==='n')s+='\n';else if(e==='t')s+='\t';else if(e==='r')s+='\r';else if(e==='\\')s+='\\';else if(e==='"')s+='"';else if(e==="'")s+="'";else if(/\d/.test(e)){let n=e;if(/\d/.test(src[i]))n+=src[i++];if(/\d/.test(src[i]))n+=src[i++];s+=String.fromCharCode(parseInt(n));}else s+=e;}else s+=src[i++];}i++;toks.push({t:TK.STR,v:s});continue;}if(/\d/.test(src[i])||(src[i]==='.'&&/\d/.test(src[i+1]))){let n='';if(src[i]==='0'&&(src[i+1]==='x'||src[i+1]==='X')){n='0x';i+=2;while(i<src.length&&/[0-9a-fA-F]/.test(src[i]))n+=src[i++];}else{while(i<src.length&&(/\d/.test(src[i])||src[i]==='.'||src[i]==='e'||src[i]==='E'))n+=src[i++];}toks.push({t:TK.NUM,v:Number(n)});continue;}if(/[a-zA-Z_]/.test(src[i])){let n='';while(i<src.length&&/\w/.test(src[i]))n+=src[i++];toks.push({t:KW.has(n)?n:TK.NAME,v:n});continue;}const three=src.slice(i,i+3);if(three==='...'){toks.push({t:TK.DOTDOTDOT,v:'...'});i+=3;continue;}const two=src.slice(i,i+2);const cmap={'+=':TK.ADDASSIGN,'-=':TK.SUBASSIGN,'*=':TK.MULASSIGN,'/=':TK.DIVASSIGN,'%=':TK.MODASSIGN};if(cmap[two]){toks.push({t:cmap[two],v:two});i+=2;continue;}const dmap={'==':TK.EQ,'~=':TK.NEQ,'<=':TK.LTE,'>=':TK.GTE,'..':TK.DOTDOT};if(dmap[two]){toks.push({t:dmap[two],v:two});i+=2;continue;}const smap={'=':TK.ASSIGN,'+':TK.PLUS,'-':TK.MINUS,'*':TK.STAR,'/':TK.SLASH,'%':TK.PERCENT,'^':TK.CARET,'#':TK.HASH,'.':TK.DOT,':':TK.COLON,';':TK.SEMI,',':TK.COMMA,'(':TK.LPAREN,')':TK.RPAREN,'[':TK.LBRACKET,']':TK.RBRACKET,'{':TK.LBRACE,'}':TK.RBRACE,'<':TK.LT,'>':TK.GT};if(smap[src[i]]){toks.push({t:smap[src[i]],v:src[i]});i++;continue;}i++;}toks.push({t:TK.EOF,v:null});return toks;}

// ══════════════════════════════════════════════════════════════════════════════
// OPCODES
// ══════════════════════════════════════════════════════════════════════════════
const OP={LOAD_K:0,LOAD_NIL:1,LOAD_BOOL:2,LOAD_VAR:3,STORE_VAR:4,LOAD_GLOBAL:5,STORE_GLOBAL:6,LOAD_UPVALUE:7,STORE_UPVALUE:8,ADD:10,SUB:11,MUL:12,DIV:13,MOD:14,POW:15,UNM:16,CONCAT:17,LEN:18,EQ:20,NEQ:21,LT:22,LTE:23,GT:24,GTE:25,NOT:26,AND:27,OR:28,JMP:30,JMP_FALSE:31,JMP_TRUE:32,NEW_TABLE:40,SET_FIELD:41,GET_FIELD:42,SET_INDEX:43,GET_INDEX:44,MAKE_CLOSURE:50,CALL:51,RETURN:52,VARARG:53,POP:60,DUP:61,SWAP:62};

// ══════════════════════════════════════════════════════════════════════════════
// COMPILER
// ══════════════════════════════════════════════════════════════════════════════
class Compiler{
  constructor(parent=null){this.code=[];this.consts=[];this.protos=[];this.locals=[];this.depth=0;this.breaks=[];this.continues=[];this.parent=parent;this.nextLocal=0;}
  addConst(v){const i=this.consts.findIndex(c=>c===v);if(i>=0)return i;this.consts.push(v);return this.consts.length-1;}
  emit(...a){this.code.push(a);return this.code.length-1;}
  patch(i,f,v){this.code[i][f]=v;}
  here(){return this.code.length;}
  findLocal(n){for(let i=this.locals.length-1;i>=0;i--)if(this.locals[i].name===n)return this.locals[i].slot;return -1;}
  resolveUpvalue(n){let c=this.parent,d=1;while(c){const slot=c.findLocal(n);if(slot>=0)return{depth:d,slot};c=c.parent;d++;}return null;}
  pushLocal(n){this.locals.push({name:n,depth:this.depth,slot:this.nextLocal++});}
  popScope(){while(this.locals.length&&this.locals[this.locals.length-1].depth>=this.depth)this.locals.pop();}

  compileBlock(p){this.depth++;while(!['end','else','elseif','until',TK.EOF].includes(p.peek().t)){this.compileStat(p);if(p.peek().t===TK.SEMI)p.next();}this.popScope();this.depth--;}

  compileStat(p){
    const tk=p.peek();
    if(tk.t===TK.NAME&&tk.v==='type'){
      p.next();p.expect(TK.NAME);p.expect(TK.ASSIGN);
      if(p.peek().t===TK.LBRACE)this.skipTypeExpr(p);else if(p.peek().t!==TK.EOF)p.next();
    }
    else if(tk.t===TK.LOCAL){
      p.next();
      if(p.peek().t===TK.FUNCTION){p.next();const name=p.expect(TK.NAME).v;this.pushLocal(name);this.compileFunction(p);this.emit(OP.STORE_VAR,this.findLocal(name));}
      else{
        const names=[];names.push(p.expect(TK.NAME).v);
        if(p.peek().t===TK.COLON){p.next();if(p.peek().t===TK.LBRACE){this.skipTypeExpr(p);}else p.next();}
        while(p.peek().t===TK.COMMA){p.next();names.push(p.expect(TK.NAME).v);if(p.peek().t===TK.COLON){p.next();if(p.peek().t===TK.LBRACE){this.skipTypeExpr(p);}else p.next();}}
        if(p.peek().t===TK.ASSIGN){
          p.next();
          if(names.length>1){
            // Check if RHS is a single function call → spread its returns
            const beforeLen=this.code.length;
            this.compileExpr(p);
            const afterLen=this.code.length;
            const lastInstr=this.code[afterLen-1];
            const rhsIsCall=(lastInstr&&lastInstr[0]===OP.CALL);
            if(rhsIsCall&&p.peek().t!==TK.COMMA){
              // Single call RHS: patch nret to names.length, emit STOREs below
              lastInstr[2]=names.length;
            } else {
              // Multiple RHS exprs: compile remaining
              for(let i=1;i<names.length;i++){if(p.peek().t===TK.COMMA)p.next();this.compileExpr(p);}
            }
          } else {
            this.compileExpr(p);
          }
        } else for(const _ of names)this.emit(OP.LOAD_NIL);
        for(let i=names.length-1;i>=0;i--){this.pushLocal(names[i]);this.emit(OP.STORE_VAR,this.findLocal(names[i]));}
      }
    }
    else if(tk.t===TK.FUNCTION){
      p.next();
      const parts=[p.expect(TK.NAME).v];
      let method=false;
      while(p.peek().t===TK.DOT||p.peek().t===TK.COLON){
        method=p.next().t===TK.COLON;
        parts.push(p.expect(TK.NAME).v);
      }
      if(parts.length===1){
        const name=parts[0];this.compileFunction(p);
        const li=this.findLocal(name);if(li>=0)this.emit(OP.STORE_VAR,li);else this.emit(OP.STORE_GLOBAL,this.addConst(name));
      }else{
        const root=parts[0];
        this.emit(OP.LOAD_GLOBAL,this.addConst(root));
        this.compileFunction(p,method);
        for(let i=1;i<parts.length-1;i++)this.emit(OP.GET_FIELD,-1,this.addConst(parts[i]));
        this.emit(OP.SET_FIELD,-1,this.addConst(parts[parts.length-1]));
      }
    }
    else if(tk.t===TK.IF){
      p.expect('if');this.compileExpr(p);p.expect('then');
      const jf=this.emit(OP.JMP_FALSE,0);this.compileBlock(p);
      const jumps=[this.emit(OP.JMP,0)];this.patch(jf,1,this.here());
      while(p.peek().t==='elseif'){p.next();this.compileExpr(p);p.expect('then');const jf2=this.emit(OP.JMP_FALSE,0);this.compileBlock(p);jumps.push(this.emit(OP.JMP,0));this.patch(jf2,1,this.here());}
      if(p.peek().t==='else'){p.next();this.compileBlock(p);}
      p.expect('end');const end=this.here();for(const j of jumps)this.patch(j,1,end);
    }
    else if(tk.t===TK.WHILE){
      p.next();const top=this.here();this.compileExpr(p);p.expect('do');
      const jf=this.emit(OP.JMP_FALSE,0);const sb=this.breaks;this.breaks=[];
      this.compileBlock(p);p.expect('end');this.emit(OP.JMP,top);
      const end=this.here();this.patch(jf,1,end);for(const b of this.breaks)this.patch(b,1,end);this.breaks=sb;
    }
    else if(tk.t===TK.FOR){
      p.next();const names=[p.expect(TK.NAME).v];
      while(p.peek().t===TK.COMMA){p.next();names.push(p.expect(TK.NAME).v);}
      const name=names[0];
      if(p.peek().t===TK.ASSIGN){
        p.next();this.compileExpr(p);p.expect(TK.COMMA);this.compileExpr(p);
        let step=false;if(p.peek().t===TK.COMMA){p.next();this.compileExpr(p);step=true;}
        if(!step)this.emit(OP.LOAD_K,this.addConst(1));
        const iS=this.nextLocal;
        this.pushLocal('__stp');this.emit(OP.STORE_VAR,iS+2);
        this.pushLocal('__lim');this.emit(OP.STORE_VAR,iS+1);
        this.pushLocal(name);this.emit(OP.STORE_VAR,iS);
        p.expect('do');const top=this.here();
        this.emit(OP.LOAD_VAR,iS);this.emit(OP.LOAD_VAR,iS+1);this.emit(OP.LTE);
        const jf=this.emit(OP.JMP_FALSE,0);const sb=this.breaks;this.breaks=[];
        this.depth++;while(!['end',TK.EOF].includes(p.peek().t))this.compileStat(p);this.popScope();this.depth--;
        p.expect('end');
        this.emit(OP.LOAD_VAR,iS);this.emit(OP.LOAD_VAR,iS+2);this.emit(OP.ADD);this.emit(OP.STORE_VAR,iS);
        this.emit(OP.JMP,top);const end=this.here();this.patch(jf,1,end);
        for(const b of this.breaks)this.patch(b,1,end);this.breaks=sb;
      } else {
        p.expect('in');this.compileExpr(p);p.expect('do');
        // Generic for: iterator expression yields (iter_fn, state, ctrl).
        // Each iteration yields one value per loop variable; the first value
        // becomes the control variable for the next iterator call.
        const iS=this.nextLocal;
        const lastCall=this.code[this.code.length-1];
        if(lastCall&&lastCall[0]===OP.CALL){lastCall[2]=3;}
        this.pushLocal('__iter');this.emit(OP.STORE_VAR,iS);
        this.pushLocal('__state');this.emit(OP.STORE_VAR,iS+1);
        this.pushLocal('__ctrl');this.emit(OP.STORE_VAR,iS+2);
        for(let k=0;k<names.length;k++){this.pushLocal(names[k]);this.emit(OP.LOAD_NIL);this.emit(OP.STORE_VAR,iS+3+k);}
        const top=this.here();
        this.emit(OP.LOAD_VAR,iS);
        this.emit(OP.LOAD_VAR,iS+1);
        this.emit(OP.LOAD_VAR,iS+2);
        this.emit(OP.CALL,2,names.length);
        // First returned value is the iterator control value. Nil ends the loop.
        this.emit(OP.DUP);this.emit(OP.LOAD_NIL);this.emit(OP.EQ);
        const jt=this.emit(OP.JMP_TRUE,0);
        // Store returned loop values in reverse so their stack order is preserved.
        for(let k=names.length-1;k>=0;k--)this.emit(OP.STORE_VAR,iS+3+k);
        this.emit(OP.LOAD_VAR,iS+3);this.emit(OP.STORE_VAR,iS+2);
        const sb=this.breaks;this.breaks=[];
        this.depth++;while(!['end',TK.EOF].includes(p.peek().t))this.compileStat(p);this.popScope();this.depth--;
        p.expect('end');this.emit(OP.JMP,top);
        const end=this.here();this.patch(jt,1,end);for(const b of this.breaks)this.patch(b,1,end);this.breaks=sb;
      }
    }
    else if(tk.t===TK.REPEAT){
      p.next();const top=this.here();const sb=this.breaks;this.breaks=[];
      this.compileBlock(p);p.expect('until');this.compileExpr(p);this.emit(OP.JMP_FALSE,top);
      const end=this.here();for(const b of this.breaks)this.patch(b,1,end);this.breaks=sb;
    }
    else if(tk.t===TK.DO){p.next();this.compileBlock(p);p.expect('end');}
    else if(tk.t===TK.RETURN){
      p.next();let n=0;
      if(![TK.EOF,'end','else','elseif','until'].includes(p.peek().t)){
        this.compileExpr(p);n=1;
        if(p.peek().t===TK.COMMA){while(p.peek().t===TK.COMMA){p.next();this.compileExpr(p);n++;}}
        else {const last=this.code[this.code.length-1];if(last&&last[0]===OP.CALL){last[2]=255;n=255;}}
      }
      this.emit(OP.RETURN,n);
    }
    else if(tk.t===TK.BREAK){p.next();const b=this.emit(OP.JMP,0);this.breaks.push(b);}
    else{
      if(p.peek().t===TK.NAME&&p.peekAt(1).t===TK.DOT&&p.peekAt(2).t===TK.NAME&&[TK.ADDASSIGN,TK.SUBASSIGN,TK.MULASSIGN,TK.DIVASSIGN,TK.MODASSIGN].includes(p.peekAt(3).t)){
        const root=p.next().v;p.next();const field=p.next().v;const opTk=p.next().t;
        const li=this.findLocal(root);
        if(li>=0)this.emit(OP.LOAD_VAR,li);else this.emit(OP.LOAD_GLOBAL,this.addConst(root));
        this.emit(OP.DUP);this.emit(OP.GET_FIELD,-1,this.addConst(field));
        const bop={[TK.ADDASSIGN]:OP.ADD,[TK.SUBASSIGN]:OP.SUB,[TK.MULASSIGN]:OP.MUL,[TK.DIVASSIGN]:OP.DIV,[TK.MODASSIGN]:OP.MOD}[opTk];
        this.compileExpr(p);this.emit(bop);this.emit(OP.SET_FIELD,-1,this.addConst(field));
      }else this.compileExprStat(p);
    }
  }

  compileExprStat(p){
    // Multiple assignment: a, b, c = ...
    if(p.peek().t===TK.NAME&&p.peekAt(1).t===TK.COMMA){
      const targets=[];
      while(true){
        const name=p.expect(TK.NAME).v;
        const li=this.findLocal(name);
        if(li>=0)targets.push({kind:"local",idx:li});
        else {const up=this.resolveUpvalue(name);if(up)targets.push({kind:"up",depth:up.depth,idx:up.slot});else targets.push({kind:"global",idx:this.addConst(name)});}
        if(p.peek().t!==TK.COMMA)break;
        p.next();
      }
      p.expect(TK.ASSIGN);
      const rhs=[];
      while(true){
        this.compileExpr(p);
        rhs.push(this.code[this.code.length-1]);
        if(p.peek().t!==TK.COMMA)break;
        p.next();
      }
      const last=rhs[rhs.length-1];
      if(last&&last[0]===OP.CALL)last[2]=Math.max(1,targets.length-rhs.length+1);
      const produced=rhs.length-1+(last&&last[0]===OP.CALL?Math.max(1,targets.length-rhs.length+1):1);
      for(let i=produced;i>targets.length;i--)this.emit(OP.POP);
      for(let i=produced;i<targets.length;i++)this.emit(OP.LOAD_NIL);
      for(let i=targets.length-1;i>=0;i--){
        const t=targets[i];
        if(t.kind==="local")this.emit(OP.STORE_VAR,t.idx);
        else if(t.kind==="up")this.emit(OP.STORE_UPVALUE,t.depth,t.idx);
        else this.emit(OP.STORE_GLOBAL,t.idx);
      }
      return;
    }
    this.compileExpr(p);
    if(p.peek().t===TK.ASSIGN||[TK.ADDASSIGN,TK.SUBASSIGN,TK.MULASSIGN,TK.DIVASSIGN,TK.MODASSIGN].includes(p.peek().t)){
      const opTk=p.next().t;
      const last=this.code[this.code.length-1];
      if(opTk===TK.ASSIGN){
        this.code.pop();this.compileExpr(p);
        if(last[0]===OP.LOAD_VAR)this.emit(OP.STORE_VAR,last[1]);
        else if(last[0]===OP.LOAD_UPVALUE)this.emit(OP.STORE_UPVALUE,last[1],last[2]);
        else if(last[0]===OP.LOAD_GLOBAL)this.emit(OP.STORE_GLOBAL,last[1]);
        else if(last[0]===OP.GET_FIELD)this.emit(OP.SET_FIELD,-1,last[2]);
        else this.emit(OP.POP);
      }else{
        const bop={[TK.ADDASSIGN]:OP.ADD,[TK.SUBASSIGN]:OP.SUB,[TK.MULASSIGN]:OP.MUL,[TK.DIVASSIGN]:OP.DIV,[TK.MODASSIGN]:OP.MOD}[opTk];
        this.compileExpr(p);this.emit(bop);
        if(last[0]===OP.LOAD_VAR)this.emit(OP.STORE_VAR,last[1]);
        else if(last[0]===OP.LOAD_UPVALUE)this.emit(OP.STORE_UPVALUE,last[1],last[2]);
        else if(last[0]===OP.LOAD_GLOBAL)this.emit(OP.STORE_GLOBAL,last[1]);
        else if(last[0]===OP.GET_FIELD)this.emit(OP.SET_FIELD,-1,last[2]);
        else this.emit(OP.POP);
      }
    } else {
      const last=this.code[this.code.length-1];
      if(last&&last[0]!==OP.CALL)this.emit(OP.POP);
    }
  }
  skipTypeExpr(p){
    if(p.peek().t!==TK.LBRACE){p.next();return;}
    let d=0;
    do{
      const t=p.next().t;
      if(t===TK.LBRACE)d++;
      else if(t===TK.RBRACE)d--;
    }while(d>0&&p.peek().t!==TK.EOF);
  }

  compileFunction(p,method=false){
    p.expect(TK.LPAREN);const params=[];let vararg=false;if(method)params.push('self');
    while(p.peek().t!==TK.RPAREN&&p.peek().t!==TK.EOF){
      if(p.peek().t===TK.DOTDOTDOT){p.next();vararg=true;break;}
      params.push(p.expect(TK.NAME).v);if(p.peek().t===TK.COLON){p.next();if(p.peek().t===TK.LBRACE){this.skipTypeExpr(p);}else p.next();}if(p.peek().t===TK.COMMA)p.next();
    }
    p.expect(TK.RPAREN);if(p.peek().t===TK.COLON){p.next();if(p.peek().t===TK.LBRACE){this.skipTypeExpr(p);}else p.next();}
    const sub=new Compiler(this);sub.depth=1;
    for(const pn of params)sub.pushLocal(pn);
    sub.compileBlock(p);if(p.peek().t==='end')p.next();
    if(!sub.code.length||sub.code[sub.code.length-1][0]!==OP.RETURN)sub.emit(OP.RETURN,0);
    const pi=this.protos.length;
    this.protos.push({code:sub.code,consts:sub.consts,protos:sub.protos,params:params.length,vararg});
    this.emit(OP.MAKE_CLOSURE,pi);
  }

  compileExpr(p){this.compileOr(p);}
  compileOr(p){this.compileAnd(p);while(p.peek().t==='or'){p.next();this.compileAnd(p);this.emit(OP.OR);}}
  compileAnd(p){this.compileCompare(p);while(p.peek().t==='and'){p.next();this.compileCompare(p);this.emit(OP.AND);}}
  compileCompare(p){
    this.compileConcat(p);
    const m={[TK.EQ]:OP.EQ,[TK.NEQ]:OP.NEQ,[TK.LT]:OP.LT,[TK.LTE]:OP.LTE,[TK.GT]:OP.GT,[TK.GTE]:OP.GTE};
    while(m[p.peek().t]!==undefined){const op=m[p.next().t];this.compileConcat(p);this.emit(op);}
  }
  compileConcat(p){this.compileAdd(p);if(p.peek().t===TK.DOTDOT){p.next();this.compileConcat(p);this.emit(OP.CONCAT);}}
  compileAdd(p){this.compileMul(p);while(p.peek().t===TK.PLUS||p.peek().t===TK.MINUS){const op=p.next().t===TK.PLUS?OP.ADD:OP.SUB;this.compileMul(p);this.emit(op);}}
  compileMul(p){
    this.compileUnary(p);
    while([TK.STAR,TK.SLASH,TK.PERCENT].includes(p.peek().t)){
      const t=p.next().t;this.compileUnary(p);this.emit(t===TK.STAR?OP.MUL:t===TK.SLASH?OP.DIV:OP.MOD);
    }
  }
  compileUnary(p){
    if(p.peek().t===TK.MINUS){p.next();this.compilePower(p);this.emit(OP.UNM);}
    else if(p.peek().t==='not'){p.next();this.compilePower(p);this.emit(OP.NOT);}
    else if(p.peek().t===TK.HASH){p.next();this.compilePower(p);this.emit(OP.LEN);}
    else this.compilePower(p);
  }
  compilePower(p){this.compilePostfix(p);if(p.peek().t===TK.CARET){p.next();this.compileUnary(p);this.emit(OP.POW);}}
  compilePostfix(p){
    this.compilePrimary(p);
    while(true){
      if(p.peek().t===TK.DOT){p.next();const k=p.expect(TK.NAME).v;this.emit(OP.GET_FIELD,-1,this.addConst(k));}
      else if(p.peek().t===TK.LBRACKET){p.next();this.compileExpr(p);p.expect(TK.RBRACKET);this.emit(OP.GET_INDEX);}
      else if(p.peek().t===TK.COLON){p.next();const m=p.expect(TK.NAME).v;this.emit(OP.DUP);this.emit(OP.GET_FIELD,-1,this.addConst(m));this.emit(OP.SWAP);const ac=this.compileArgs(p,true);this.emit(OP.CALL,ac,1);}
      else if([TK.LPAREN,TK.LBRACE,TK.STR].includes(p.peek().t)){const ac=this.compileArgs(p,false);this.emit(OP.CALL,ac,1);}
      else break;
    }
  }
  compileArgs(p,hasSelf){
    let ac=hasSelf?1:0;
    if(p.peek().t===TK.LPAREN){p.next();while(p.peek().t!==TK.RPAREN&&p.peek().t!==TK.EOF){this.compileExpr(p);ac++;if(p.peek().t===TK.COMMA)p.next();}p.expect(TK.RPAREN);}
    else if(p.peek().t===TK.LBRACE){this.compileTable(p);ac++;}
    else if(p.peek().t===TK.STR){this.emit(OP.LOAD_K,this.addConst(p.next().v));ac++;}
    return ac;
  }
  compilePrimary(p){
    const tk=p.peek();
    if(tk.t===TK.NUM){p.next();this.emit(OP.LOAD_K,this.addConst(tk.v));}
    else if(tk.t===TK.STR){p.next();this.emit(OP.LOAD_K,this.addConst(tk.v));}
    else if(tk.t==='true'){p.next();this.emit(OP.LOAD_BOOL,1);}
    else if(tk.t==='false'){p.next();this.emit(OP.LOAD_BOOL,0);}
    else if(tk.t==='nil'){p.next();this.emit(OP.LOAD_NIL);}
    else if(tk.t===TK.DOTDOTDOT){p.next();this.emit(OP.VARARG);}
    else if(tk.t===TK.FUNCTION){p.next();this.compileFunction(p);}
    else if(tk.t===TK.LBRACE){this.compileTable(p);}
    else if(tk.t===TK.LPAREN){p.next();this.compileExpr(p);p.expect(TK.RPAREN);}
    else if(tk.t===TK.NAME){p.next();const li=this.findLocal(tk.v);if(li>=0)this.emit(OP.LOAD_VAR,li);else {const up=this.resolveUpvalue(tk.v);if(up)this.emit(OP.LOAD_UPVALUE,up.depth,up.slot);else this.emit(OP.LOAD_GLOBAL,this.addConst(tk.v));}}
    else throw new Error('Unexpected token: '+tk.t+'('+tk.v+')');
  }
  compileTable(p){
    p.expect(TK.LBRACE);this.emit(OP.NEW_TABLE);let idx=1;
    while(p.peek().t!==TK.RBRACE&&p.peek().t!==TK.EOF){
      if(p.peek().t===TK.LBRACKET){p.next();this.compileExpr(p);p.expect(TK.RBRACKET);p.expect(TK.ASSIGN);this.compileExpr(p);this.emit(OP.SET_INDEX);}
      else if(p.peek().t===TK.NAME&&p.peekAt(1).t===TK.ASSIGN){const k=p.next().v;p.next();this.compileExpr(p);this.emit(OP.SET_FIELD,-1,this.addConst(k));}
      else{this.compileExpr(p);this.emit(OP.SET_INDEX,-1,idx++);}
      if(p.peek().t===TK.COMMA||p.peek().t===TK.SEMI)p.next();
    }
    p.expect(TK.RBRACE);
  }
}
class Parser{constructor(t){this.toks=t;this.i=0;}peek(){return this.toks[this.i];}peekAt(n){return this.toks[this.i+n]||{t:TK.EOF,v:null};}next(){return this.toks[this.i++];}expect(t){const tk=this.next();if(tk.t!==t)throw new Error('Expected '+t+' got '+tk.t+'('+tk.v+')');return tk;}}

// ══════════════════════════════════════════════════════════════════════════════
// SERIALIZE + REAL STACK VM
// ══════════════════════════════════════════════════════════════════════════════
function serializeProto(p){
  const out=[];
  out.push(p.consts.length);
  for(const c of p.consts){
    if(c===null||c===undefined){out.push(3);}
    else if(typeof c==='boolean'){out.push(2,c?1:0);}
    else if(typeof c==='number'){
      const str=String(c);out.push(0,str.length);for(let i=0;i<str.length;i++)out.push(str.charCodeAt(i));
    } else {
      const str=String(c);out.push(1,str.length);for(let i=0;i<str.length;i++)out.push(str.charCodeAt(i));
    }
  }
  out.push(p.code.length);
  for(const ins of p.code){out.push(ins.length);for(const v of ins)out.push(v==null?0:v);}
  out.push(p.protos.length);
  for(const s of p.protos)out.push(...serializeProto(s));
  out.push(p.params||0,p.vararg?1:0);
  return out;
}

function compile(src){
  const toks=lex(src);const p=new Parser(toks);const c=new Compiler();
  c.compileBlock(p);
  if(!c.code.length||c.code[c.code.length-1][0]!==OP.RETURN)c.emit(OP.RETURN,0);
  return serializeProto({code:c.code,consts:c.consts,protos:c.protos,params:0,vararg:true});
}

function rndI(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
const IDS=['l','I','1','O','0'];
function id(n){n=n||rndI(7,13);let s='_';for(let i=0;i<n;i++)s+=IDS[rndI(0,4)];return s;}
function luaEsc(s){return s.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n').replace(/\t/g,'\\t');}

function emitVMLua(bc){
  const seed=rndI(1,250);
  const enc=bc.map((v,i)=>(v^((seed+i*7)%251))&0xFF);
  const vmN=id(10),DE=id(3),EX=id(3),bcN=id(4),sdN=id(4),iN=id(3),posN=id(4);
  const frameN=id(4),stk=id(4),sp=id(3),pcN=id(3),codeN=id(4),KN=id(3),ins=id(3),opN=id(3);
  const bN=id(3),vN=id(3),tN=id(3),kN=id(3),aN=id(3),fnN=id(3),argsN=id(4),resN=id(4),nretN=id(3),outN=id(4);
  const cN=id(3),upN=id(3),tmpN=id(3),pN=id(3),jN=id(3),idxN=id(3),sN=id(3);
  return `local ${sdN}=${seed};local ${bcN}={${enc.join(',')}};for ${iN}=1,#${bcN} do ${bcN}[${iN}]=(${bcN}[${iN}])~(((${sdN}+(${iN}-1)*7)%251)) end
local function ${DE}(${bcN},${posN})
 local ${pN}={consts={},code={},protos={},params=0,vararg=false};local ${cN}=${bcN}[${posN}];${posN}=${posN}+1
 for ${iN}=1,${cN} do local ${tN}=${bcN}[${posN}];${posN}=${posN}+1
  if ${tN}==3 then ${pN}.consts[${iN}]=nil
  elseif ${tN}==2 then ${pN}.consts[${iN}]=${bcN}[${posN}]==1;${posN}=${posN}+1
  else local ${sN}=${bcN}[${posN}];${posN}=${posN}+1;local ${bN}={};for ${jN}=1,${sN} do ${bN}[${jN}]=string.char(${bcN}[${posN}]);${posN}=${posN}+1 end;local ${vN}=table.concat(${bN});${pN}.consts[${iN}]=(${tN}==0 and tonumber(${vN}) or ${vN}) end
 end
 local ${cN}=${bcN}[${posN}];${posN}=${posN}+1;for ${iN}=1,${cN} do local ${sN}=${bcN}[${posN}];${posN}=${posN}+1;local ${bN}={};for ${jN}=1,${sN} do ${bN}[${jN}]=${bcN}[${posN}];${posN}=${posN}+1 end;${pN}.code[${iN}]=${bN} end
 local ${cN}=${bcN}[${posN}];${posN}=${posN}+1;for ${iN}=1,${cN} do local ${vN};${vN},${posN}=${DE}(${bcN},${posN});${pN}.protos[${iN}]=${vN} end
 ${pN}.params=${bcN}[${posN}];${pN}.vararg=${bcN}[${posN}+1]==1;${posN}=${posN}+2;return ${pN},${posN}
end
local function ${EX}(${pN},${frameN},${argsN})
 local ${stk}={};local ${sp}=0;local ${pcN}=1;local ${codeN}=${pN}.code;local ${KN}=${pN}.consts;local ${resN}={};local ${nretN}=0
 local function push(v) ${sp}=${sp}+1;${stk}[${sp}]=v end
 local function pop() local v=${stk}[${sp}];${stk}[${sp}]=nil;${sp}=${sp}-1;return v end
 local function walk(d) local f=${frameN};for ${jN}=1,d do f=f.outer end;return f end
 for ${iN},v in ipairs(${argsN} or {}) do ${frameN}.loc[${iN}]=v end
 while ${pcN}<=#${codeN} do
  local ${ins}=${codeN}[${pcN}];local ${opN}=${ins}[1];${pcN}=${pcN}+1
  if ${opN}==0 then push(${KN}[${ins}[2]+1])
  elseif ${opN}==1 then push(nil)
  elseif ${opN}==2 then push(${ins}[2]==1)
  elseif ${opN}==3 then push(${frameN}.loc[${ins}[2]+1])
  elseif ${opN}==4 then ${frameN}.loc[${ins}[2]+1]=pop()
  elseif ${opN}==5 then push(${frameN}.env[${KN}[${ins}[2]+1]])
  elseif ${opN}==6 then ${frameN}.env[${KN}[${ins}[2]+1]]=pop()
  elseif ${opN}==7 then local ${tmpN}=walk(${ins}[2]);push(${tmpN}.loc[${ins}[3]+1])
  elseif ${opN}==8 then local ${tmpN}=walk(${ins}[2]);${tmpN}.loc[${ins}[3]+1]=pop()
  elseif ${opN}==10 then local ${bN}=pop();local ${aN}=pop();push(${aN}+${bN})
  elseif ${opN}==11 then local ${bN}=pop();local ${aN}=pop();push(${aN}-${bN})
  elseif ${opN}==12 then local ${bN}=pop();local ${aN}=pop();push(${aN}*${bN})
  elseif ${opN}==13 then local ${bN}=pop();local ${aN}=pop();push(${aN}/${bN})
  elseif ${opN}==14 then local ${bN}=pop();local ${aN}=pop();push(${aN}%${bN})
  elseif ${opN}==15 then local ${bN}=pop();local ${aN}=pop();push(${aN}^${bN})
  elseif ${opN}==16 then push(-pop())
  elseif ${opN}==17 then local ${bN}=pop();local ${aN}=pop();push(tostring(${aN})..tostring(${bN}))
  elseif ${opN}==18 then push(#pop())
  elseif ${opN}==20 then local ${bN}=pop();local ${aN}=pop();push(${aN}==${bN})
  elseif ${opN}==21 then local ${bN}=pop();local ${aN}=pop();push(${aN}~=${bN})
  elseif ${opN}==22 then local ${bN}=pop();local ${aN}=pop();push(${aN}<${bN})
  elseif ${opN}==23 then local ${bN}=pop();local ${aN}=pop();push(${aN}<=${bN})
  elseif ${opN}==24 then local ${bN}=pop();local ${aN}=pop();push(${aN}>${bN})
  elseif ${opN}==25 then local ${bN}=pop();local ${aN}=pop();push(${aN}>=${bN})
  elseif ${opN}==26 then push(not pop())
  elseif ${opN}==27 then local ${bN}=pop();local ${aN}=pop();push(${aN} and ${bN})
  elseif ${opN}==28 then local ${bN}=pop();local ${aN}=pop();push(${aN} or ${bN})
  elseif ${opN}==30 then ${pcN}=${ins}[2]+1
  elseif ${opN}==31 then if not pop() then ${pcN}=${ins}[2]+1 end
  elseif ${opN}==32 then if pop() then ${pcN}=${ins}[2]+1 end
  elseif ${opN}==40 then push({})
  elseif ${opN}==41 then local ${vN}=pop();local ${tN}=${stk}[${sp}];${tN}[${KN}[${ins}[3]+1]]=${vN}
  elseif ${opN}==42 then local ${tN}=pop();push(${tN}[${KN}[${ins}[3]+1]])
  elseif ${opN}==43 then local ${vN}=pop();local ${tN}=${stk}[${sp}];${tN}[${ins}[3]]=${vN}
  elseif ${opN}==44 then local ${kN}=pop();local ${tN}=pop();push(${tN}[${kN}])
  elseif ${opN}==50 then push({__vm=true,p=${pN}.protos[${ins}[2]+1],outer=${frameN},env=${frameN}.env})
  elseif ${opN}==51 then
   local ${aN}={};for ${jN}=${ins}[2],1,-1 do ${aN}[${jN}]=pop() end;local ${fnN}=pop();local ${outN}
   if type(${fnN})=="table" and ${fnN}.__vm then ${outN}=${EX}(${fnN}.p,{loc={},outer=${fnN}.outer,env=${fnN}.env,args=${aN}},${aN}) else ${outN}=table.pack(${fnN}(table.unpack(${aN}))) end
   local ${cN}=${outN}.n or #${outN};if ${ins}[3]==-1 then for ${jN}=1,${cN} do push(${outN}[${jN}]) end else for ${jN}=1,${ins}[3] do push(${outN}[${jN}]) end end
  elseif ${opN}==52 then
   ${nretN}=${ins}[2];if ${nretN}<0 then ${nretN}=${sp} end;for ${jN}=${nretN},1,-1 do ${resN}[${jN}]=pop() end;return{n=${nretN},v=${resN}}
  elseif ${opN}==53 then for ${jN},${vN} in ipairs(${frameN}.args or {}) do push(${vN}) end
  elseif ${opN}==60 then pop()
  elseif ${opN}==61 then push(${stk}[${sp}])
  elseif ${opN}==62 then local ${aN}=pop();local ${bN}=pop();push(${aN});push(${bN}) end
 end
 return{n=0,v={}}
end
local ${pN}=${DE}(${bcN},1);${EX}(${pN},{loc={},outer=nil,env=_G,args={}},{} )`;
}

// ══════════════════════════════════════════════════════════════════════════════
// V4 WRAPPING LAYERS (applied after VM emit)
// ══════════════════════════════════════════════════════════════════════════════
// Identifier mangling must operate on Lua tokens, never raw text.
// In particular, `local function foo()` contains the keyword `function`;
// a plain /local\s+(\w+)/ pass can accidentally rename that keyword and
// produce invalid Lua such as `local <junk> foo()`.
const LUA_KEYWORDS=new Set([
  'and','break','continue','do','else','elseif','end','export','false','for',
  'function','if','in','local','nil','not','or','repeat','return','then',
  'true','type','typeof','until','while'
]);

function mangleLuaIdentifiers(code,map){
  let out='',i=0,prevSig='';
  while(i<code.length){
    const ch=code[i];

    // Line/block comments.
    if(ch==='-'&&code[i+1]==='-'){
      if(code[i+2]==='['&&code[i+3]==='['){
        const end=code.indexOf(']]',i+4);
        const j=end<0?code.length:end+2;
        out+=code.slice(i,j);i=j;continue;
      }
      const end=code.indexOf('\n',i+2);
      const j=end<0?code.length:end;
      out+=code.slice(i,j);i=j;continue;
    }

    // Quoted strings / long strings.
    if(ch==='"'||ch==="'"){
      const q=ch;let j=i+1;
      while(j<code.length){
        if(code[j]==='\\')j+=2;
        else if(code[j]===q){j++;break;}
        else j++;
      }
      out+=code.slice(i,j);i=j;continue;
    }
    if(ch==='['&&code[i+1]==='['){
      const end=code.indexOf(']]',i+2);
      const j=end<0?code.length:end+2;
      out+=code.slice(i,j);i=j;continue;
    }

    if(/[A-Za-z_]/.test(ch)){
      let j=i+1;
      while(j<code.length&&/[A-Za-z0-9_]/.test(code[j]))j++;
      const word=code.slice(i,j);
      const prev=code[i-1]||'';
      // Don't rename keywords or table/member names (`obj.foo`, `obj:foo`).
      const isMember=prev==='.'||prev===':';
      const replacement=(!LUA_KEYWORDS.has(word)&&!isMember&&map[word])?map[word]:word;
      out+=replacement;
      prevSig=word;
      i=j;continue;
    }

    out+=ch;
    if(!/\s/.test(ch))prevSig=ch;
    i++;
  }
  return out;
}

function L_var(code){
  const map={};
  // Discover declarations without ever treating `function` as an identifier.
  const declRe=/\blocal\s+function\s+([A-Za-z_]\w*)|\blocal\s+(?!function\b)([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)/g;
  let m;
  while((m=declRe.exec(code))){
    const names=(m[1]||m[2]).split(',').map(x=>x.trim());
    for(const name of names){
      if(!LUA_KEYWORDS.has(name)&&!map[name])map[name]=id();
    }
  }
  // Also mangle local function names declared after `local function`; references
  // are rewritten token-safely, so strings/comments/member keys remain untouched.
  return mangleLuaIdentifiers(code,map);
}
function L_junk(code,intensity){
  const lines=code.split('\n'),out=[];
  const ops=[
    ()=>`local ${id(5)}=pcall(function()return 0 end);`,
    ()=>`local ${id(5)}=type(_G)=="table" and true or false;`,
    ()=>`local ${id(5)}=rawget({},1)==nil;`,
    ()=>`local function ${id(5)}()end;`,
    ()=>`local ${id(5)}=bit32 and bit32.band(${rndI(1,9)},0xFF) or 0;`,
  ];
  const prob=intensity*0.07;
  for(const ln of lines){out.push(ln);if(ln.trim().length>3&&Math.random()<prob)out.push(ops[rndI(0,ops.length-1)]());}
  return out.join('\n');
}
function L_dead(code){
  const lines=code.split('\n'),out=[];
  const preds=[
    ()=>`if rawequal(nil,false) then local ${id(5)}=0 end`,
    ()=>`if type(nil)=="number" then local ${id(5)}=0 end`,
    ()=>`if tostring(0)=="true" then local ${id(5)}=0 end`,
    ()=>`if rawget({},1)~=nil then local ${id(5)}=0 end`,
  ];
  for(const ln of lines){out.push(ln);if(ln.trim().length>4&&Math.random()<0.18)out.push(preds[rndI(0,preds.length-1)]());}
  return out.join('\n');
}
function L_poly(code){
  const KEY=rndI(5,250),s1=rndI(2,20),off=rndI(1,20);
  const s2=Math.ceil((KEY-off)/s1)+rndI(0,2),KEY2=((s1*s2)%251)+off;
  const kv=id(),sv1=id(4),sv2=id(4),ov=id(4),dFn=id(10);
  const keyX=`local ${sv1}=${s1};local ${sv2}=${s2};local ${ov}=${off};local ${kv}=(${sv1}*${sv2})%251+${ov};`;
  const dec=`${keyX}local function ${dFn}(s) local r={} for i=1,#s do r[i]=string.char(bit32.bxor(string.byte(s,i),${kv})) end return table.concat(r) end\n`;
  const t=code.replace(/"((?:[^"\\]|\\.)*)"/g,(m,s)=>{
    if(!s||s.length>300)return m;
    let enc='';for(let i=0;i<s.length;i++)enc+='\\'+( s.charCodeAt(i)^KEY2);
    return`${dFn}("${enc}")`;
  });
  return dec+t;
}
function L_scope(code){
  let r=code;for(let i=0;i<3;i++){const a=id(),b=id();r=`do\nlocal ${a}=${rndI(1,999)};local ${b}=nil;\n${r}\n${a}=nil;\nend`;}
  return r;
}
function L_flow(code){
  const sv=id(),tv=id(),dv=id();
  return`local ${sv}=1;local ${dv}=false;local ${tv};${tv}=function()\n`+code+`\n${dv}=true end;while not ${dv} do ${tv}();${sv}=${sv}+1;if ${sv}>99999 then break end end;`;
}
function L_wrap(code){
  const tag='@_'+Math.random().toString(36).slice(2,9);
  return`assert(load("${luaEsc(code)}","${tag}"))()`;
}
function L_bytes(code){
  const arr=id(),iv=id(4),cv=id(4);
  const bytes=[];for(let i=0;i<code.length;i++)bytes.push(code.charCodeAt(i));
  const chunks=[];for(let i=0;i<bytes.length;i+=300)chunks.push(bytes.slice(i,i+300).join(','));
  return`local ${arr}={${chunks.join(',')}};local ${cv}={};for ${iv}=1,#${arr} do ${cv}[${iv}]=string.char(${arr}[${iv}]) end;assert(load(table.concat(${cv})))()`;
}
function L_fallbackFull(code){
  // v4-style full obfuscation for fallback mode (no VM)
  code=L_var(code);
  code=code.replace(/"((?:[^"\\]|\\.)*)"/g,(m,s)=>{if(!s)return'""';return'('+[...s].map(c=>`string.char(${c.charCodeAt(0)})`).join('..')+')';});
  code=code.replace(/\b(\d+)\b/g,(m,n)=>{const v=parseInt(n);if(isNaN(v)||v>99999)return m;const a=rndI(1,300);return`(${v+a}-${a})`;});
  return code;
}
function pad(code,target){
  if(!target||target<=0||code.length>=target)return code;
  const names=['getService','waitForChild','findPlayer','checkBounds','updateState','clampValue','fetchData'];
  let p='';
  while(p.length<target-code.length){const f=names[rndI(0,names.length-1)]+id(3),a=id(4),b=id(4);p+=`local function ${f}(${a},${b}) if type(${a})~="nil" then return ${b} end return nil end\n`;}
  return p.slice(0,target-code.length)+code;
}
function compact(c){return c.replace(/\r?\n/g,' ').replace(/\t/g,' ').replace(/ {2,}/g,' ').trim();}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════
function fmtB(b){if(b>=1073741824)return(b/1073741824).toFixed(2)+' GB';if(b>=1048576)return(b/1048576).toFixed(2)+' MB';if(b>=1024)return(b/1024).toFixed(2)+' KB';return b+' B';}
