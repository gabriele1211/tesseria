'use strict';
const $=id=>document.getElementById(id), KEY='tesseria.cards.v1';
let cards=[],current=null,editId=null,stream=null,scanning=false,photoDraft=null,photoRemove=false;
function toast(t){$('toast').textContent=t;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',3500)}
function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');cards=Array.isArray(v)?v:[]}catch{cards=[]}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(cards));return true}catch{toast('Impossibile salvare: memoria del browser non disponibile');return false}}
function show(id){stopCamera();for(const section of document.querySelectorAll('main>section'))section.hidden=section.id!==id;if(id==='home')render()}
function render(){const root=$('cards');root.replaceChildren();const q=$('search').value.trim().toLocaleLowerCase('it');let matches=cards.filter(c=>c.name.toLocaleLowerCase('it').includes(q));$('empty').hidden=matches.length>0;for(const c of matches){const b=document.createElement('button');b.className='card';const label=document.createElement('span');const name=document.createElement('strong');name.textContent=c.name;const number=document.createElement('small');number.textContent=c.number;label.append(name,number);const arrow=document.createElement('span');arrow.className='chevron';arrow.textContent='›';b.append(label,arrow);b.onclick=()=>detail(c.id);root.append(b)}}
async function openEditor(c=null){editId=c?.id||null;photoDraft=null;photoRemove=false;$('frontPhoto').value='';$('photoPreview').hidden=true;$('removePhoto').hidden=true;if(c){try{const p=await TesseriaPhotos.get(c.id);if(p){$('photoPreview').src=p;$('photoPreview').hidden=false;$('removePhoto').hidden=false}}catch(e){toast('Foto non disponibile: '+e.message)}}$('editorTitle').textContent=c?'Modifica tessera':'Nuova tessera';$('name').value=c?.name||'';$('number').value=c?.number||'';$('format').value=c?.format||'EAN13';$('scanMessage').textContent='';show('editor')}
const eanL=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const eanG=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const eanR=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const parity=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
const c39={0:'101001101101',1:'110100101011',2:'101100101011',3:'110110010101',4:'101001101011',5:'110100110101',6:'101100110101',7:'101001011011',8:'110100101101',9:'101100101101',A:'110101001011',B:'101101001011',C:'110110100101',D:'101011001011',E:'110101100101',F:'101101100101',G:'101010011011',H:'110101001101',I:'101101001101',J:'101011001101',K:'110101010011',L:'101101010011',M:'110110101001',N:'101011010011',O:'110101101001',P:'101101101001',Q:'101010110011',R:'110101011001',S:'101101011001',T:'101011011001',U:'110010101011',V:'100110101011',W:'110011010101',X:'100101101011',Y:'110010110101',Z:'100110110101','-':'100101011011','.':'110010101101',' ':'100110101101','$':'100100100101','/':'100100101001','+':'100101001001','%':'101001001001','*':'100101101101'};
const itfA=['00110','10001','01001','11000','00101','10100','01100','00011','10010','01010'];
function checkEAN(v){let s=0;for(let i=v.length-2,k=0;i>=0;i--,k++)s+=Number(v[i])*(k%2===0?3:1);return (10-s%10)%10===Number(v.at(-1))}
function encode(fmt,raw){const v=raw.trim().toUpperCase();if(fmt==='EAN13'){if(!/^\d{13}$/.test(v)||!checkEAN(v))throw Error('EAN-13: servono 13 cifre con cifra di controllo valida');let bits='101';for(let i=1;i<7;i++)bits+=(parity[Number(v[0])][i-1]==='L'?eanL:eanG)[Number(v[i])];bits+='01010';for(let i=7;i<13;i++)bits+=eanR[Number(v[i])];return bits+'101'}if(fmt==='EAN8'){if(!/^\d{8}$/.test(v)||!checkEAN(v))throw Error('EAN-8: servono 8 cifre con cifra di controllo valida');return '101'+[...v.slice(0,4)].map(n=>eanL[+n]).join('')+'01010'+[...v.slice(4)].map(n=>eanR[+n]).join('')+'101'}if(fmt==='CODE39'){if(!v||[...v].some(ch=>!c39[ch]||ch==='*'))throw Error('Code 39: caratteri non supportati');return '*'+v+'*'}if(fmt==='ITF'){if(!/^\d+$/.test(v)||v.length%2)throw Error('ITF: è richiesto un numero pari di cifre');let bits='1010';for(let i=0;i<v.length;i+=2){let a=itfA[+v[i]],b=itfA[+v[i+1]];for(let j=0;j<5;j++)bits+=(a[j]==='1'?'111':'1')+(b[j]==='1'?'000':'0')}return bits+'11101'}throw Error('Formato non supportato')}
function drawBarcode(fmt,raw){const v=encode(fmt,raw),svg=$('barcode'),ns='http://www.w3.org/2000/svg';svg.replaceChildren();let bars=[];if(fmt==='CODE39'){let x=12;for(const ch of v){const pat=c39[ch];for(let i=0;i<12;i++){const w=pat[i]==='1'?3:1;if(i%2===0)bars.push([x,w]);x+=w}x+=2}svg.setAttribute('viewBox',`0 0 ${x+12} 62`)}else{for(let i=0;i<v.length;i++)if(v[i]==='1')bars.push([i+12,1]);svg.setAttribute('viewBox',`0 0 ${v.length+24} 62`)}const rect=document.createElementNS(ns,'rect');rect.setAttribute('width','100%');rect.setAttribute('height','100%');rect.setAttribute('fill','#fff');svg.append(rect);for(const [x,w] of bars){const r=document.createElementNS(ns,'rect');r.setAttribute('x',x);r.setAttribute('y','5');r.setAttribute('width',w);r.setAttribute('height','52');r.setAttribute('fill','#000');svg.append(r)}}
async function detail(id){const c=cards.find(x=>x.id===id);if(!c)return;$('detailPhoto').hidden=true;try{const p=await TesseriaPhotos.get(id);if(p){$('detailPhoto').src=p;$('detailPhoto').hidden=false}}catch(e){toast('Foto non disponibile: '+e.message)}current=id;$('detailName').textContent=c.name;$('detailNumber').textContent=c.number;$('detail').classList.remove('rotated');try{drawBarcode(c.format,c.number)}catch(e){toast(e.message);return}show('detail')}
$('add').onclick=()=>openEditor();$('settings').onclick=()=>show('info');document.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>show('home'));$('search').oninput=render;
let photoCameraStream=null;
function closePhotoCamera(){
 $('photoCameraModal').hidden=true;
 if(photoCameraStream){photoCameraStream.getTracks().forEach(t=>t.stop());photoCameraStream=null}
 const video=$('photoCameraVideo');video.pause();video.srcObject=null;
}
$('closePhotoCamera').onclick=closePhotoCamera;
$('choosePhoto').onclick=()=>{closePhotoCamera();$('frontPhoto').click()};
$('openPhotoCamera').onclick=async()=>{
 $('photoCameraModal').hidden=false;$('photoCameraStatus').textContent='Apertura fotocamera…';
 try{
  photoCameraStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});
  if($('photoCameraModal').hidden){photoCameraStream.getTracks().forEach(t=>t.stop());photoCameraStream=null;return}
  const video=$('photoCameraVideo');video.srcObject=photoCameraStream;await video.play();
  $('photoCameraStatus').textContent='Posiziona il fronte della tessera dentro il riquadro.';
 }catch(err){$('photoCameraStatus').textContent='Fotocamera non disponibile: '+String(err?.message||err).slice(0,120)+'. Puoi scegliere una foto dalla galleria.'}
};
$('takePhoto').onclick=async()=>{
 const video=$('photoCameraVideo');if(!video.videoWidth)return toast('Attendi che la fotocamera sia pronta');
 const canvas=document.createElement('canvas'),ratio=1.586;
 const w=video.videoWidth,h=video.videoHeight,sw=Math.min(w,h*ratio),sh=sw/ratio;
 canvas.width=1200;canvas.height=Math.round(1200/ratio);
 canvas.getContext('2d').drawImage(video,(w-sw)/2,(h-sh)/2,sw,sh,0,0,canvas.width,canvas.height);
 const src=canvas.toDataURL('image/jpeg',.92);closePhotoCamera();
 await preparePhotoCrop(src);
};
async function preparePhotoCrop(src){
 pendingPhoto=src;cropImage=new Image();cropImage.src=src;await cropImage.decode();
 Object.assign(cropState,{zoom:1,rotation:0,x:0,y:0});
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
 $('photoPreview').src=photoDraft;$('photoPreview').hidden=false;$('removePhoto').hidden=false;
 $('cropModal').hidden=true;pendingPhoto=null;cropImage=null;$('frontPhoto').value='';
 if(!$('name').value.trim())recognizePhotoName(photoDraft);
};
async function recognizePhotoName(src){
 const status=$('photoOcrStatus');status.textContent='Lettura delle parole in corso…';
 try{
  if(!window.Tesseract){
   await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';s.onload=resolve;s.onerror=()=>reject(Error('Libreria OCR non caricata'));document.head.append(s)});
  }
  const result=await window.Tesseract.recognize(src,'ita+eng');
  const lines=String(result?.data?.text||'').split(/\n/).map(s=>s.trim()).filter(s=>s.length>=3&&/[a-zA-ZÀ-ÿ]/.test(s));
  const suggestion=lines.slice(0,3).join(' ').replace(/[^\p{L}\p{N} &'’-]/gu,' ').replace(/\s+/g,' ').slice(0,80).trim();
  if(suggestion&&!$('name').value.trim()){$('name').value=suggestion;status.textContent='Nome proposto dalla foto: verifica o correggi prima di salvare.'}
  else status.textContent='Nessun nome leggibile: puoi scriverlo manualmente.';
 }catch(err){status.textContent='OCR non disponibile ('+String(err?.message||'errore').slice(0,65)+'). Inserisci il nome manualmente.'}
}

$('removePhoto').onclick=()=>{photoDraft=null;photoRemove=true;$('frontPhoto').value='';$('photoPreview').hidden=true;$('removePhoto').hidden=true};
$('form').onsubmit=async e=>{e.preventDefault();const name=$('name').value.trim(),number=$('number').value.trim().toUpperCase(),format=$('format').value;try{encode(format,number)}catch(err){toast(err.message);return}if(!name)return toast('Inserisci un nome');let id=editId;if(editId){const c=cards.find(x=>x.id===editId);if(c)Object.assign(c,{name,number,format})}else{id=crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random();cards.push({id,name,number,format})}if(save()){try{if(photoDraft)await TesseriaPhotos.put(id,photoDraft);else if(photoRemove)await TesseriaPhotos.del(id)}catch(err){toast('Tessera salvata, ma foto non salvata: '+err.message)}show('home')}};
$('edit').onclick=()=>openEditor(cards.find(c=>c.id===current));$('delete').onclick=()=>{if(confirm('Eliminare definitivamente questa tessera?')){cards=cards.filter(c=>c.id!==current);if(save()){TesseriaPhotos.del(current).catch(()=>{});show('home')}}};$('rotate').onclick=()=>$('detail').classList.toggle('rotated');
$('export').onclick=async()=>{try{const withPhotos=await Promise.all(cards.map(async c=>({...c,frontPhoto:await TesseriaPhotos.get(c.id)||null})));const blob=new Blob([JSON.stringify({app:'Tesseria',version:2,cards:withPhotos},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tesseria-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}catch(err){toast('Backup non riuscito: '+err.message)}};
$('import').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>35_000_000)throw Error('Backup troppo grande');const data=JSON.parse(await f.text());if(data.app!=='Tesseria'||!Array.isArray(data.cards)||data.cards.length>5000)throw Error('Backup non valido');const incoming=data.cards.map(c=>{if(typeof c.name!=='string'||!c.name.trim()||c.name.length>80||typeof c.number!=='string'||c.number.length>120)throw Error('Tessera non valida');encode(c.format,c.number);if(c.frontPhoto!=null&&(typeof c.frontPhoto!=='string'||!c.frontPhoto.startsWith('data:image/jpeg;base64,')))throw Error('Foto nel backup non valida');return {id:crypto.randomUUID?crypto.randomUUID():String(Math.random()),name:c.name,number:c.number,format:c.format,frontPhoto:c.frontPhoto||null}});if(!confirm(`Importare ${incoming.length} tessere? Le tessere attuali verranno mantenute.`))return;const before=cards.slice();cards.push(...incoming.map(({frontPhoto,...c})=>c));if(!save()){cards=before;return}let failures=0;for(const c of incoming){if(c.frontPhoto)try{await TesseriaPhotos.put(c.id,c.frontPhoto)}catch{failures++}}toast(failures?'Tessere importate; alcune foto non salvate':'Backup importato');show('home')}catch(err){toast(err.message)}finally{e.target.value=''}};
let html5Scanner=null,scanToken=0,scanEvidence=new Map();
const SCANNER_URL='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
function scannerStatus(message){const el=$('scanStatus');if(el)el.textContent=message}
function stopCamera(){
 const modal=$('scannerModal');if(modal){modal.hidden=true;document.body.classList.remove('scanner-open')}
 scanToken++;scanning=false;scanEvidence.clear();
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
function acceptScan(format,value){
 const mapping={EAN_13:'EAN13',EAN_8:'EAN8',CODE_39:'CODE39',ITF:'ITF',EAN13:'EAN13',EAN8:'EAN8',CODE39:'CODE39'};
 const fmt=mapping[format];if(!fmt){scannerStatus('Codice '+format+' riconosciuto ma non ancora riproducibile da Tesseria');return false}
 try{encode(fmt,value)}catch{scannerStatus('Codice rilevato ma non riproducibile: inserisci il numero manualmente');return false}
 $('format').value=fmt;$('number').value=value;stopCamera();
 $('scanMessage').textContent='Numero letto: confronta ogni cifra con la tessera prima di salvare.';
 toast('Numero letto: verifica le cifre');return true;
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
  const required=fmt==='EAN_8'?3:1;
  if(item.count<required){scannerStatus('Codice '+fmt+' · conferma '+item.count+'/'+required);return}
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
 $('scannerModal').hidden=false;document.body.classList.add('scanner-open');
 $('scanMessage').textContent='';scannerStatus('Preparazione lettore…');
 const token=++scanToken;
 try{await startHtml5Scanner(token)}
 catch(err){if(token!==scanToken)return;const msg=scanErrorMessage(err);scannerStatus(msg);$('scanMessage').textContent=String(err?.message||'').slice(0,120);scanning=false;toast(msg)}
};
load();show('home');
(function setupOnboarding(){
 const guide=$('setupGuide'),cameraText=$('cameraGuideText'),cameraResult=$('cameraGuideResult'),installText=$('installGuideText'),installBtn=$('installPwa');
 const ua=navigator.userAgent||'',ios=/iPhone|iPad|iPod/.test(ua),android=/Android/.test(ua),standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 let installPrompt=null;
 function openGuide(){document.querySelectorAll('main > section').forEach(s=>s.hidden=true);guide.hidden=false;window.scrollTo(0,0)}
 $('openGuide').onclick=openGuide;
 $('finishGuide').onclick=()=>show('home');
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;installBtn.hidden=false;installText.textContent='Premi Installa applicazione per aggiungere Tesseria alla schermata Home.'});
 installBtn.onclick=async()=>{if(!installPrompt)return;installPrompt.prompt();try{await installPrompt.userChoice}catch{}installPrompt=null;installBtn.hidden=true};
 window.addEventListener('appinstalled',()=>{installText.textContent='Tesseria installata sulla schermata Home.';installBtn.hidden=true});
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
