'use strict';
const $=id=>document.getElementById(id), KEY='tesseria.cards.v1';
let cards=[],current=null,editId=null,stream=null,scanning=false,photoDraft=null,photoRemove=false;
function toast(t){$('toast').textContent=t;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',3500)}
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');cards=Array.isArray(v)?v:[]}catch{cards=[]}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(cards));return true}catch{toast('Impossibile salvare: memoria del browser non disponibile');return false}}
function show(id){stopCamera();for(const section of document.querySelectorAll('main>section'))section.hidden=section.id!==id;if(id==='home')render()}
let homeRenderId=0;
function render(){
 const root=$('cards');root.replaceChildren();
 const q=$('search').value.trim().toLocaleLowerCase('it');
 const matches=cards.filter(c=>c.name.toLocaleLowerCase('it').includes(q));
 $('empty').hidden=matches.length>0;
 const renderId=++homeRenderId;
 for(const c of matches){
  const b=document.createElement('button');b.type='button';b.className='card wallet-card';b.setAttribute('aria-label','Apri tessera '+c.name);
  const visual=document.createElement('span');visual.className='wallet-visual';
  const fallback=document.createElement('span');fallback.className='wallet-fallback';
  const monogram=document.createElement('span');monogram.className='wallet-monogram';monogram.textContent=(c.name.trim()[0]||'T').toLocaleUpperCase('it');
  const brand=document.createElement('span');brand.className='wallet-brand';brand.textContent=c.name;
  const deco=document.createElement('span');deco.className='wallet-deco';deco.setAttribute('aria-hidden','true');
  fallback.append(monogram,brand,deco);visual.append(fallback);
  const info=document.createElement('span');info.className='wallet-info';
  const name=document.createElement('strong');name.textContent=c.name;
  const number=document.createElement('small');number.textContent=c.number;
  const arrow=document.createElement('span');arrow.className='chevron';arrow.textContent='›';
  info.append(name,number);b.append(visual,info,arrow);b.onclick=()=>detail(c.id);root.append(b);
  // Foto già salvate in IndexedDB: non duplicarle in localStorage.
  Promise.resolve().then(()=>TesseriaPhotos.get(c.id)).then(photo=>{
   if(renderId!==homeRenderId||!b.isConnected||!photo)return;
   const img=document.createElement('img');img.className='wallet-image';img.alt='Fronte della tessera '+c.name;img.loading='eager';
   img.onload=()=>{if(renderId===homeRenderId&&b.isConnected){visual.replaceChildren(img);visual.classList.add('has-photo')}};
   img.src=photo;
   if(img.complete&&img.naturalWidth>0)img.onload();
  }).catch(()=>{});
 }
}
async function openEditor(c=null){editId=c?.id||null;photoDraft=null;photoRemove=false;$('frontPhoto').value='';$('photoPreview').hidden=true;$('removePhoto').hidden=true;$('retryOcr').hidden=true;if(c){try{const p=await TesseriaPhotos.get(c.id);if(p){$('photoPreview').src=p;$('photoPreview').hidden=false;$('removePhoto').hidden=false}}catch(e){toast('Foto non disponibile: '+e.message)}}$('editorTitle').textContent=c?'Modifica tessera':'Nuova tessera';$('name').value=c?.name||'';$('number').value=c?.number||'';$('format').value=c?.format||'EAN13';$('scanMessage').textContent='';show('editor')}
const eanL=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const eanG=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const eanR=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const parity=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
const c39={0:'101001101101',1:'110100101011',2:'101100101011',3:'110110010101',4:'101001101011',5:'110100110101',6:'101100110101',7:'101001011011',8:'110100101101',9:'101100101101',A:'110101001011',B:'101101001011',C:'110110100101',D:'101011001011',E:'110101100101',F:'101101100101',G:'101010011011',H:'110101001101',I:'101101001101',J:'101011001101',K:'110101010011',L:'101101010011',M:'110110101001',N:'101011010011',O:'110101101001',P:'101101101001',Q:'101010110011',R:'110101011001',S:'101101011001',T:'101011011001',U:'110010101011',V:'100110101011',W:'110011010101',X:'100101101011',Y:'110010110101',Z:'100110110101','-':'100101011011','.':'110010101101',' ':'100110101101','$':'100100100101','/':'100100101001','+':'100101001001','%':'101001001001','*':'100101101101'};
const itfA=['00110','10001','01001','11000','00101','10100','01100','00011','10010','01010'];
function checkEAN(v){let s=0;for(let i=v.length-2,k=0;i>=0;i--,k++)s+=Number(v[i])*(k%2===0?3:1);return (10-s%10)%10===Number(v.at(-1))}
function encode(fmt,raw){const v=raw.trim().toUpperCase();if(fmt==='EAN13'){if(!/^\d{13}$/.test(v)||!checkEAN(v))throw Error('EAN-13: servono 13 cifre con cifra di controllo valida');let bits='101';for(let i=1;i<7;i++)bits+=(parity[Number(v[0])][i-1]==='L'?eanL:eanG)[Number(v[i])];bits+='01010';for(let i=7;i<13;i++)bits+=eanR[Number(v[i])];return bits+'101'}if(fmt==='EAN8'){if(!/^\d{8}$/.test(v)||!checkEAN(v))throw Error('EAN-8: servono 8 cifre con cifra di controllo valida');return '101'+[...v.slice(0,4)].map(n=>eanL[+n]).join('')+'01010'+[...v.slice(4)].map(n=>eanR[+n]).join('')+'101'}if(fmt==='CODE39'){if(!v||[...v].some(ch=>!c39[ch]||ch==='*'))throw Error('Code 39: caratteri non supportati');return '*'+v+'*'}if(fmt==='ITF'){if(!/^\d+$/.test(v)||v.length%2)throw Error('ITF: è richiesto un numero pari di cifre');let bits='1010';for(let i=0;i<v.length;i+=2){let a=itfA[+v[i]],b=itfA[+v[i+1]];for(let j=0;j<5;j++)bits+=(a[j]==='1'?'111':'1')+(b[j]==='1'?'000':'0')}return bits+'11101'}throw Error('Formato non supportato')}
function drawBarcode(fmt,raw){
 const v=encode(fmt,raw),svg=$('barcode'),ns='http://www.w3.org/2000/svg';
 svg.replaceChildren();svg.setAttribute('preserveAspectRatio','xMidYMid meet');
 const add=(tag,attrs,text)=>{const e=document.createElementNS(ns,tag);for(const [k,val] of Object.entries(attrs))e.setAttribute(k,String(val));if(text!==undefined)e.textContent=text;svg.append(e);return e};
 if(fmt==='EAN13'||fmt==='EAN8'){
  const is13=fmt==='EAN13',leftQuiet=is13?11:7,rightQuiet=7,total=v.length+leftQuiet+rightQuiet;
  // Moduli EAN esatti, con aree bianche minime di sicurezza per i lettori.
  svg.setAttribute('viewBox',`0 0 ${total} 88`);
  svg.setAttribute('width',String(total));svg.setAttribute('height','88');
  svg.style.aspectRatio=`${total} / 88`;
  add('rect',{width:total,height:88,fill:'#fff'});
  for(let i=0;i<v.length;i++)if(v[i]==='1'){
   const guard=is13?(i<3||(i>=45&&i<50)||i>=92):(i<3||(i>=31&&i<36)||i>=64);
   add('rect',{x:i+leftQuiet,y:3,width:1,height:guard?68:61,fill:'#000'});
  }
  const label=(x,text,size=8.6)=>add('text',{x,y:81,'text-anchor':'middle','font-family':'Arial,Helvetica,sans-serif','font-size':size,fill:'#111'},text);
  if(is13){
   label(5,raw[0],9);
   for(let i=0;i<6;i++)label(leftQuiet+3+7*i+3.5,raw[i+1]);
   for(let i=0;i<6;i++)label(leftQuiet+50+7*i+3.5,raw[i+7]);
  }else{
   for(let i=0;i<4;i++)label(leftQuiet+3+7*i+3.5,raw[i]);
   for(let i=0;i<4;i++)label(leftQuiet+36+7*i+3.5,raw[i+4]);
  }
  $('detailNumber').hidden=true;
 }else{
  let bars=[];
  if(fmt==='CODE39'){let x=12;for(const ch of v){const pat=c39[ch];for(let i=0;i<12;i++){const w=pat[i]==='1'?3:1;if(i%2===0)bars.push([x,w]);x+=w}x+=2}svg.setAttribute('viewBox',`0 0 ${x+12} 70`)}
  else{for(let i=0;i<v.length;i++)if(v[i]==='1')bars.push([i+12,1]);svg.setAttribute('viewBox',`0 0 ${v.length+24} 70`)}
  add('rect',{width:'100%',height:'100%',fill:'#fff'});
  for(const [x,w] of bars)add('rect',{x,y:5,width:w,height:60,fill:'#000'});
  $('detailNumber').hidden=false;
 }
}

async function detail(id){const c=cards.find(x=>x.id===id);if(!c)return;$('detailPhoto').hidden=true;try{const p=await TesseriaPhotos.get(id);if(p){$('detailPhoto').src=p;$('detailPhoto').hidden=false}}catch(e){toast('Foto non disponibile: '+e.message)}current=id;$('cardActions').open=false;$('detailName').textContent=c.name;$('detailNumber').textContent=c.number;try{drawBarcode(c.format,c.number)}catch(e){toast(e.message);return}show('detail')}
$('add').onclick=()=>openEditor();$('settings').onclick=()=>show('info');document.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>show('home'));$('search').oninput=render;
let photoCameraStream=null,photoMonitor=null,photoCaptureBusy=false,photoStable=0,photoLastFrame=null;
function stopPhotoMonitor(){if(photoMonitor){clearInterval(photoMonitor);photoMonitor=null}photoStable=0;photoLastFrame=null}
function closePhotoCamera(){
 stopPhotoMonitor();$('photoCameraModal').hidden=true;
 if(photoCameraStream){photoCameraStream.getTracks().forEach(t=>t.stop());photoCameraStream=null}
 const video=$('photoCameraVideo');video.pause();video.srcObject=null;
}
$('closePhotoCamera').onclick=closePhotoCamera;
$('choosePhoto').onclick=()=>{closePhotoCamera();$('frontPhoto').click()};
function photoFrameQuality(video){
 const c=document.createElement('canvas');c.width=240;c.height=152;
 const ctx=c.getContext('2d',{willReadFrequently:true}),w=video.videoWidth,h=video.videoHeight,ratio=1.586,sw=Math.min(w,h*ratio),sh=sw/ratio;
 ctx.drawImage(video,(w-sw)/2,(h-sh)/2,sw,sh,0,0,240,152);
 const p=ctx.getImageData(0,0,240,152).data,gray=new Float32Array(240*152);
 for(let i=0;i<gray.length;i++){const k=i*4;gray[i]=p[k]*.299+p[k+1]*.587+p[k+2]*.114}
 const pixel=(x,y)=>gray[y*240+x];
 const bg=(pixel(4,4)+pixel(235,4)+pixel(4,147)+pixel(235,147))/4;
 const mid=(pixel(120,35)+pixel(120,70)+pixel(120,115))/3;
 // Contorni: cerca il passaggio dallo sfondo alla tessera su più righe e colonne.
 const threshold=(bg+mid)/2;
 const spans=[];
 for(const y of [24,42,110,128]){
  let left=-1,right=-1;
  for(let x=5;x<115;x++)if(pixel(x,y)>threshold&&pixel(x+1,y)>threshold&&pixel(x+2,y)>threshold){left=x;break}
  for(let x=234;x>125;x--)if(pixel(x,y)>threshold&&pixel(x-1,y)>threshold&&pixel(x-2,y)>threshold){right=x;break}
  if(left>=0&&right>=0)spans.push({left,right});
 }
 const vertical=[];
 for(const x of [48,76,164,192]){
  let top=-1,bottom=-1;
  for(let y=3;y<65;y++)if(pixel(x,y)>threshold&&pixel(x,y+1)>threshold){top=y;break}
  for(let y=148;y>85;y--)if(pixel(x,y)>threshold&&pixel(x,y-1)>threshold){bottom=y;break}
  if(top>=0&&bottom>=0)vertical.push({top,bottom});
 }
 const mean=(arr,key)=>arr.reduce((n,v)=>n+v[key],0)/arr.length;
 let shape=false;
 if(spans.length===4&&vertical.length===4){
  const left=mean(spans,'left'),right=mean(spans,'right'),top=mean(vertical,'top'),bottom=mean(vertical,'bottom');
  const consistent=spans.every(s=>Math.abs(s.left-left)<14&&Math.abs(s.right-right)<14)&&vertical.every(s=>Math.abs(s.top-top)<12&&Math.abs(s.bottom-bottom)<12);
  const width=right-left,height=bottom-top;
  shape=consistent&&left>8&&right<232&&top>5&&bottom<146&&width>125&&height>65&&width/height>1.3&&width/height<2.2;
 }
 let motion=100;
 if(photoLastFrame){let diff=0,n=0;for(let y=8;y<144;y+=4)for(let x=8;x<232;x+=4){const i=y*240+x;diff+=Math.abs(gray[i]-photoLastFrame[i]);n++}motion=diff/n}
 photoLastFrame=gray;
 return {shape,contrast:mid-bg,motion};
}
function monitorPhoto(){
 stopPhotoMonitor();
 photoMonitor=setInterval(()=>{
  const v=$('photoCameraVideo');if(!v.videoWidth||photoCaptureBusy||$('photoCameraModal').hidden)return;
  try{
   const q=photoFrameQuality(v);
   const ready=Math.abs(q.contrast)>8&&q.motion<28;
   photoStable=ready?photoStable+1:0;
   $('photoCameraFrame').classList.toggle('photo-ready',photoStable>=3);
   $('photoCameraStatus').textContent=photoStable>=2?'Immagine stabile · acquisizione automatica…':'Centra la tessera nella cornice e tieni fermo il telefono.';
   if(photoStable>=5)capturePhoto();
  }catch(err){stopPhotoMonitor();$('photoCameraStatus').textContent='Rilevamento automatico non disponibile: usa Scatta foto.'}
 },300);
}

