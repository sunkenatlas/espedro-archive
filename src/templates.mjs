export const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g,'\\u003c');
export function normalizeBasePath(basePath = '/') {
  const pathname = new URL(basePath || '/', 'https://archive.invalid/').pathname;
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}
const sourceLabel = value => String(value).replace(/\s*·\s*原文\s*P\d+(?:[—–-]P?\d+)?/g,'').replace(/\s*·\s*P\d+(?:[—–-]P?\d+)?/g,'');
export function icon(name, cls = '') {
  const paths = {
    arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    down:'<path d="M12 4v16m-6-6 6 6 6-6"/>',
    back:'<path d="M20 12H5m6-6-6 6 6 6"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    expand:'<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
    grid:'<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
    list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    book:'<path d="M12 6c-3-3-8-2-9-1v14c3-2 6-1 9 1 3-2 6-3 9-1V5c-3-1-6-2-9 1Zm0 0v14"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
  };
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
}
const seal = `<svg class="brand-seal" viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="1"/><path d="M10 33h28M15 33V21h6v12m0 0V13h6v20m0 0V24h6v9M24 8v2M8 24h2m28 0h2M24 38v2" stroke="currentColor" stroke-width="1"/><path d="M18 10a17 17 0 0 0-8 8m20-8a17 17 0 0 1 8 8" stroke="currentColor" stroke-width="2"/></svg>`;

