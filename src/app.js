import { filterEntities, stateFromSearch, searchFromState } from './catalogue-core.js';
import { initViewer } from './viewer.js';

const readData = id => JSON.parse(document.getElementById(id)?.textContent || '[]');
const storage = {
  read(key, fallback=null) { try { return JSON.parse(sessionStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  write(key, value) { try { sessionStorage.setItem(key,JSON.stringify(value)); } catch {} },
};
initViewer(readData('image-data'));

function showImageFailure(image) {
  if (image.closest('.viewer-dialog')) return;
  const parent = image.parentElement;
  if (parent.classList.contains('image-failed')) return;
  parent.classList.add('image-failed');
  const message = document.createElement('span');
  message.className = 'image-error-message';
  message.textContent = '影像未能载入，请刷新页面重试。档案正文仍可查阅。';
  parent.append(message);
}
document.addEventListener('error', event => { if (event.target instanceof HTMLImageElement) showImageFailure(event.target); },true);
document.querySelectorAll('img').forEach(image => { if (image.complete && !image.naturalWidth) showImageFailure(image); });

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const records = document.getElementById('records');
if (records) {
  const entities = readData('catalogue-data');
  const search = document.getElementById('search');
  const family = document.getElementById('family');
  const hazard = document.getElementById('hazard');
  const clear = document.getElementById('clear-filters');
  const empty = document.getElementById('empty-state');
  let state = stateFromSearch(location.search);
  if (!new URLSearchParams(location.search).has('view')) state.view=storage.read('espedro:view','gallery');
  let animation;

  function remember() {
    storage.write('espedro:catalogue',{ search:searchFromState(state), scroll:window.scrollY });
  }
  function render({updateUrl=true,animate=false}={}) {
    const results = filterEntities(entities,state);
    const visible = new Set(results.map(entity=>entity.id));
    records.querySelectorAll('[data-record]').forEach(record=>{ record.hidden=!visible.has(record.dataset.record); });
    records.classList.toggle('records--index',state.view==='index');
    document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===state.view)));
    clear.hidden=!(state.q || state.family || state.tag);
    empty.hidden=results.length>0;
    records.hidden=results.length===0;
    const count = document.getElementById('result-count');
    count.replaceChildren();
    const number=document.createElement('strong');number.textContent=String(results.length);
    count.append(state.q || state.family || state.tag ? '检索到 ' : '显示全部 ', number,' 份档案');
    if(updateUrl) history.replaceState({...history.state, catalogue:true},'',`${location.pathname}${searchFromState(state)}${location.hash}`);
    storage.write('espedro:view',state.view);
    if(updateUrl)remember();
    if(animate && !reduced.matches){ animation?.cancel(); animation=records.animate([{opacity:.55},{opacity:1}],{duration:320,easing:'ease-out'}); }
  }
  function syncControls() { search.value=state.q;family.value=state.family;hazard.value=state.tag;state.family=family.value;state.tag=hazard.value; }
  function reset(){ state={q:'',family:'',tag:'',view:state.view};syncControls();render({animate:true}); }
  syncControls();render({updateUrl:false});
  document.getElementById('filter-form').addEventListener('submit',event=>event.preventDefault());
  search.addEventListener('input',()=>{state.q=search.value;render({animate:false});});
  family.addEventListener('change',()=>{state.family=family.value;render({animate:true});});
  hazard.addEventListener('change',()=>{state.tag=hazard.value;render({animate:true});});
  clear.addEventListener('click',reset);document.querySelector('[data-reset]').addEventListener('click',reset);
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{state.view=button.dataset.view;render({animate:true});}));
  window.addEventListener('popstate',()=>{state=stateFromSearch(location.search);syncControls();render({updateUrl:false});});
  window.addEventListener('pagehide',remember);
  records.addEventListener('click',event=>{ if(event.target.closest('a'))remember(); });
  const saved=storage.read('espedro:catalogue');
  if(storage.read('espedro:restore',false)&&saved){
    storage.write('espedro:restore',false);
    requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:saved.scroll,behavior:'instant'})));
  }
  if(location.hash==='#search')search.focus({preventScroll:true});
  document.addEventListener('keydown',event=>{
    if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.target.closest('input,textarea,select,dialog,[contenteditable]')){
      event.preventDefault();search.focus();search.scrollIntoView({block:'center',behavior:reduced.matches?'instant':'smooth'});
    }
  });
}

const back=document.querySelector('[data-back-catalogue]');
if(back){
  const saved=storage.read('espedro:catalogue');
  if(saved){back.href=`../index.html${saved.search || ''}#catalogue`;back.addEventListener('click',()=>storage.write('espedro:restore',true));}
}

const sections=[...document.querySelectorAll('.dossier-section[id]')];
const toc=[...document.querySelectorAll('.dossier-toc a')];
const meter=document.getElementById('reading-fill');
const hero=document.querySelector('.hero-image');
let scrollQueued=false;
function updateScroll(){
  scrollQueued=false;
  if(hero&&!reduced.matches&&window.scrollY<window.innerHeight*1.5)hero.style.transform=`translateY(${Math.min(window.scrollY*.12,110)}px)`;
  if(!sections.length)return;
  const anchorThreshold=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--anchor-offset'))+2;
  let current=sections[0].id;
  for(const section of sections)if(section.getBoundingClientRect().top<anchorThreshold)current=section.id;
  toc.forEach(link=>{const active=link.hash===`#${current}`;link.classList.toggle('is-current',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  const start=sections[0].getBoundingClientRect().top+window.scrollY;
  const end=sections.at(-1).getBoundingClientRect().bottom+window.scrollY;
  const progress=Math.min(1,Math.max(0,(window.scrollY+window.innerHeight*.55-start)/(end-start)));
  if(meter)meter.style.transform=`scaleX(${progress})`;
  const percent=document.getElementById('reading-percent');if(percent)percent.textContent=`${Math.round(progress*100)}%`;
}
function queueScroll(){if(!scrollQueued){scrollQueued=true;requestAnimationFrame(updateScroll);}}
window.addEventListener('scroll',queueScroll,{passive:true});window.addEventListener('resize',queueScroll,{passive:true});updateScroll();
if(!reduced.matches&&'IntersectionObserver'in window){
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    entry.target.animate([{opacity:.35,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)',delay:Number(entry.target.dataset.revealDelay||0)});
    observer.unobserve(entry.target);
  }),{threshold:.08});
  document.querySelectorAll('.section-heading,.dossier-section-title,.record:nth-child(-n+6),.closing-note').forEach((element,index)=>{element.dataset.revealDelay=String(index%3*50);observer.observe(element);});
}
