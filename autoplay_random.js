(function(){
  function spawnLeaves(){
    var box = document.getElementById('leaves');
    if(!box) return;
    box.innerHTML = '';
    var count = 36;
    for(var i = 0; i < count; i++){
      var el = document.createElement('div');
      el.className = 'leaf';
      el.style.left = (Math.random() * 100) + '%';
      var s = 11 + Math.random() * 14;
      el.style.width = s + 'px';
      el.style.height = (s * 0.8) + 'px';
      var dur = 9 + Math.random() * 14;
      var delay = -(Math.random() * 20);
      el.style.animationDuration = dur + 's';
      el.style.webkitAnimationDuration = dur + 's';
      el.style.animationDelay = delay + 's';
      el.style.webkitAnimationDelay = delay + 's';
      box.appendChild(el);
    }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', spawnLeaves);
  } else {
    spawnLeaves();
  }
  setTimeout(spawnLeaves, 300);

  /* Chaotic blob motion via JS — always visible, stays on screen */
  function initBlobs(){
    var nodes = document.querySelectorAll('.liquid-bg .blob');
    if(!nodes.length) return;
    var blobs = [];
    var w = window.innerWidth;
    var h = window.innerHeight;
    for(var i = 0; i < nodes.length; i++){
      var el = nodes[i];
      var size = el.offsetWidth || 200;
      var maxX = Math.max(20, w - size * 0.55);
      var maxY = Math.max(20, h - size * 0.55);
      blobs.push({
        el: el,
        x: Math.random() * maxX,
        y: Math.random() * maxY,
        vx: (Math.random() - 0.5) * 0.55,
        vy: (Math.random() - 0.5) * 0.55,
        size: size,
        baseOp: 0.28 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        speed: 0.014 + Math.random() * 0.016
      });
    }
    function resize(){
      w = window.innerWidth;
      h = window.innerHeight;
      for(var i = 0; i < blobs.length; i++){
        var b = blobs[i];
        b.size = b.el.offsetWidth || b.size;
        b.x = Math.min(b.x, Math.max(0, w - b.size * 0.55));
        b.y = Math.min(b.y, Math.max(0, h - b.size * 0.55));
      }
    }
    window.addEventListener('resize', resize);
    var last = performance.now();
    function tick(now){
      var dt = Math.min(32, now - last) / 16.67;
      last = now;
      for(var i = 0; i < blobs.length; i++){
        var b = blobs[i];
        /* calm chaotic drift */
        b.vx += (Math.random() - 0.5) * 0.06 * dt;
        b.vy += (Math.random() - 0.5) * 0.06 * dt;
        /* soft speed limit */
        var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        var maxSp = 0.7;
        if(sp > maxSp){ b.vx = b.vx / sp * maxSp; b.vy = b.vy / sp * maxSp; }
        b.x += b.vx * dt * 1.15;
        b.y += b.vy * dt * 1.15;
        var maxX = Math.max(10, w - b.size * 0.5);
        var maxY = Math.max(10, h - b.size * 0.5);
        if(b.x < 0){ b.x = 0; b.vx = Math.abs(b.vx) * 0.85 + 0.08; }
        if(b.y < 0){ b.y = 0; b.vy = Math.abs(b.vy) * 0.85 + 0.08; }
        if(b.x > maxX){ b.x = maxX; b.vx = -Math.abs(b.vx) * 0.85 - 0.08; }
        if(b.y > maxY){ b.y = maxY; b.vy = -Math.abs(b.vy) * 0.85 - 0.08; }
        b.phase += b.speed * dt;
        var pulse = 0.65 + 0.35 * Math.sin(b.phase);
        var sc = 0.95 + 0.08 * Math.sin(b.phase * 0.7);
        b.el.style.transform = 'translate3d(' + b.x + 'px,' + b.y + 'px,0) scale(' + sc + ')';
        b.el.style.opacity = (b.baseOp * pulse).toFixed(3);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initBlobs);
  } else {
    initBlobs();
  }
})();

/* ===== Now Playing: случайный трек при заходе =====
   Треки лежат в папке music/ рядом с этим файлом.
   Название / исполнитель / обложка читаются из ID3-тегов mp3,
   если тегов нет — берутся из имени файла «Исполнитель — Название.mp3». */
(function(){
  var MUSIC_DIR = 'music/';
  var TRACKS = [
    'outfxxxld — Full Metal Jacket.mp3',
    'wtwice — Take the L.mp3',
    'xxxmanera — Скажи мне кто ты.mp3',
    'Шайни — Yeyo!.mp3',
    'CUPSIZE — Юра, Юра.mp3',
    'lightprey — тупая сука.mp3',
    'MON8WOOD, Slattganger, Murkish Huken — Wasted.mp3'
  ];

  var np = document.getElementById('np');
  if(!np) return;
  var elImg = document.getElementById('npImg'),
      elTitle = document.getElementById('npTitle'),
      elArtist = document.getElementById('npArtist'),
      elCur = document.getElementById('npCur'),
      elDur = document.getElementById('npDur'),
      elBar = document.getElementById('npBar'),
      elBubble = document.getElementById('npBubble'),
      elHint = document.getElementById('npHint');

  /* ---------- ID3 ---------- */
  function synchsafe(u,p){ return (u[p]&127)<<21 | (u[p+1]&127)<<14 | (u[p+2]&127)<<7 | (u[p+3]&127); }
  function ascii(u,p,n){ var s=''; for(var i=0;i<n;i++) s+=String.fromCharCode(u[p+i]); return s; }
  function decodeText(u,enc){
    if(!u.length) return '';
    var s;
    try{
      if(enc===1){
        var le = !(u[0]===0xFE && u[1]===0xFF);
        if((u[0]===0xFF&&u[1]===0xFE)||(u[0]===0xFE&&u[1]===0xFF)) u=u.subarray(2);
        s = new TextDecoder(le?'utf-16le':'utf-16be').decode(u);
      }else if(enc===2){ s = new TextDecoder('utf-16be').decode(u); }
      else if(enc===3){ s = new TextDecoder('utf-8').decode(u); }
      else{
        var hi=false; for(var i=0;i<u.length;i++){ if(u[i]>=0x80){hi=true;break;} }
        s = new TextDecoder(hi?'windows-1251':'latin1').decode(u);
      }
    }catch(e){ s=''; }
    return s.replace(/\u0000+$/,'').replace(/\u0000/g,' / ').trim();
  }
  function skipTerm(u,p,enc){
    if(enc===1||enc===2){ while(p+1<u.length && !(u[p]===0&&u[p+1]===0)) p+=2; return p+2; }
    while(p<u.length && u[p]!==0) p++; return p+1;
  }
  function sniffMime(b){
    if(b[0]===0xFF&&b[1]===0xD8) return 'image/jpeg';
    if(b[0]===0x89&&b[1]===0x50&&b[2]===0x4E&&b[3]===0x47) return 'image/png';
    if(b[0]===0x47&&b[1]===0x49&&b[2]===0x46) return 'image/gif';
    if(b[0]===0x52&&b[1]===0x49&&b[2]===0x46&&b[3]===0x46) return 'image/webp';
    return '';
  }
  function parseID3(buf){
    var out={}, u=new Uint8Array(buf);
    if(u.length<10 || ascii(u,0,3)!=='ID3') return out;
    var ver=u[3], flags=u[5], end=Math.min(u.length,10+synchsafe(u,6)), p=10, v=new DataView(buf);
    if(ver<2||ver>4) return out;
    if((flags&0x40) && ver>=3){ var es = ver===4 ? synchsafe(u,p) : v.getUint32(p)+4; p+=es; }
    var hl = ver===2?6:10;
    while(p+hl<=end){
      if(u[p]===0) break;
      var id = ascii(u,p,ver===2?3:4), fs;
      if(ver===2) fs=(u[p+3]<<16)|(u[p+4]<<8)|u[p+5];
      else if(ver===4) fs=synchsafe(u,p+4);
      else fs=v.getUint32(p+4);
      var ds=p+hl, de=ds+fs;
      if(fs<=0 || de>u.length) break;
      var d=u.subarray(ds,de);
      if(id==='TIT2'||id==='TT2') out.title=decodeText(d.subarray(1),d[0]);
      else if(id==='TPE1'||id==='TP1') out.artist=decodeText(d.subarray(1),d[0]);
      else if(id==='TALB'||id==='TAL') out.album=decodeText(d.subarray(1),d[0]);
      else if((id==='APIC'||id==='PIC') && !out.cover){
        var enc=d[0], q=1;
        if(id==='APIC') q=skipTerm(d,1,0); else q=4;
        q+=1; /* picture type */
        q=skipTerm(d,q,enc);
        var img=d.subarray(q);
        var mime=sniffMime(img);
        if(mime) out.cover=new Blob([img],{type:mime});
      }
      p=de;
    }
    return out;
  }

  /* ---------- Название из имени файла ---------- */
  function fromFilename(name){
    var base=name.replace(/\.mp3$/i,'');
    var m=base.split(/\s[—–-]\s/);
    if(m.length>=2) return {artist:m[0].trim(), title:m.slice(1).join(' — ').trim()};
    return {artist:'', title:base};
  }

  /* ---------- Обложка-заглушка ---------- */
  function hash(s){ var h=0; for(var i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return Math.abs(h); }
  function fallbackCover(seed){
    var h=hash(seed)%360, c=document.createElement('canvas'); c.width=c.height=600;
    var g=c.getContext('2d'), gr=g.createLinearGradient(0,0,600,600);
    gr.addColorStop(0,'hsl('+h+',78%,58%)'); gr.addColorStop(1,'hsl('+((h+50)%360)+',80%,32%)');
    g.fillStyle=gr; g.fillRect(0,0,600,600);
    g.fillStyle='rgba(255,255,255,.14)'; g.beginPath(); g.arc(470,130,190,0,7); g.fill();
    g.fillStyle='rgba(0,0,0,.16)'; g.beginPath(); g.arc(110,500,230,0,7); g.fill();
    g.fillStyle='rgba(255,255,255,.92)'; g.font='bold 260px sans-serif'; g.textAlign='center'; g.textBaseline='middle';
    g.fillText('♪',300,320);
    return new Promise(function(res){ c.toBlob(function(b){res(b);},'image/png'); });
  }

  /* ---------- Палитра обложки ---------- */
  function rgb2hsl(r,g,b){
    r/=255;g/=255;b/=255; var mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, h=0, s=0, d=mx-mn;
    if(d){ s=l>.5? d/(2-mx-mn): d/(mx+mn);
      if(mx===r) h=((g-b)/d+(g<b?6:0)); else if(mx===g) h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; }
    return [h,s,l];
  }
  function hsl(h,s,l){ return 'hsl('+Math.round(h)+','+Math.round(s*100)+'%,'+Math.round(l*100)+'%)'; }
  function palette(img){
    var N=32, c=document.createElement('canvas'); c.width=c.height=N;
    var g=c.getContext('2d',{willReadFrequently:true}); g.drawImage(img,0,0,N,N);
    var px; try{ px=g.getImageData(0,0,N,N).data; }catch(e){ return null; }
    var B=12, bk=[], i; for(i=0;i<B;i++) bk.push({w:0,r:0,g:0,b:0});
    var ar=0,ag=0,ab=0,n=0;
    for(i=0;i<px.length;i+=4){
      var r=px[i],g2=px[i+1],b=px[i+2]; ar+=r;ag+=g2;ab+=b;n++;
      var c3=rgb2hsl(r,g2,b), w=c3[1]*(1-Math.abs(2*c3[2]-1)); if(w<.04) continue;
      var k=Math.floor(c3[0]/30)%B; bk[k].w+=w; bk[k].r+=r*w; bk[k].g+=g2*w; bk[k].b+=b*w;
    }
    var order=bk.map(function(x,idx){return {i:idx,w:x.w};}).sort(function(a,b){return b.w-a.w;});
    var picked=[];
    order.forEach(function(o){
      if(o.w<=0||picked.length>=3) return;
      var far=picked.every(function(p){ var d=Math.abs(p.i-o.i); d=Math.min(d,B-d); return d>=2; });
      if(far) picked.push(o);
    });
    var cols=picked.map(function(o){
      var x=bk[o.i], hh=rgb2hsl(x.r/x.w,x.g/x.w,x.b/x.w);
      return [hh[0], Math.min(1,Math.max(.62,hh[1])), Math.min(.62,Math.max(.46,hh[2]))];
    });
    if(!cols.length){
      var av=rgb2hsl(ar/n,ag/n,ab/n);
      cols=[[av[0],.18,.52],[av[0],.14,.38],[av[0],.18,.66]];
    }
    while(cols.length<3){
      var b0=cols[0]; cols.push([(b0[0]+(cols.length===1?28:-28)+360)%360, b0[1], Math.min(.66,b0[2]+(cols.length===1?.06:-.08))]);
    }
    return cols.map(function(x){return hsl(x[0],x[1],x[2]);});
  }

  /* ---------- Утилиты ---------- */
  function fmt(t){ if(!isFinite(t)||t<0) t=0; var m=Math.floor(t/60), s=Math.floor(t%60); return m+':'+(s<10?'0':'')+s; }
  function loadImg(url){ return new Promise(function(res,rej){ var im=new Image(); im.onload=function(){res(im);}; im.onerror=rej; im.src=url; }); }
  function setVars(){
    var shell=np.parentElement, w=shell?shell.clientWidth:880;
    np.style.setProperty('--shellw', w+'px');
    np.style.setProperty('--cover', Math.round(Math.min(w*0.6,320))+'px');
  }

  /* ---------- Плеер ---------- */
  var audio=new Audio(); audio.preload='auto'; audio.loop=false; audio.controls=false;
  audio.setAttribute('playsinline','');
  var started=false, finished=false, raf=0, objUrls=[];

  function loop(){
    var d=audio.duration, t=audio.currentTime;
    if(d>0){
      var p=Math.min(1,t/d);
      elBar.style.setProperty('--p',p.toFixed(4));
      elCur.textContent=fmt(t);
      elBubble.setAttribute('aria-valuenow',String(Math.round(p*100)));
    }
    raf=requestAnimationFrame(loop);
  }

  /* перемотку и паузу запрещаем */
  var lastOk=0;
  audio.addEventListener('timeupdate',function(){ if(!audio.seeking) lastOk=audio.currentTime; });
  audio.addEventListener('seeking',function(){ if(!finished && Math.abs(audio.currentTime-lastOk)>1.2) audio.currentTime=lastOk; });
  audio.addEventListener('pause',function(){ if(started && !finished && !audio.ended){ var pr=audio.play(); if(pr&&pr.catch) pr.catch(function(){}); } });
  audio.addEventListener('ratechange',function(){ if(audio.playbackRate!==1) audio.playbackRate=1; });
  if('mediaSession' in navigator){
    ['pause','seekto','seekbackward','seekforward','previoustrack','nexttrack','stop'].forEach(function(a){
      try{ navigator.mediaSession.setActionHandler(a,function(){}); }catch(e){}
    });
  }

  function cleanup(){
    cancelAnimationFrame(raf);
    objUrls.forEach(function(u){ try{URL.revokeObjectURL(u);}catch(e){} });
    objUrls=[];
  }

  var lastTrackName = '';
  var shuffleBag = [];
  var trackBusy = false;

  /* Перемешиваем весь список: каждый трек прозвучит один раз,
     прежде чем начнётся новый случайный круг. */
  function refillShuffleBag(){
    shuffleBag = TRACKS.slice();
    for(var i = shuffleBag.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffleBag[i]; shuffleBag[i] = shuffleBag[j]; shuffleBag[j] = tmp;
    }
    /* Не ставим один и тот же трек на стыке двух кругов. */
    if(shuffleBag.length > 1 && shuffleBag[shuffleBag.length - 1] === lastTrackName){
      var swap = shuffleBag[0];
      shuffleBag[0] = shuffleBag[shuffleBag.length - 1];
      shuffleBag[shuffleBag.length - 1] = swap;
    }
  }
  function finish(){
    /* После каждой песни автоматически выбираем случайную следующую. */
    if(trackBusy) return;
    trackBusy = true;
    elBar.style.setProperty('--p','0');
    elCur.textContent='0:00';
    window.setTimeout(function(){
      playRandom();
    },180);
  }
  audio.addEventListener('ended',finish);

  function begin(){
    if(started) return;
    var pr=audio.play();
    function ok(){
      started=true; elHint.classList.remove('on');
      detach();
      if(!raf) raf=requestAnimationFrame(loop);
    }
    if(pr&&pr.then) pr.then(ok).catch(function(){ elHint.classList.add('on'); attach(); });
    else ok();
  }
  var evs=['pointerdown','touchstart','keydown','click'];
  function onGesture(){ begin(); }
  function attach(){ evs.forEach(function(e){ window.addEventListener(e,onGesture,true); }); }
  function detach(){ evs.forEach(function(e){ window.removeEventListener(e,onGesture,true); }); }

  function findSidecarCover(name){
    var base=name.replace(/\.mp3$/i,'');
    var candidates=[
      base+'.jpg',base+'.jpeg',base+'.png',base+'.webp',
      'cover.jpg','cover.jpeg','cover.png','cover.webp',
      'folder.jpg','folder.png'
    ];
    return candidates.reduce(function(chain,file){
      return chain.then(function(found){
        if(found) return found;
        return fetch(MUSIC_DIR+encodeURIComponent(file)).then(function(r){
          if(!r.ok) return null;
          return r.blob().then(function(blob){
            return /^image\/(jpeg|png|webp)$/i.test(blob.type) ? blob : null;
          });
        }).catch(function(){return null;});
      });
    },Promise.resolve(null));
  }

  function loadTrack(name){
    var url=MUSIC_DIR+encodeURIComponent(name);
    var fn=fromFilename(name);
    return fetch(url).then(function(r){ if(!r.ok) throw new Error('http '+r.status); return r.arrayBuffer(); })
      .then(function(buf){
        var tag=parseID3(buf), blob=new Blob([buf],{type:'audio/mpeg'}), au=URL.createObjectURL(blob);
        objUrls.push(au);
        var info={src:au,title:tag.title||fn.title,artist:tag.artist||fn.artist,cover:tag.cover||null,album:tag.album||''};
        if(info.cover) return info;
        return findSidecarCover(name).then(function(cover){ info.cover=cover||null; return info; });
      })
      .catch(function(){
        /* При file:// чтение тегов браузером может быть запрещено; прямое воспроизведение остаётся доступно. */
        return {src:url,title:fn.title,artist:fn.artist,cover:null,direct:true};
      });
  }

  function show(info){
    return (info.cover ? Promise.resolve(info.cover) : fallbackCover(info.artist+info.title)).then(function(cb){
      var cu=URL.createObjectURL(cb); objUrls.push(cu);
      return loadImg(cu).then(function(im){ return {im:im,url:cu}; }, function(){
        return fallbackCover(info.title).then(function(fb){ var u=URL.createObjectURL(fb); objUrls.push(u); return loadImg(u).then(function(im){return {im:im,url:u};}); });
      });
    }).then(function(c){
      elImg.src=c.url;
      /* Обложка меняется, а оформление плеера остаётся в чёрно-оранжевой теме сайта. */
      np.style.setProperty('--c1','#e8903a');
      np.style.setProperty('--c2','#8e421e');
      np.style.setProperty('--c3','#ffc07a');
      elTitle.textContent=info.title; elArtist.textContent=info.artist; elArtist.style.display=info.artist?'':'none';
      if('mediaSession' in navigator && window.MediaMetadata){
        try{ navigator.mediaSession.metadata=new MediaMetadata({title:info.title,artist:info.artist,artwork:[{src:c.url,sizes:'512x512'}]}); }catch(e){}
      }
      setVars();
      np.classList.add('show');
      setTimeout(function(){ np.classList.add('open'); },650);
    });
  }

  function playRandom(){
    if(!TRACKS.length) return;
    if(!shuffleBag.length) refillShuffleBag();
    var name = shuffleBag.pop();
    lastTrackName = name;
    trackBusy = true;
    loadTrack(name).then(function(info){
      return new Promise(function(res,rej){
        function onMeta(){ cl(); res(info); }
        function onErr(){ cl(); rej(new Error('Не удалось загрузить аудио')); }
        function cl(){ audio.removeEventListener('loadedmetadata',onMeta); audio.removeEventListener('error',onErr); }
        audio.addEventListener('loadedmetadata',onMeta); audio.addEventListener('error',onErr);
        audio.src=info.src; audio.load();
      });
    }).then(function(info){
      elDur.textContent=fmt(audio.duration);
      return show(info);
    }).then(function(){
      trackBusy = false;
      finished = false;
      /* Сразу пробуем воспроизвести без дополнительного нажатия. */
      var promise = audio.play();
      if(promise && promise.then){
        promise.then(function(){
          started = true;
          elHint.classList.remove('on');
          if(!raf) raf = requestAnimationFrame(loop);
        }).catch(function(){
          /* Браузер может блокировать звук до первого взаимодействия пользователя. */
          elHint.classList.add('on');
          attach();
        });
      } else {
        started = true;
        if(!raf) raf = requestAnimationFrame(loop);
      }
    }).catch(function(){
      trackBusy = false;
      /* Если файл недоступен, пробуем следующий случайный трек. */
      window.setTimeout(playRandom,250);
    });
  }

  window.addEventListener('resize',setVars);
  function init(){ setVars(); playRandom(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
