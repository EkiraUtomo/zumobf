'use strict';
importScripts('compiler.js');
self.onmessage = function(e){
  const {src, intensity} = e.data;
  try {
    const out = obfuscate(src, {intensity: intensity||3});
    self.postMessage({ok:true, out});
  } catch(err) {
    self.postMessage({ok:false, error: err.message});
  }
};
