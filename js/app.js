'use strict';

const inputEl  = document.getElementById('input');
const outputEl = document.getElementById('output');
const obfBtn   = document.getElementById('obf-btn');
const copyBtn  = document.getElementById('copy-btn');
const clearBtn = document.getElementById('clear-btn');
const statusDot= document.getElementById('status-dot');
const statusTxt= document.getElementById('status-txt');
const intensityEl = document.getElementById('intensity');
const intensityVal= document.getElementById('intensity-val');
const inStats  = document.getElementById('in-stats');
const outStats = document.getElementById('out-stats');

let worker = null;

function makeWorker(){
  if(worker) worker.terminate();
  worker = new Worker('js/worker.js');
  worker.onmessage = function(e){
    const {ok, out, error} = e.data;
    if(ok){
      outputEl.textContent = out;
      setStatus('ok', 'Done');
      updateOutStats(out);
    } else {
      outputEl.textContent = '-- Error: '+error;
      setStatus('err', 'Parse error');
    }
    obfBtn.disabled = false;
  };
  worker.onerror = function(e){
    setStatus('err', 'Worker error');
    obfBtn.disabled = false;
  };
}

function setStatus(type, msg){
  statusDot.className = 'dot ' + (type||'');
  statusTxt.textContent = msg;
}

function updateInStats(){
  const lines = inputEl.value.split('\n').length;
  const bytes = new TextEncoder().encode(inputEl.value).length;
  inStats.textContent = lines + ' lines · ' + formatBytes(bytes);
}

function updateOutStats(text){
  const lines = text.split('\n').length;
  const bytes = new TextEncoder().encode(text).length;
  outStats.className = 'chip green';
  outStats.textContent = lines + ' lines · ' + formatBytes(bytes);
}

function formatBytes(n){
  if(n < 1024) return n + 'B';
  return (n/1024).toFixed(1) + 'KB';
}

intensityEl.addEventListener('input', function(){
  intensityVal.textContent = this.value;
});

inputEl.addEventListener('input', updateInStats);
updateInStats();

obfBtn.addEventListener('click', function(){
  const src = inputEl.value.trim();
  if(!src){ setStatus('err','No input'); return; }
  obfBtn.disabled = true;
  setStatus('spin','Obfuscating…');
  outputEl.textContent = '';
  outStats.textContent = '';
  outStats.className = 'chip';
  makeWorker();
  worker.postMessage({ src, intensity: parseInt(intensityEl.value) });
});

copyBtn.addEventListener('click', function(){
  const text = outputEl.textContent;
  if(!text) return;
  navigator.clipboard.writeText(text).then(function(){
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    setTimeout(function(){ copyBtn.textContent='Copy'; copyBtn.classList.remove('copied'); }, 1500);
  });
});

clearBtn.addEventListener('click', function(){
  inputEl.value = '';
  outputEl.textContent = '';
  outStats.textContent = '';
  outStats.className = 'chip';
  inStats.textContent = '0 lines';
  setStatus('', 'Ready');
});

setStatus('', 'Ready');