function header(base, active) {
  return `<a class="skip-link" href="#main">跳到正文</a><header class="site-header"><a class="brand" href="${base}index.html" aria-label="Espedro 图鉴首页">${seal}<span>ESPEDRO<small>异常生物图鉴</small></span></a><nav aria-label="主导航"><a href="${base}index.html#catalogue" ${active==='archive'?'aria-current="page"':''}>档案索引</a><a href="${base}about.html" ${active==='about'?'aria-current="page"':''}>关于档案</a></nav><a class="header-search" href="${base}index.html#search" aria-label="搜索档案">${icon('search')}<span>检索</span></a></header>`;
}
function footer(base) {
  return `<footer class="site-footer"><a class="footer-brand" href="${base}index.html">ESPEDRO<span>异常生物图鉴</span></a><p>我们保留记录。<br>也保留记录中的疑问。</p><div><a href="${base}about.html">编目说明 ${icon('arrow')}</a><small>基于《E市规则类怪谈》的虚构档案作品</small></div></footer>`;
}
export function shell({title,description,base='',active='archive',body,images=[],entities=[],page='home',heroImage,recoverRoot=false,siteBasePath='/'}) {
  const recoveryBase = recoverRoot ? `<script>(()=>{const basePath=${json(normalizeBasePath(siteBasePath))};const pathname=location.pathname;const relativePath=pathname.startsWith(basePath)?pathname.slice(basePath.length):pathname.slice(1);const base=document.createElement('base');base.href='../'.repeat(relativePath.split('/').length-1)||'./';document.head.append(base);document.addEventListener('DOMContentLoaded',()=>{document.querySelector('.skip-link').href=new URL('#main',location.href).href;},{once:true});})();</script>` : '';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">${recoveryBase}<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#111314"><meta name="color-scheme" content="dark"><title>${esc(title)} | Espedro 异常生物图鉴</title><meta name="description" content="${esc(description)}"><meta property="og:title" content="${esc(title)} | Espedro"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><link rel="icon" type="image/svg+xml" href="${base}assets/favicon.svg"><link rel="stylesheet" href="${base}assets/site.css"><link rel="stylesheet" href="${base}assets/viewer.css">${heroImage?`<link rel="preload" as="image" href="${heroImage}">`:''}<script type="module" src="${base}assets/app.js"></script></head><body data-page="${page}">${header(base,active)}${body}${footer(base)}<script id="image-data" type="application/json">${json(images)}</script>${entities.length?`<script id="catalogue-data" type="application/json">${json(entities)}</script>`:''}<div class="toast" role="status" aria-live="polite"></div></body></html>`;
}
const img = (image, {lazy=true,cls='',alt='',thumb=false}={}) => `<img class="${cls}" src="${thumb?image.thumb:image.display}" width="${image.displayWidth}" height="${image.displayHeight}" alt="${esc(alt)}" ${lazy?'loading="lazy"':'fetchpriority="high"'} decoding="async">`;
const tag = text => `<span class="tag">${esc(text)}</span>`;

export function homePage(entities, images) {
  const primary = id => images.find(image => image.entityId===id && image.primary);
  const tower = primary('EA-034');
  const families = [...new Set(entities.map(e=>e.family))];
  const tags = [...new Set(entities.flatMap(e=>e.tags))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
  const cards = entities.map(entity => {
    const image = primary(entity.id);
    const count = images.filter(im=>im.entityId===entity.id).length;
    return `<article class="record" data-record="${entity.id}"><a class="record-link" href="entries/${entity.slug}.html" aria-label="查阅 ${esc(entity.name)} ${entity.id}"><figure class="record-figure" style="--ratio:${image.width}/${image.height}">${img(image,{thumb:true,alt:`${entity.name}的${image.sourceLabel}`})}<span class="record-open">调阅档案 ${icon('arrow')}</span>${count>1?`<span class="image-count">${count} 幅影像</span>`:''}</figure><div class="record-topline"><span>${entity.id}</span><span>${esc(entity.kind)}</span></div><div class="record-title"><h3>${esc(entity.name)}</h3>${icon('arrow')}</div><p class="record-english">${esc(entity.english)}</p><p class="record-summary">${esc(entity.summary)}</p><div class="record-tags">${entity.tags.slice(0,2).map(tag).join('')}</div></a></article>`;
  }).join('');
  return shell({title:'异常，留有记录',description:'Espedro 异常生物图鉴。查阅35份独立档案、42幅影像，以及这座城市留下的守则与调查记录。',images,entities,page:'home',heroImage:tower.display,body:`
    <main id="main"><section class="hero" aria-labelledby="hero-title"><div class="hero-image">${img(tower,{lazy:false,alt:'封锁线后，Hudson中学棒球场上方的塔楼'})}</div><div class="hero-shade"></div><div class="hero-topnote"><span>Espedro municipal archive</span><span>城市异常调查记录</span></div><div class="hero-copy"><p class="hero-pretitle">一座城市。三十五份异常记录。</p><h1 id="hero-title"><span class="hero-latin">ESPEDRO</span><span class="hero-chinese">异常生物图鉴</span></h1><blockquote>异常什么都不是。<br>异常甚至没有存在过。</blockquote><a class="hero-enter" href="#catalogue"><span class="round-arrow">${icon('down')}</span><span>查阅档案<small>Enter the archive</small></span></a></div><button class="hero-evidence" data-viewer="${tower.id}" aria-label="放大查看塔楼影像"><span>EA-034<small>塔楼 / The Tower</small></span>${icon('expand')}</button><div class="hero-bottom"><span><i></i> 35 份已编目档案</span><span>42 幅留存影像</span><a href="about.html">关于这份记录 ${icon('arrow')}</a></div></section>
    <section id="catalogue" class="catalogue page-gutter" aria-labelledby="catalogue-title"><div class="section-heading"><div><p class="section-kicker">The illustrated archive</p><h2 id="catalogue-title">异常名录<span>／35</span></h2></div><p class="section-intro">有些事物被拍下，有些只留下描述。<br>以下记录，来自同一座城市。</p></div>
    <form class="catalogue-filters" role="search" id="filter-form"><div class="search-control"><label for="search">检索档案</label><div>${icon('search')}<input id="search" type="search" autocomplete="off" placeholder="名称、编号、特征或守则…"><kbd>/</kbd></div></div><div class="select-control"><label for="family">原文分类</label><select id="family"><option value="">全部分类</option>${families.map(value=>`<option>${esc(value)}</option>`).join('')}</select></div><div class="select-control"><label for="hazard">危害特征</label><select id="hazard"><option value="">全部特征</option>${tags.map(value=>`<option>${esc(value)}</option>`).join('')}</select></div></form>
    <div class="catalogue-toolbar"><p id="result-count" role="status" aria-live="polite" aria-atomic="true">显示全部 <strong>35</strong> 份档案</p><div class="catalogue-tools"><button id="clear-filters" class="text-button" type="button" hidden>清除筛选</button><div class="view-switch" role="group" aria-label="目录显示方式"><button type="button" data-view="gallery" aria-label="影像目录" aria-pressed="true">${icon('grid')}</button><button type="button" data-view="index" aria-label="紧凑索引" aria-pressed="false">${icon('list')}</button></div></div></div><div class="records" id="records">${cards}</div><div id="empty-state" class="empty-state" hidden><p>没有匹配的档案。</p><span>尝试缩短关键词，或清除分类和特征筛选。</span><button type="button" data-reset>显示全部档案 ${icon('arrow')}</button></div>
    <div class="catalogue-end"><span>已至现存记录末尾</span><span>End of the available record</span></div></section>
    <section class="closing-note page-gutter"><span>接线员守则 · 第6版 · XIII</span><p>人类是具有两只眼睛，两只耳朵，<br>一只鼻子，一张嘴的灵长类生物</p><a href="about.html">阅读编目说明 ${icon('arrow')}</a></section></main>`});
}

function textSection(id, title, english, paragraphs) {
  return `<section class="dossier-section" id="${id}"><div class="dossier-section-title"><h2>${title}</h2><span>${english}</span></div>${paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`;
}
export function dossierPage(entity, all, rawImages) {
  const base = '../';
  const images = rawImages.map(im=>({...im,original:base+im.original,display:base+im.display,thumb:base+im.thumb}));
  const evidence = images.filter(im=>im.entityId===entity.id).sort((a,b)=>Number(b.primary)-Number(a.primary));
  const primary = evidence[0];
  const related = entity.related.map(id=>all.find(e=>e.id===id)).filter(Boolean);
  const prev = all[entity.number-2], next=all[entity.number];
  const document = entity.layout==='document';
  const nav=[['appearance',document?'存在性记录':'外观特征'],['behavior',document?'叙述与影响':'行为模式'],['rules','相关守则'],['response',document?'研究建议':'应对方式'],['notes','调查补记'],['source','原文摘录']];
  const sourceHtml=entity.sourceExcerpts.map(source=>`<div class="source-excerpt"><h3>${esc(sourceLabel(source.title))}</h3>${source.text.map(p=>`<p>${esc(p)}</p>`).join('')}</div>`).join('');
  const evidenceCaption = `<span>${esc(primary.sourceEnglish)}<small>${esc(primary.sourceLabel)}</small></span><span>${entity.id} / 01<small>点击影像查看全幅 ${icon('expand')}</small></span>`;
  return shell({title:`${entity.name} · ${entity.id}`,description:entity.summary,base,images,page:'dossier',heroImage:primary.display,body:`<main id="main" class="dossier page-gutter"><div class="dossier-breadcrumb"><a href="../index.html#catalogue" data-back-catalogue>${icon('back')} 返回图鉴</a><span>${entity.id}<span class="breadcrumb-divider">/</span>原文目录 ${esc(entity.taxonomy)}</span></div>
    <article><section class="dossier-opening dossier-opening--${entity.layout}${primary.width<primary.height?' dossier-opening--portrait':''}"><div class="dossier-visual"><figure class="evidence-figure"><button class="evidence-open" data-viewer="${primary.id}" aria-label="放大查看${esc(entity.name)}主影像">${img(primary,{lazy:false,alt:`${entity.name} · ${primary.sourceLabel}`})}<span class="evidence-expand">${icon('expand')} 查看全幅</span></button><figcaption>${evidenceCaption}</figcaption></figure>${evidence.length>1?`<div class="evidence-versions" aria-label="同一异常的其他影像">${evidence.map((image,i)=>`<button data-viewer="${image.id}" aria-label="查看${esc(entity.name)}影像${i+1}">${img(image,{thumb:true,alt:''})}<span>影像 ${String(i+1).padStart(2,'0')}<small>${esc(image.sourceLabel)}</small></span>${icon('expand')}</button>`).join('')}</div>`:''}</div>
    <div class="dossier-heading"><div class="dossier-id"><span>${entity.id}</span><span>${esc(entity.kind)}</span></div><h1>${esc(entity.name)}</h1><p class="dossier-english">${esc(entity.english)}</p><blockquote class="entity-quote"><p>${esc(entity.quote)}</p><cite>${esc(sourceLabel(entity.quoteSource))}</cite></blockquote><p class="dossier-summary">${esc(entity.summary)}</p><div class="dossier-tags">${entity.tags.map(tag).join('')}</div><dl class="dossier-fields"><div><dt>原文分类</dt><dd>${esc(entity.family)} <small>${esc(entity.taxonomy)}</small></dd></div><div><dt>行为倾向</dt><dd>${esc(entity.disposition)}</dd></div><div><dt>智慧记录</dt><dd>${esc(entity.intelligence)}</dd></div><div><dt>相关地点</dt><dd>${entity.locations.map(esc).join(' / ')}</dd></div></dl></div></section>
    <div class="dossier-reading"><aside class="dossier-toc"><p>本档案目录</p><nav aria-label="本档案章节">${nav.map(([id,title])=>`<a href="#${id}">${title}</a>`).join('')}</nav><div class="reading-meter"><span id="reading-percent">0%</span><span>阅读进度</span><div><i id="reading-fill"></i></div></div></aside><div class="dossier-text">
      ${textSection('appearance',document?'存在性记录':'外观特征',document?'Existence record':'Physical description',entity.appearance)}
      ${textSection('behavior',document?'叙述与影响':'行为模式',document?'Narrative & influence':'Observed behavior',entity.behavior)}
      <section class="dossier-section" id="rules"><div class="dossier-section-title"><h2>相关守则</h2><span>Associated protocols</span></div><p class="section-preface">守则产生于不同阶段。阅读时，请留意版本与适用情景。</p><div class="protocols">${entity.rules.map(rule=>`<article class="protocol"><div class="protocol-reference"><span>${esc(rule.title)}</span><h3>${esc(sourceLabel(rule.ref))}</h3></div><blockquote>${esc(rule.text)}</blockquote>${rule.note?`<p class="protocol-note">${esc(rule.note)}</p>`:''}</article>`).join('')}</div></section>
      ${textSection('response',document?'研究建议':'应对方式','Response guidance',entity.response)}
      <section class="dossier-section" id="notes"><div class="dossier-section-title"><h2>调查补记</h2><span>Supplementary observations</span></div><div class="investigation-notes">${entity.notes.map(note=>`<article class="investigation-note"><span class="note-marker">研判</span><h3>${esc(note.title)}</h3><p>${esc(note.text)}</p></article>`).join('')}</div><p class="editorial-note">本节为依据原作设定整理的调查补记。</p></section>
      <section class="dossier-section" id="source"><details class="source-details"><summary><span><strong>原文摘录</strong><small>保留原作叙述及其中的不确定性</small></span>${icon('plus')}</summary><div>${sourceHtml}</div></details></section>
    </div></div>
    <section class="related-section"><div class="section-heading"><div><p class="section-kicker">Connected records</p><h2>关联档案</h2></div><p>不同的名称，可能属于同一种接近。</p></div><div class="related-grid">${related.map(e=>{const image=images.find(im=>im.entityId===e.id&&im.primary);return `<a class="related-record" href="${e.slug}.html">${img(image,{thumb:true,alt:e.name})}<span><small>${e.id}</small><strong>${esc(e.name)}</strong><span>${esc(e.family)}</span></span>${icon('arrow')}</a>`;}).join('')}</div></section>
    <nav class="adjacent-records" aria-label="相邻档案">${prev?`<a href="${prev.slug}.html">${icon('back')}<span><small>上一份档案 / ${prev.id}</small>${esc(prev.name)}</span></a>`:'<span></span>'}${next?`<a href="${next.slug}.html"><span><small>下一份档案 / ${next.id}</small>${esc(next.name)}</span>${icon('arrow')}</a>`:`<a href="../index.html#catalogue">返回档案索引 ${icon('arrow')}</a>`}</nav></article></main>`});
}

export function aboutPage() {
  return shell({title:'关于这份记录',description:'Espedro异常生物图鉴的来源、编目方式与影像说明。',page:'about',active:'about',body:`<main id="main" class="about-page page-gutter"><div class="about-heading"><p class="section-kicker">A note on the archive</p><h1>关于这份记录</h1><p>保留那些被看见的。<br>也保留尚未被理解的。</p></div><div class="about-content"><section><h2>一座城市的异常名录</h2><p>本图鉴根据《E市规则类怪谈》整理，收录现有影像中的35个异常主体，以及42幅相关影像。它是一份虚构的城市调查档案，也是原作世界的一种阅读方式。</p><p>每个名称对应独立档案。同一主体的不同影像归于同一档案；“手指”“天空”“翅膀”“四肢”等原文大类用于建立条目之间的关系。</p></section><section><h2>原文、归纳与补记</h2><p>名称下方的引句摘自原作。子类没有独立引句时，沿用所属大类的引句，并注明出处。档案正文将原作材料归纳为外观、行为、守则与应对；“原文摘录”保留对应段落。</p><p>“调查补记”是在已有设定内形成的补充与研判。它保留记录者可能出错、材料彼此矛盾的空间。不同版本的守则并不一定同时有效，亦不应消除它们之间的矛盾。</p></section><section><h2>编号与分类</h2><p>EA-001至EA-035是本图鉴的索引编号。档案中的罗马数字及字母沿用原文目录层级；两种编号分别标注。</p><p>危害特征用于检索具体影响，不构成完整的危险等级体系。“中立”描述行为倾向，不代表接触安全。</p></section><section><h2>关于影像</h2><p>影像保留原有比例和拍摄质感。点击可以查看全幅、缩放细节，或在同一异常的多幅影像之间切换。</p><p>“市民摄影”“行车记录”“监控记录”“执法记录”“军事现场”“研究文献”等标签按画面呈现方式编目，并不代表经过核验的真实拍摄来源。无法判断的材料统一记作“现场影像”。图片中已有的文字、痕迹与遮蔽亦属于画面本身。</p></section><a class="about-return" href="index.html#catalogue">进入异常名录 ${icon('arrow')}</a></div></main>`});
}
export function notFoundPage(siteBasePath = '/') {
  return shell({title:'记录未找到',description:'这份档案不在现存索引中。',page:'404',recoverRoot:true,siteBasePath,body:`<main id="main" class="not-found page-gutter"><span>404 / Record unavailable</span><h1>这份记录<br>不在索引中。</h1><p>请返回图鉴，重新检索名称或档案编号。</p><a href="index.html#catalogue">返回档案索引 ${icon('arrow')}</a></main>`});
}
