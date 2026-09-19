// ══════════════════════════════════════════════════════════════════════════════
// LEXER
// ══════════════════════════════════════════════════════════════════════════════
const TK={NUM:'NUM',STR:'STR',NAME:'NAME',TRUE:'true',FALSE:'false',NIL:'nil',AND:'and',OR:'or',NOT:'not',LOCAL:'local',FUNCTION:'function',IF:'if',THEN:'then',ELSE:'else',ELSEIF:'elseif',END:'end',WHILE:'while',DO:'do',FOR:'for',IN:'in',REPEAT:'repeat',UNTIL:'until',RETURN:'return',BREAK:'break',DOTDOT:'..',DOTDOTDOT:'...',EQ:'==',NEQ:'~=',LTE:'<=',GTE:'>=',LT:'<',GT:'>',ASSIGN:'=',ADDASSIGN:'+=',SUBASSIGN:'-=',MULASSIGN:'*=',DIVASSIGN:'/=',MODASSIGN:'%=',PLUS:'+',MINUS:'-',STAR:'*',SLASH:'/',PERCENT:'%',CARET:'^',HASH:'#',DOT:'.',COLON:':',SEMI:';',COMMA:',',LPAREN:'(',RPAREN:')',LBRACKET:'[',RBRACKET:']',LBRACE:'{',RBRACE:'}',EOF:'EOF'};
const KW=new Set(['and','or','not','local','function','if','then','else','elseif','end','while','do','for','in','repeat','until','return','break','true','false','nil']);
function lex(src){const toks=[];let i=0;while(i<src.length){if(/\s/.test(src[i])){i++;continue;}if(src[i]==='-'&&src[i+1]==='-'){if(src[i+2]==='['&&src[i+3]==='['){i+=4;while(i<src.length&&!(src[i]===']'&&src[i+1]===']'))i++;i+=2;}else{while(i<src.length&&src[i]!=='\n')i++;}continue;}if(src[i]==='['&&src[i+1]==='['){i+=2;let s='';while(i<src.length&&!(src[i]===']'&&src[i+1]===']')){s+=src[i++];}i+=2;toks.push({t:TK.STR,v:s});continue;}if(src[i]==='"'||src[i]==="'"){const q=src[i++];let s='';while(i<src.length&&src[i]!==q){if(src[i]==='\\'){i++;const e=src[i++];if(e==='n')s+='\n';else if(e==='t')s+='\t';else if(e==='r')s+='\r';else if(e==='\\')s+='\\';else if(e==='"')s+='"';else if(e==="'")s+="'";else if(/\d/.test(e)){let n=e;if(/\d/.test(src[i]))n+=src[i++];if(/\d/.test(src[i]))n+=src[i++];s+=String.fromCharCode(parseInt(n));}else s+=e;}else s+=src[i++];}i++;toks.push({t:TK.STR,v:s});continue;}if(/\d/.test(src[i])||(src[i]==='.'&&/\d/.test(src[i+1]))){let n='';if(src[i]==='0'&&(src[i+1]==='x'||src[i+1]==='X')){n='0x';i+=2;while(i<src.length&&/[0-9a-fA-F]/.test(src[i]))n+=src[i++];}else{while(i<src.length&&(/\d/.test(src[i])||src[i]==='.'||src[i]==='e'||src[i]==='E'))n+=src[i++];}toks.push({t:TK.NUM,v:Number(n)});continue;}if(/[a-zA-Z_]/.test(src[i])){let n='';while(i<src.length&&/\w/.test(src[i]))n+=src[i++];toks.push({t:KW.has(n)?n:TK.NAME,v:n});continue;}const three=src.slice(i,i+3);if(three==='...'){toks.push({t:TK.DOTDOTDOT,v:'...'});i+=3;continue;}const two=src.slice(i,i+2);const cmap={'+=':TK.ADDASSIGN,'-=':TK.SUBASSIGN,'*=':TK.MULASSIGN,'/=':TK.DIVASSIGN,'%=':TK.MODASSIGN};if(cmap[two]){toks.push({t:cmap[two],v:two});i+=2;continue;}const dmap={'==':TK.EQ,'~=':TK.NEQ,'<=':TK.LTE,'>=':TK.GTE,'..':TK.DOTDOT};if(dmap[two]){toks.push({t:dmap[two],v:two});i+=2;continue;}const smap={'=':TK.ASSIGN,'+':TK.PLUS,'-':TK.MINUS,'*':TK.STAR,'/':TK.SLASH,'%':TK.PERCENT,'^':TK.CARET,'#':TK.HASH,'.':TK.DOT,':':TK.COLON,';':TK.SEMI,',':TK.COMMA,'(':TK.LPAREN,')':TK.RPAREN,'[':TK.LBRACKET,']':TK.RBRACKET,'{':TK.LBRACE,'}':TK.RBRACE,'<':TK.LT,'>':TK.GT};if(smap[src[i]]){toks.push({t:smap[src[i]],v:src[i]});i++;continue;}i++;}toks.push({t:TK.EOF,v:null});return toks;}