$('openPhotoCamera').onclick=async()=>{
 $('photoCameraModal').hidden=false;$('photoCameraStatus').textContent='Apertura fotocamera…';
 try{
  photoCameraStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});
  if($('photoCameraModal').hidden){photoCameraStream.getTracks().forEach(t=>t.stop());photoCameraStream=null;return}
  const video=$('photoCameraVideo');video.srcObject=photoCameraStream;await video.play();monitorPhoto();
 }catch(err){$('photoCameraStatus').textContent='Fotocamera non disponibile: '+String(err?.message||err).slice(0,120)+'. Puoi scegliere una foto dalla galleria.'}
};
async function capturePhoto(){
 if(photoCaptureBusy)return;
 const video=$('photoCameraVideo');if(!video.videoWidth)return toast('Attendi che la fotocamera sia pronta');
 photoCaptureBusy=true;
 try{
  const canvas=document.createElement('canvas'),ratio=1.586;
  const w=video.videoWidth,h=video.videoHeight,sw=Math.min(w,h*ratio),sh=sw/ratio;
  canvas.width=1200;canvas.height=Math.round(1200/ratio);
  canvas.getContext('2d').drawImage(video,(w-sw)/2,(h-sh)/2,sw,sh,0,0,canvas.width,canvas.height);
  const src=canvas.toDataURL('image/jpeg',.92);closePhotoCamera();
  await preparePhotoCrop(src);
 }finally{photoCaptureBusy=false}
}
$('takePhoto').onclick=capturePhoto;
// Rilevatore geometrico locale: stima i quattro lati con scansioni multiple e fit lineare.
// Nessuna immagine viene trasmessa a servizi esterni.
function detectCardCorners(img){
 const c=document.createElement('canvas');c.width=360;c.height=Math.round(360*img.height/img.width);
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,c.width,c.height);
 const w=c.width,h=c.height,p=ctx.getImageData(0,0,w,h).data;
 const lum=new Float32Array(w*h);for(let i=0;i<lum.length;i++){const k=i*4;lum[i]=.299*p[k]+.587*p[k+1]+.114*p[k+2]}
 const at=(x,y)=>lum[Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x))];
 const bg=[at(3,3),at(w-4,3),at(3,h-4),at(w-4,h-4)].sort((a,b)=>a-b);
 const background=(bg[1]+bg[2])/2,center=at(w>>1,h>>1);
 if(Math.abs(center-background)<38)return null;
 const bright=center>background,threshold=(center+background)/2;
 const inside=(x,y)=>bright?at(x,y)>threshold:at(x,y)<threshold;
 const left=[],right=[],top=[],bottom=[];
 for(let y=Math.round(h*.18);y<h*.82;y+=Math.max(2,Math.round(h/28))){
  let l=-1,r=-1;
  for(let x=3;x<w*.48;x++)if(inside(x,y)&&inside(x+1,y)&&inside(x+2,y)){l=x;break}
  for(let x=w-4;x>w*.52;x--)if(inside(x,y)&&inside(x-1,y)&&inside(x-2,y)){r=x;break}
  if(l>=0&&r>=0&&r-l>w*.42){left.push([y,l]);right.push([y,r])}
 }
 for(let x=Math.round(w*.18);x<w*.82;x+=Math.max(2,Math.round(w/28))){
  let t=-1,d=-1;
  for(let y=3;y<h*.48;y++)if(inside(x,y)&&inside(x,y+1)&&inside(x,y+2)){t=y;break}
  for(let y=h-4;y>h*.52;y--)if(inside(x,y)&&inside(x,y-1)&&inside(x,y-2)){d=y;break}
  if(t>=0&&d>=0&&d-t>h*.38){top.push([x,t]);bottom.push([x,d])}
 }
 const fit=pts=>{
  if(pts.length<7)return null;
  const regression=items=>{let sx=0,sy=0,sxx=0,sxy=0;for(const [x,y] of items){sx+=x;sy+=y;sxx+=x*x;sxy+=x*y}const n=items.length,den=n*sxx-sx*sx;if(Math.abs(den)<.001)return null;const m=(n*sxy-sx*sy)/den;return {m,b:(sy-m*sx)/n}};
  let line=regression(pts);if(!line)return null;
  const errors=pts.map(([x,y])=>Math.abs(y-line.m*x-line.b)).sort((a,b)=>a-b);
  const tolerance=Math.max(3,errors[Math.floor(errors.length*.65)]*2.5);
  const kept=pts.filter(([x,y])=>Math.abs(y-line.m*x-line.b)<=tolerance);
  if(kept.length<7)return null;line=regression(kept);return line;
 };
 const L=fit(left),R=fit(right),T=fit(top),B=fit(bottom);
 if(!L||!R||!T||!B)return null;
 // L/R: x=m*y+b; T/B: y=m*x+b.
 const intersect=(side,edge)=>{const y=(edge.m*side.b+edge.b)/(1-edge.m*side.m);return {x:side.m*y+side.b,y}};
 const q=[intersect(L,T),intersect(R,T),intersect(R,B),intersect(L,B)];
 if(q.some(pt=>!Number.isFinite(pt.x)||!Number.isFinite(pt.y)||pt.x<2||pt.x>w-3||pt.y<2||pt.y>h-3))return null;
 const dist=(u,v)=>Math.hypot(u.x-v.x,u.y-v.y);
 const width=(dist(q[0],q[1])+dist(q[3],q[2]))/2,height=(dist(q[0],q[3])+dist(q[1],q[2]))/2;
 if(width<w*.4||height<h*.35||width/height<1.2||width/height>2.5)return null;
 const area=Math.abs(q.reduce((sum,v,i)=>sum+v.x*q[(i+1)%4].y-q[(i+1)%4].x*v.y,0)/2);
 if(area<w*h*.17)return null;
 return q.map(pt=>({x:pt.x*img.width/w,y:pt.y*img.height/h}));
}
function rectifyCard(img,quad){
 const W=960,H=Math.round(W/1.586);
 // Omografia inversa: coordinate del rettangolo di destinazione -> quadrilatero originale.
 const dst=[[0,0],[1,0],[1,1],[0,1]];
 const mat=[],rhs=[];
 for(let i=0;i<4;i++){
  const [u,v]=dst[i],{x,y}=quad[i];
  mat.push([u,v,1,0,0,0,-u*x,-v*x]);rhs.push(x);
  mat.push([0,0,0,u,v,1,-u*y,-v*y]);rhs.push(y);
 }
 for(let k=0;k<8;k++){let best=k;for(let j=k+1;j<8;j++)if(Math.abs(mat[j][k])>Math.abs(mat[best][k]))best=j;
  if(Math.abs(mat[best][k])<1e-9)throw Error('Prospettiva non calcolabile');
  [mat[k],mat[best]]=[mat[best],mat[k]];[rhs[k],rhs[best]]=[rhs[best],rhs[k]];
  const d=mat[k][k];for(let j=k;j<8;j++)mat[k][j]/=d;rhs[k]/=d;
  for(let i=0;i<8;i++)if(i!==k){const f=mat[i][k];for(let j=k;j<8;j++)mat[i][j]-=f*mat[k][j];rhs[i]-=f*rhs[k]}
 }
 const source=document.createElement('canvas');source.width=img.width;source.height=img.height;
 const sc=source.getContext('2d',{willReadFrequently:true});sc.drawImage(img,0,0);
 const sp=sc.getImageData(0,0,source.width,source.height).data;
 const out=document.createElement('canvas');out.width=W;out.height=H;
 const oc=out.getContext('2d'),frame=oc.createImageData(W,H),dp=frame.data,iw=source.width,ih=source.height;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const u=x/(W-1),v=y/(H-1),den=rhs[6]*u+rhs[7]*v+1;
  const sx=(rhs[0]*u+rhs[1]*v+rhs[2])/den,sy=(rhs[3]*u+rhs[4]*v+rhs[5])/den;
  const ix=Math.max(0,Math.min(iw-1,Math.round(sx))),iy=Math.max(0,Math.min(ih-1,Math.round(sy)));
  const si=(iy*iw+ix)*4,di=(y*W+x)*4;
  dp[di]=sp[si];dp[di+1]=sp[si+1];dp[di+2]=sp[si+2];dp[di+3]=255;
 }
 oc.putImageData(frame,0,0);return out.toDataURL('image/jpeg',.9);
}
async function preparePhotoCrop(src){
 pendingPhoto=src;cropImage=new Image();cropImage.src=src;await cropImage.decode();
 Object.assign(cropState,{zoom:1,rotation:0,x:0,y:0});
 try{
  const corners=detectCardCorners(cropImage);
  if(corners){
   const corrected=rectifyCard(cropImage,corners);
   pendingPhoto=corrected;cropImage=new Image();cropImage.src=corrected;await cropImage.decode();
   $('cropDetectionStatus').textContent='Quattro angoli individuati: prospettiva corretta automaticamente. Controlla il risultato.';
  }else $('cropDetectionStatus').textContent='Bordi non riconosciuti con sicurezza: regola la foto con le dita.';
 }catch(err){$('cropDetectionStatus').textContent='Correzione automatica non riuscita: puoi regolare la foto manualmente.'}
 $('cropModal').hidden=false;requestAnimationFrame(renderCrop);
}
let pendingPhoto=null,cropImage=null;
const cropState={zoom:1,rotation:0,x:0,y:0};
const cropPointers=new Map();let gesture=null;
function renderCrop(){
 const canvas=$('cropCanvas'),rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 const width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,width,height);ctx.fillStyle='#101820';ctx.fillRect(0,0,width,height);
 if(!cropImage)return;
 const base=Math.max(width/cropImage.width,height/cropImage.height);
 ctx.save();ctx.translate(width/2+cropState.x*width,height/2+cropState.y*height);ctx.rotate(cropState.rotation);
 ctx.scale(base*cropState.zoom,base*cropState.zoom);
 ctx.drawImage(cropImage,-cropImage.width/2,-cropImage.height/2);ctx.restore();
}
function cropGestureSnapshot(){
 const p=[...cropPointers.values()];
 if(!p.length)return null;
 const a=p[0],b=p[1],cx=b?(a.x+b.x)/2:a.x,cy=b?(a.y+b.y)/2:a.y;
 return {cx,cy,dist:b?Math.hypot(b.x-a.x,b.y-a.y):0,angle:b?Math.atan2(b.y-a.y,b.x-a.x):0,zoom:cropState.zoom,rotation:cropState.rotation,x:cropState.x,y:cropState.y};
}
const cropCanvas=$('cropCanvas');
cropCanvas.addEventListener('pointerdown',e=>{e.preventDefault();cropCanvas.setPointerCapture(e.pointerId);cropPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture=cropGestureSnapshot()});
cropCanvas.addEventListener('pointermove',e=>{
 if(!cropPointers.has(e.pointerId)||!gesture)return;
 cropPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 const p=[...cropPointers.values()],a=p[0],b=p[1],cx=b?(a.x+b.x)/2:a.x,cy=b?(a.y+b.y)/2:a.y;
 const bounds=cropCanvas.getBoundingClientRect();
 cropState.x=gesture.x+(cx-gesture.cx)/bounds.width;
 cropState.y=gesture.y+(cy-gesture.cy)/bounds.height;
 if(b&&gesture.dist>0){
  cropState.zoom=Math.max(1,Math.min(5,gesture.zoom*Math.hypot(b.x-a.x,b.y-a.y)/gesture.dist));
  cropState.rotation=gesture.rotation+Math.atan2(b.y-a.y,b.x-a.x)-gesture.angle;
 }
 renderCrop();
});
function releaseCropPointer(e){cropPointers.delete(e.pointerId);gesture=cropGestureSnapshot()}
cropCanvas.addEventListener('pointerup',releaseCropPointer);
cropCanvas.addEventListener('pointercancel',releaseCropPointer);
$('cropReset').onclick=()=>{Object.assign(cropState,{zoom:1,rotation:0,x:0,y:0});renderCrop()};
$('frontPhoto').onchange=async e=>{
 const f=e.target.files[0];if(!f)return;
 try{
  if(!f.type.startsWith('image/'))throw Error('Seleziona una fotografia');
  await preparePhotoCrop(await TesseriaPhotos.compress(f));
 }catch(err){toast(err.message);e.target.value=''}
};
$('cancelCrop').onclick=()=>{$('cropModal').hidden=true;pendingPhoto=null;cropImage=null;$('frontPhoto').value=''};
$('confirmCrop').onclick=async()=>{
 if(!pendingPhoto||!cropImage)return;
 renderCrop();
 const source=$('cropCanvas'),canvas=document.createElement('canvas');canvas.width=960;canvas.height=Math.round(960/1.586);
 canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
 photoDraft=canvas.toDataURL('image/jpeg',.86);photoRemove=false;
 $('photoPreview').src=photoDraft;$('photoPreview').hidden=false;$('removePhoto').hidden=false;$('retryOcr').hidden=false;
 $('cropModal').hidden=true;pendingPhoto=null;cropImage=null;$('frontPhoto').value='';
 if(!$('name').value.trim())recognizePhotoName(photoDraft);
};
let ocrBusy=false;
function enhanceOcrImage(src){
 return new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>{
   const canvas=document.createElement('canvas'),scale=Math.min(2,2000/Math.max(img.width,img.height));
   canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,canvas.width,canvas.height);
   const frame=ctx.getImageData(0,0,canvas.width,canvas.height),p=frame.data;
   for(let i=0;i<p.length;i+=4){
    const lum=.299*p[i]+.587*p[i+1]+.114*p[i+2];
    const v=Math.max(0,Math.min(255,(lum-128)*1.6+146));
    p[i]=p[i+1]=p[i+2]=v;
   }
   ctx.putImageData(frame,0,0);resolve(canvas.toDataURL('image/png'));
  };img.onerror=reject;img.src=src;
 });
}
function selectMerchantName(data){
 const clean=s=>String(s||'').replace(/[^\p{L}\p{N} &'’.-]/gu,' ').replace(/\s+/g,' ').trim();
 const raw=String(data?.text||'');
 const lines=raw.split(/\r?\n/).map(clean).filter(Boolean);
 const words=s=>s.match(/\p{L}{3,}/gu)||[];
 const scoreLine=s=>{
  const w=words(s),letters=(s.match(/\p{L}/gu)||[]).length;
  if(!w.length||letters<5||s.length>55)return -1;
  if(/^(?:www|https|telefono|codice|tessera|punti|scadenza)\b/i.test(s))return -1;
  const isolated=(s.match(/(?:^|\s)\p{L}{1,2}(?=\s|$)/gu)||[]).length;
  const badCase=(s.match(/\b(?:\p{Lu}\p{Ll}{0,2}){3,}\b/gu)||[]).length;
  const irregular=isolated*12+badCase*12;
  return w.length*9+Math.min(letters,24)-irregular;
 };
 const candidates=lines.map((s,i)=>({s,score:scoreLine(s)-i*0.5})).filter(x=>x.score>=18).sort((a,b)=>b.score-a.score);
 if(!candidates.length)return '';
 const best=candidates[0];
 // Tesseract confidence alone is not sufficient for decorative logos.
 const conf=Number(data?.confidence);
 if(Number.isFinite(conf)&&conf<48)return '';
 const tokens=best.s.split(/\s+/);
 if(tokens.length>=5 && tokens.filter(t=>t.length<=3).length>=2)return '';
 if(tokens.length>=4 && tokens.filter(t=>/^[A-Z][a-z]{0,2}$/.test(t)).length>=2)return '';
 return best.s.slice(0,80);
}
async function recognizePhotoName(src){
 if(ocrBusy)return;
 const status=$('photoOcrStatus');ocrBusy=true;$('retryOcr').disabled=true;
 status.textContent='Lettura delle scritte in corso…';
 try{
  if(!window.Tesseract){
   await new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-ocr]');
    if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(Error('Libreria OCR non disponibile')),{once:true});return}
    const s=document.createElement('script');s.dataset.ocr='1';s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    s.onload=resolve;s.onerror=()=>reject(Error('Connessione necessaria per OCR'));document.head.append(s);
   });
  }
  const original=await window.Tesseract.recognize(src,'ita+eng',{});
  let suggestion=selectMerchantName(original.data);
  if(!suggestion){
   const enhanced=await enhanceOcrImage(src);
   const second=await window.Tesseract.recognize(enhanced,'ita+eng',{});
   suggestion=selectMerchantName(second.data);
  }
  if(!suggestion){
   const enhanced=await enhanceOcrImage(src);
   const second=await window.Tesseract.recognize(enhanced,'ita+eng',{});
   suggestion=selectMerchantName(second.data);
  }
  if(suggestion){
   if(!$('name').value.trim()||/^(?:[A-Za-z]\s+){2,}[A-Za-z]?$/i.test($('name').value.trim()))$('name').value=suggestion;
   status.textContent='Nome suggerito: '+suggestion+'. Verifica prima di salvare.';
  }else status.textContent='Testo non riconosciuto con sufficiente affidabilità. Scrivi il nome manualmente.';
 }catch(err){status.textContent='OCR non disponibile: '+String(err?.message||err).slice(0,90)}
 finally{ocrBusy=false;$('retryOcr').disabled=false}
}

