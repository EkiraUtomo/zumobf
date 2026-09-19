importScripts('compiler.js');

self.onmessage=function(e){
  const{src,opts,intensity,targetBytes,mode}=e.data;
  let code=src,n=0;
  function step(name,fn){code=fn(code);n++;self.postMessage({type:'log',msg:''+name+' → '+code.length.toLocaleString()+' chars'});}
  function lg(m){self.postMessage({type:'log',msg:m});}

  try{
    if(mode==='vm'){
      lg('Compiling to bytecode...');
      const bc=compile(src);
      lg('Compiled — '+bc.length+' bytecode numbers');
      code=emitVMLua(bc);n++;
      lg('VM emitted — '+code.length.toLocaleString()+' chars');
    } else {
      lg('Fallback mode — applying v4 layers to source directly');
      code=L_fallbackFull(code);n++;
      lg('Base transforms — '+code.length.toLocaleString()+' chars');
    }

    if(opts.o_var)  step('Variable mangling',L_var);
    if(opts.o_junk) step('Stealthy junk',c=>L_junk(c,intensity));
    if(opts.o_dead) step('Dead branches',L_dead);
    if(opts.o_poly) step('Polymorphic XOR',L_poly);
    if(opts.o_scope)step('Scope bomb',L_scope);
    if(opts.o_flow) step('Control flow mangle',L_flow);
    if(opts.o_wrap){
      if(mode==='vm') lg('Loadstring wrap skipped in VM mode — the VM executes bytecode directly.');
      else step('Loadstring wrap',L_wrap);
    }
    if(opts.o_bytes){
      if(mode==='vm') lg('Byte-array loader skipped in VM mode — keeping the output load-free.');
      else step('Byte array encode',L_bytes);
    }

    let out=compact(code);
    if(targetBytes>0&&out.length<targetBytes){lg('Padding...');out=pad(out,targetBytes);lg('Padded → '+fmtB(out.length));}

    self.postMessage({type:'done',result:out,n,iLen:src.length,oLen:out.length,mode});
  }catch(err){
    self.postMessage({type:'error',msg:err.message});
  }
};