// ══════════════════════════════════════════════════════════════════════════════
// OPCODES
// ══════════════════════════════════════════════════════════════════════════════
const OP={LOAD_K:0,LOAD_NIL:1,LOAD_BOOL:2,LOAD_VAR:3,STORE_VAR:4,LOAD_GLOBAL:5,STORE_GLOBAL:6,ADD:10,SUB:11,MUL:12,DIV:13,MOD:14,POW:15,UNM:16,CONCAT:17,LEN:18,EQ:20,NEQ:21,LT:22,LTE:23,GT:24,GTE:25,NOT:26,AND:27,OR:28,JMP:30,JMP_FALSE:31,JMP_TRUE:32,NEW_TABLE:40,SET_FIELD:41,GET_FIELD:42,SET_INDEX:43,GET_INDEX:44,MAKE_CLOSURE:50,CALL:51,RETURN:52,VARARG:53,POP:60,DUP:61};

// ══════════════════════════════════════════════════════════════════════════════
// COMPILER
// ══════════════════════════════════════════════════════════════════════════════
class Compiler{
  constructor(){this.code=[];this.consts=[];this.protos=[];this.locals=[];this.depth=0;this.breaks=[];}
  addConst(v){const i=this.consts.findIndex(c=>c===v);if(i>=0)return i;this.consts.push(v);return this.consts.length-1;}
  emit(...a){this.code.push(a);return this.code.length-1;}
  patch(i,f,v){this.code[i][f]=v;}
  here(){return this.code.length;}
  findLocal(n){for(let i=this.locals.length-1;i>=0;i--)if(this.locals[i].name===n)return i;return -1;}
  pushLocal(n){this.locals.push({name:n,depth:this.depth});}
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
        const iS=this.locals.length;
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
        const iS=this.locals.length;
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
        this.compileExpr(p);n=1;while(p.peek().t===TK.COMMA){p.next();this.compileExpr(p);n++;}
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
        targets.push(li>=0?{kind:"local",idx:li}:{kind:"global",idx:this.addConst(name)});
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
        else if(last[0]===OP.LOAD_GLOBAL)this.emit(OP.STORE_GLOBAL,last[1]);
        else if(last[0]===OP.GET_FIELD)this.emit(OP.SET_FIELD,-1,last[2]);
        else this.emit(OP.POP);
      }else{
        const bop={[TK.ADDASSIGN]:OP.ADD,[TK.SUBASSIGN]:OP.SUB,[TK.MULASSIGN]:OP.MUL,[TK.DIVASSIGN]:OP.DIV,[TK.MODASSIGN]:OP.MOD}[opTk];
        this.compileExpr(p);this.emit(bop);
        if(last[0]===OP.LOAD_VAR)this.emit(OP.STORE_VAR,last[1]);
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
    const sub=new Compiler();sub.depth=1;
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
      else if(p.peek().t===TK.COLON){p.next();const m=p.expect(TK.NAME).v;this.emit(OP.DUP);this.emit(OP.GET_FIELD,-1,this.addConst(m));const ac=this.compileArgs(p,true);this.emit(OP.CALL,ac,1);}
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
    else if(tk.t===TK.NAME){p.next();const li=this.findLocal(tk.v);if(li>=0)this.emit(OP.LOAD_VAR,li);else this.emit(OP.LOAD_GLOBAL,this.addConst(tk.v));}
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
// SERIALIZE + BYTECODE ENCRYPT
// ══════════════════════════════════════════════════════════════════════════════
function serializeProto(p){
  const out=[];
  out.push(p.consts.length);
  for(const c of p.consts){
    if(c===null||c===undefined){out.push(3);}
    else if(typeof c==='boolean'){out.push(2,c?1:0);}
    else if(typeof c==='number'){
      out.push(0);const buf=new ArrayBuffer(8);new DataView(buf).setFloat64(0,c,true);
      const a=new Uint8Array(buf);for(const b of a)out.push(b);
    } else {
      out.push(1,c.length);for(let i=0;i<c.length;i++)out.push(c.charCodeAt(i));
    }
  }
  out.push(p.code.length);
  for(const ins of p.code){out.push(ins.length);for(const v of ins)out.push(v==null?0:v);}
  out.push(p.protos.length);
  for(const s of p.protos)out.push(...serializeProto(s));
  return out;
}

function compile(src){
  const toks=lex(src);const p=new Parser(toks);const c=new Compiler();
  c.compileBlock(p);
  if(!c.code.length||c.code[c.code.length-1][0]!==OP.RETURN)c.emit(OP.RETURN,0);
  return serializeProto({code:c.code,consts:c.consts,protos:c.protos,params:0,vararg:true});
}

// ══════════════════════════════════════════════════════════════════════════════
// EMIT VM + BYTECODE AS LUA
// ══════════════════════════════════════════════════════════════════════════════
function rndI(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
const IDS=['l','I','1','O','0'];
function id(n){n=n||rndI(7,13);let s='_';for(let i=0;i<n;i++)s+=IDS[rndI(0,4)];return s;}
function luaEsc(s){return s.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n').replace(/\t/g,'\\t');}

function emitVMLua(bc){
  // Rolling XOR encrypt the bytecode
  const seed=rndI(1,250);
  const enc=bc.map((v,i)=>(v^((seed+i*7)%251))&0xFF);

  const bcN=id(10),sdN=id(5),iN=id(3);
  const vmN=id(10),DN=id(3),EN=id(3),prN=id(3);
  const stk=id(4),sp=id(3),loc=id(4),pcN=id(3),codeN=id(4),KN=id(2);
  const pu=id(3),po=id(3),pk=id(3),ins=id(3),opN=id(2);
  const bN=id(3),aN=id(3),vN=id(3),tN=id(2),fn=id(3),rN=id(3),caN=id(3);
  const nN=id(3),acN=id(3),nrN=id(3),posN=id(4),pN=id(3),ncN=id(3),niN=id(3),npN=id(3);
  const ctN=id(3),slN=id(3),chN=id(3),ilN=id(3),spN2=id(4),envN=id(4),argsN=id(4);

  return `local ${sdN}=${seed};local ${bcN}={${enc.join(',')}};for ${iN}=1,#${bcN} do ${bcN}[${iN}]=(${bcN}[${iN}])~(((${sdN}+(${iN}-1)*7)%251)) end
local function ${vmN}(bc)
local function ${DN}(bc,${posN}) ${posN}=${posN} or 1
local ${pN}={consts={},code={},protos={}}
local ${ncN}=bc[${posN}];${posN}=${posN}+1
for i=1,${ncN} do local ${ctN}=bc[${posN}];${posN}=${posN}+1
if ${ctN}==3 then ${pN}.consts[i]=nil
elseif ${ctN}==2 then ${pN}.consts[i]=(bc[${posN}]==1);${posN}=${posN}+1
elseif ${ctN}==0 then local ${bN}={};for j=1,8 do ${bN}[j]=bc[${posN}];${posN}=${posN}+1 end
local s=string.char(table.unpack(${bN}))
${pN}.consts[i]=string.unpack and string.unpack("<d",s) or (${bN}[1]+${bN}[2]*256+${bN}[3]*65536+${bN}[4]*16777216)
elseif ${ctN}==1 then local ${slN}=bc[${posN}];${posN}=${posN}+1;local ${chN}={};for j=1,${slN} do ${chN}[j]=string.char(bc[${posN}]);${posN}=${posN}+1 end;${pN}.consts[i]=table.concat(${chN}) end
end
local ${niN}=bc[${posN}];${posN}=${posN}+1
for i=1,${niN} do local ${ilN}=bc[${posN}];${posN}=${posN}+1;local ins={};for j=1,${ilN} do ins[j]=bc[${posN}];${posN}=${posN}+1 end;${pN}.code[i]=ins end
local ${npN}=bc[${posN}];${posN}=${posN}+1
for i=1,${npN} do local sp,np2=${DN}(bc,${posN});${pN}.protos[i]=sp;${posN}=np2 end
return ${pN},${posN} end
local function ${EN}(${prN},${envN},${argsN})
${envN}=${envN} or _G;${argsN}=${argsN} or {}
local ${stk}={};local ${sp}=0;local ${loc}={}
for i,v in ipairs(${argsN}) do ${loc}[i]=v end
local function ${pu}(v) ${sp}=${sp}+1;${stk}[${sp}]=v end
local function ${po}() local v=${stk}[${sp}];${stk}[${sp}]=nil;${sp}=${sp}-1;return v end
local function ${pk}() return ${stk}[${sp}] end
local ${pcN}=1;local ${codeN}=${prN}.code;local ${KN}=${prN}.consts
while ${pcN}<=#${codeN} do
local ${ins}=${codeN}[${pcN}];local ${opN}=${ins}[1];${pcN}=${pcN}+1
if ${opN}==0 then ${pu}(${KN}[${ins}[2]+1])
elseif ${opN}==1 then ${pu}(nil)
elseif ${opN}==2 then ${pu}(${ins}[2]==1)
elseif ${opN}==3 then ${pu}(${loc}[${ins}[2]+1])
elseif ${opN}==4 then ${loc}[${ins}[2]+1]=${po}()
elseif ${opN}==5 then ${pu}(${envN}[${KN}[${ins}[2]+1]])
elseif ${opN}==6 then ${envN}[${KN}[${ins}[2]+1]]=${po}()
elseif ${opN}==10 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN}+${bN})
elseif ${opN}==11 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN}-${bN})
elseif ${opN}==12 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN}*${bN})
elseif ${opN}==13 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN}/${bN})
elseif ${opN}==14 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN}%${bN})
elseif ${opN}==15 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN}^${bN})
elseif ${opN}==16 then ${pu}(-${po}())
elseif ${opN}==17 then local ${bN}=${po}();local ${aN}=${po}();${pu}(tostring(${aN})..tostring(${bN}))
elseif ${opN}==18 then ${pu}(#${po}())
elseif ${opN}==20 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN}==${bN})
elseif ${opN}==21 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN}~=${bN})
elseif ${opN}==22 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN}<${bN})
elseif ${opN}==23 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN}<=${bN})
elseif ${opN}==24 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN}>${bN})
elseif ${opN}==25 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN}>=${bN})
elseif ${opN}==26 then ${pu}(not ${po}())
elseif ${opN}==27 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN} and ${bN})
elseif ${opN}==28 then local ${bN}=${po}();local ${aN}=${po}();${pu}(${aN} or ${bN})
elseif ${opN}==30 then ${pcN}=${ins}[2]+1
elseif ${opN}==31 then if not ${po}() then ${pcN}=${ins}[2]+1 end
elseif ${opN}==32 then if ${po}() then ${pcN}=${ins}[2]+1 end
elseif ${opN}==40 then ${pu}({})
elseif ${opN}==41 then local ${vN}=${po}();local t=${pk}();t[${KN}[${ins}[3]+1]]=${vN}
elseif ${opN}==42 then local t=${po}();${pu}(t[${KN}[${ins}[3]+1]])
elseif ${opN}==43 then local ${vN}=${po}();local t=${pk}();t[${ins}[3]]=${vN}
elseif ${opN}==44 then local k=${po}();local t=${po}();${pu}(t[k])
elseif ${opN}==50 then local sp2=${prN}.protos[${ins}[2]+1];${pu}(function(...) return ${EN}(sp2,${envN},{...}) end)
elseif ${opN}==51 then local ${acN}=${ins}[2];local ${nrN}=${ins}[3];local ${caN}={};for i=${acN},1,-1 do ${caN}[i]=${po}() end;local ${fn}=${po}();local ${rN}={${fn}(table.unpack(${caN}))};for i=1,${nrN} do ${pu}(${rN}[i]) end
elseif ${opN}==52 then local ${nN}=${ins}[2];local ${rN}={};for i=${nN},1,-1 do ${rN}[i]=${po}() end;return table.unpack(${rN})
elseif ${opN}==53 then for _,v in ipairs(${argsN}) do ${pu}(v) end
elseif ${opN}==60 then ${po}()
elseif ${opN}==61 then ${pu}(${pk}())
end end end
local ${prN}=${DN}(bc);${EN}(${prN},_G,{}) end
${vmN}(${bcN})`;
}

// ══════════════════════════════════════════════════════════════════════════════
// V4 WRAPPING LAYERS (applied after VM emit)
// ══════════════════════════════════════════════════════════════════════════════
function L_var(code){
  const map={};
  code=code.replace(/\blocal\s+function\s+([a-zA-Z_]\w*)/g,(m,n)=>{if(!map[n])map[n]=id();return'local function '+map[n];});
  code=code.replace(/\blocal\s+([a-zA-Z_]\w*)/g,(m,n)=>{if(!map[n])map[n]=id();return'local '+map[n];});
  for(const[k,v]of Object.entries(map))code=code.replace(new RegExp('\\b'+k+'\\b','g'),v);
  return code;
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