$('retryOcr').onclick=()=>{if(photoDraft)recognizePhotoName(photoDraft);else toast('Prima scatta una fotografia')};

$('removePhoto').onclick=()=>{photoDraft=null;photoRemove=true;$('frontPhoto').value='';$('photoPreview').hidden=true;$('removePhoto').hidden=true};
$('form').onsubmit=async e=>{e.preventDefault();const name=$('name').value.trim(),number=$('number').value.trim().toUpperCase(),format=$('format').value;try{encode(format,number)}catch(err){toast(err.message);return}if(!name)return toast('Inserisci un nome');let id=editId;if(editId){const c=cards.find(x=>x.id===editId);if(c)Object.assign(c,{name,number,format})}else{id=crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random();cards.push({id,name,number,format})}if(save()){try{if(photoDraft)await TesseriaPhotos.put(id,photoDraft);else if(photoRemove)await TesseriaPhotos.del(id)}catch(err){toast('Tessera salvata, ma foto non salvata: '+err.message)}show('home')}};
$('edit').onclick=()=>openEditor(cards.find(c=>c.id===current));$('delete').onclick=()=>{if(confirm('Eliminare definitivamente questa tessera?')){cards=cards.filter(c=>c.id!==current);if(save()){TesseriaPhotos.del(current).catch(()=>{});show('home')}}};$('export').onclick=async()=>{try{const withPhotos=await Promise.all(cards.map(async c=>({...c,frontPhoto:await TesseriaPhotos.get(c.id)||null})));const blob=new Blob([JSON.stringify({app:'Tesseria',version:2,cards:withPhotos},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tesseria-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}catch(err){toast('Backup non riuscito: '+err.message)}};
$('import').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>35_000_000)throw Error('Backup troppo grande');const data=JSON.parse(await f.text());if(data.app!=='Tesseria'||!Array.isArray(data.cards)||data.cards.length>5000)throw Error('Backup non valido');const incoming=data.cards.map(c=>{if(typeof c.name!=='string'||!c.name.trim()||c.name.length>80||typeof c.number!=='string'||c.number.length>120)throw Error('Tessera non valida');encode(c.format,c.number);if(c.frontPhoto!=null&&(typeof c.frontPhoto!=='string'||!c.frontPhoto.startsWith('data:image/jpeg;base64,')))throw Error('Foto nel backup non valida');return {id:crypto.randomUUID?crypto.randomUUID():String(Math.random()),name:c.name,number:c.number,format:c.format,frontPhoto:c.frontPhoto||null}});if(!confirm(`Importare ${incoming.length} tessere? Le tessere attuali verranno mantenute.`))return;const before=cards.slice();cards.push(...incoming.map(({frontPhoto,...c})=>c));if(!save()){cards=before;return}let failures=0;for(const c of incoming){if(c.frontPhoto)try{await TesseriaPhotos.put(c.id,c.frontPhoto)}catch{failures++}}toast(failures?'Tessere importate; alcune foto non salvate':'Backup importato');show('home')}catch(err){toast(err.message)}finally{e.target.value=''}};
let html5Scanner=null,scanToken=0,scanEvidence=new Map();
const SCANNER_URL='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
function scannerStatus(message){const el=$('scanStatus');if(el)el.textContent=message}
function stopCamera(){
 const modal=$('scannerModal');if(modal){modal.hidden=true;document.body.classList.remove('scanner-open')}
 scanToken++;scanning=false;scanEvidence.clear();scanConfirmed=null;$('scanReview').hidden=true;
 const reader=html5Scanner;html5Scanner=null;
 if(reader){Promise.resolve(reader.stop()).catch(()=>{}).then(()=>reader.clear()).catch(()=>{})}
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
 const video=$('camera');if(video){video.pause();video.srcObject=null;video.hidden=true}
}
$('stopCamera').onclick=stopCamera;
$('scannerDone').onclick=stopCamera;
$('scannerModal').addEventListener('click',e=>{if(e.target===$('scannerModal'))stopCamera()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('scannerModal').hidden)stopCamera()});
function validatedCandidate(format,value){
 const v=String(value||'').trim(),fmt=String(format||'').toUpperCase();
 if(fmt==='EAN_13'||fmt==='EAN13'||fmt==='EAN_8'||fmt==='EAN8'){
  const len=fmt.includes('13')?13:8;
  if(v.length!==len||![...v].every(ch=>ch>='0'&&ch<='9'))return false;
  const digits=[...v].map(Number),sum=digits.slice(0,-1).reduce((acc,d,i)=>acc+d*(len===13?(i%2===0?1:3):(i%2===0?3:1)),0);
  return (10-sum%10)%10===digits[len-1];
 }
 return !!v;
}
let scanConfirmed=null;
function acceptScan(format,value){
 const mapping={EAN_13:'EAN13',EAN_8:'EAN8',CODE_39:'CODE39',ITF:'ITF',EAN13:'EAN13',EAN8:'EAN8',CODE39:'CODE39'};
 const fmt=mapping[format];if(!fmt){scannerStatus('Codice '+format+' riconosciuto ma non ancora riproducibile da Tesseria');return false}
 try{encode(fmt,value)}catch{scannerStatus('Codice rilevato ma non riproducibile: inserisci il numero manualmente');return false}
 scanConfirmed={format:fmt,value};
 $('scanReviewNumber').textContent=value;
 $('scanReviewFormat').textContent='Formato '+fmt+' · confronta tutte le cifre, soprattutto la prima.';
 $('scanReview').hidden=false;
 scannerStatus('Lettura verificata: controlla il numero prima di confermare.');
 scanning=false;
 const reader=html5Scanner;html5Scanner=null;
 if(reader)Promise.resolve(reader.stop()).catch(()=>{}).then(()=>reader.clear()).catch(()=>{});
 return true;
}
function loadScanner(){
 if(window.Html5Qrcode?.SupportedFormats)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const existing=document.querySelector('script[data-html5scanner]');
  if(existing){if(existing.dataset.loaded==='1')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(Error('Libreria scanner non disponibile')),{once:true});return}
  const s=document.createElement('script');s.src=SCANNER_URL;s.dataset.html5scanner='1';
  s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=()=>reject(Error('Impossibile caricare il lettore: verifica la connessione Internet'));
  document.head.append(s);
 });
}
async function startHtml5Scanner(token){
 await loadScanner();if(token!==scanToken)return;
 const H=window.Html5Qrcode,F=window.Html5QrcodeSupportedFormats;
 if(!H||!F)throw Error('Motore scanner non disponibile');
 const formats=[F.EAN_13,F.EAN_8,F.CODE_39,F.ITF,F.QR_CODE,F.CODE_128];
 const reader=new H('html5Reader',{formatsToSupport:formats,verbose:false,useBarCodeDetectorIfSupported:false});
 html5Scanner=reader;
 const onSuccess=(decodedText,decodedResult)=>{
  if(token!==scanToken||!scanning)return;
  const raw=decodedResult?.result?.format?.formatName||decodedResult?.result?.format||'';
  const fmt=String(raw).toUpperCase();
  const value=String(decodedText||'').trim();
  if(!validatedCandidate(fmt,value)){scannerStatus('Lettura non valida, riprova');return}
  const key=fmt+':'+value,now=Date.now();
  for(const [k,v] of scanEvidence)if(now-v.last>6000)scanEvidence.delete(k);
  const item=scanEvidence.get(key)||{count:0,last:now};item.count++;item.last=now;scanEvidence.set(key,item);
  // Evita falsi EAN-8 estratti da porzioni di un EAN-13.
  const required=fmt==='EAN_8'?4:(fmt==='EAN_13'?3:2);
  if(item.count<required){scannerStatus('Verifica lettura '+item.count+'/'+required+' · mantieni il codice inquadrato');return}
  scannerStatus('Codice '+fmt+' rilevato');
  acceptScan(fmt,value);
 };
 scanning=true;scannerStatus('Apertura fotocamera…');
 try{
  await reader.start({facingMode:'environment'},{fps:12,qrbox:(w,h)=>({width:Math.floor(w*.9),height:Math.floor(Math.min(h*.75,w*.42))}),aspectRatio:1.777778,videoConstraints:{facingMode:'environment',width:{ideal:1920},height:{ideal:1080}}},onSuccess,()=>{});
 }catch(err){if(token!==scanToken)return;throw err}
 if(token===scanToken&&scanning)scannerStatus('Fotocamera attiva · inquadra il codice');
}
function scanErrorMessage(error){
 const name=error?.name||'',message=String(error?.message||'');
 if(name==='NotAllowedError'||name==='PermissionDeniedError')return 'Accesso alla fotocamera negato. Abilitalo nelle impostazioni di Safari o del browser.';
 if(name==='NotFoundError'||name==='DevicesNotFoundError')return 'Nessuna fotocamera disponibile.';
 if(name==='NotReadableError'||name==='TrackStartError')return 'Fotocamera già utilizzata da un’altra applicazione.';
 if(name==='OverconstrainedError')return 'La fotocamera non supporta le impostazioni richieste.';
 if(/network|fetch|load|script|caricare|connessione/i.test(message))return 'Impossibile caricare il lettore. Controlla la connessione Internet e riprova.';
 return 'Scanner non avviato. Riprova oppure inserisci manualmente il numero.';
}
$('scan').onclick=async()=>{
 if(scanning)return;
 $('scannerModal').hidden=false;document.body.classList.add('scanner-open');$('scanReview').hidden=true;scanConfirmed=null;scanEvidence.clear();
 $('scanMessage').textContent='';scannerStatus('Preparazione lettore…');
 const token=++scanToken;
 try{await startHtml5Scanner(token)}
 catch(err){if(token!==scanToken)return;const msg=scanErrorMessage(err);scannerStatus(msg);$('scanMessage').textContent=String(err?.message||'').slice(0,120);scanning=false;toast(msg)}
};
$('confirmScan').onclick=()=>{
 if(!scanConfirmed)return;
 const {format,value}=scanConfirmed;
 $('format').value=format;$('number').value=value;
 stopCamera();
 $('scanMessage').textContent='Codice confermato. Controlla i dati e salva la tessera.';
 toast('Codice confermato');
};
$('retryScan').onclick=()=>{stopCamera();$('scan').click()};
load();show('home');
(function setupOnboarding(){
 const guide=$('setupGuide'),cameraText=$('cameraGuideText'),cameraResult=$('cameraGuideResult'),installText=$('installGuideText'),installBtn=$('installPwa');
 const ua=navigator.userAgent||'',ios=/iPhone|iPad|iPod/.test(ua),android=/Android/.test(ua),standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 let installPrompt=null;
 const banner=$('installBanner'),bannerText=$('installBannerText'),bannerAction=$('installBannerAction');
 const dismissalKey='tesseria.installBanner.dismissedUntil';
 function bannerDismissed(){try{return Number(localStorage.getItem(dismissalKey)||0)>Date.now()}catch{return false}}
 function hideInstallBanner(){banner.hidden=true}
 function showInstallBanner(){
  if(standalone||bannerDismissed()){hideInstallBanner();return}
  if(ios){
   bannerText.textContent='Su iPhone: apri Tesseria in Safari, tocca Condividi (quadrato con freccia), poi Aggiungi alla schermata Home e conferma con Aggiungi.';
   bannerAction.textContent='Mostra procedura';
  }else if(android){
   bannerText.textContent='Su Android: apri Tesseria in Chrome, tocca ⋮ e scegli Installa app oppure Aggiungi a schermata Home.';
   bannerAction.textContent=installPrompt?'Installa ora':'Mostra procedura';
  }else{
   bannerText.textContent='Aggiungi Tesseria alla schermata Home dal menu del browser per aprirla come un’app.';
   bannerAction.textContent=installPrompt?'Installa ora':'Mostra procedura';
  }
  banner.hidden=false;
 }
 bannerAction.onclick=()=>{
  if(installPrompt){installBtn.click();return}
  openGuide();hideInstallBanner();
 };
 $('installBannerDismiss').onclick=()=>{
  try{localStorage.setItem(dismissalKey,String(Date.now()+7*24*60*60*1000))}catch{}
  hideInstallBanner();
 };
 showInstallBanner();
 function openGuide(){document.querySelectorAll('main > section').forEach(s=>s.hidden=true);guide.hidden=false;window.scrollTo(0,0)}
 $('openGuide').onclick=openGuide;
 $('finishGuide').onclick=()=>show('home');
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;installBtn.hidden=false;installText.textContent='Premi Installa applicazione per aggiungere Tesseria alla schermata Home.';showInstallBanner()});
 installBtn.onclick=async()=>{if(!installPrompt)return;installPrompt.prompt();try{await installPrompt.userChoice}catch{}installPrompt=null;installBtn.hidden=true;showInstallBanner()};
 window.addEventListener('appinstalled',()=>{installText.textContent='Tesseria installata sulla schermata Home.';installBtn.hidden=true;hideInstallBanner()});
 if(standalone){installText.textContent='Tesseria è già installata sulla schermata Home.'}
 else if(ios){installText.textContent='In Safari tocca Condividi (quadrato con freccia) e scegli Aggiungi alla schermata Home. Se usi un altro browser, apri prima il sito in Safari.'}
 else if(android){installText.textContent='In Chrome apri il menu ⋮ e scegli Installa app oppure Aggiungi a schermata Home.'}
 else{installText.textContent='Apri il menu del browser e scegli Installa app o Aggiungi alla schermata Home, se disponibile.'}
 $('grantCamera').onclick=async()=>{
  cameraResult.textContent='Richiesta autorizzazione in corso…';
  if(!navigator.mediaDevices?.getUserMedia){cameraResult.textContent='La fotocamera richiede HTTPS e un browser compatibile.';return}
  let testStream=null;
  try{testStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});cameraResult.textContent='✓ Fotocamera autorizzata. Ora puoi scansionare le tessere.';cameraText.textContent='Autorizzazione concessa.'}
  catch(err){cameraResult.textContent=scanErrorMessage(err)+(ios?' Su iPhone: in Safari apri Impostazioni sito web → Fotocamera → Consenti o Chiedi. Se usi la PWA installata, verifica anche i permessi nelle Impostazioni di iOS.':android?' Su Android: tocca l’icona accanto all’indirizzo → Autorizzazioni → Fotocamera → Consenti.':' Controlla i permessi del sito nelle impostazioni del browser.')}
  finally{if(testStream)testStream.getTracks().forEach(t=>t.stop())}
 };
 if(!standalone&&!localStorage.getItem('tesseria.onboarding.seen.v1')){
  localStorage.setItem('tesseria.onboarding.seen.v1','1');openGuide()
 }
})();

if('serviceWorker' in navigator){
 let refreshing=false;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshing){refreshing=true;location.reload()}});
 const banner=$('updateBanner'),install=$('installUpdate'),dismiss=$('dismissUpdate');
 let pendingWorker=null;
 function offer(worker){if(!worker||!navigator.serviceWorker.controller)return;pendingWorker=worker;banner.hidden=false}
 install.onclick=()=>{if(pendingWorker){install.disabled=true;install.textContent='Aggiornamento in corso…';pendingWorker.postMessage({type:'SKIP_WAITING'})}else location.reload()};
 dismiss.onclick=()=>{banner.hidden=true};
 window.addEventListener('load',async()=>{
  try{
   const registration=await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});
   if(registration.waiting)offer(registration.waiting);
   registration.addEventListener('updatefound',()=>{
    const worker=registration.installing;if(!worker)return;
    worker.addEventListener('statechange',()=>{if(worker.state==='installed')offer(registration.waiting||worker)});
   });
   registration.update().catch(()=>{});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)registration.update().catch(()=>{})});
  }catch(err){console.warn('Aggiornamento PWA non disponibile',err)}
 });
}
