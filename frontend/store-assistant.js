/* Storefront AI shopping assistant — independent from Naya's avatar and try-on UI. */
(()=>{'use strict';
 const $=(s,r=document)=>r.querySelector(s),history=[];
 let playing=null,playingStopButton=null,playingPlayButton=null,activeRecorder=null,microphoneStream=null,recordingTimer=null,recordingChunks=[],cancelRecording=false;
 let sending=false,scrollY=0,oldBody={position:'',top:'',width:''},oldHtmlOverflow='';
 function shell(){
  if($('#lfStoreAiDialog'))return;
  const main=$('main.wrap');
  if(main&&!$('#lfStoreAiCard')){
   const card=document.createElement('section');card.id='lfStoreAiCard';card.className='lf-store-ai-card';
   card.innerHTML='<div class="lf-store-ai-card-copy"><span class="lf-store-ai-eyebrow">نايا • مستشارة التسوّق</span><h2>نايا تساعدك تختاري الأنسب</h2><p>اسألي نايا عن منتج، هدية، عطر، سياسة المتجر أو تنسيق الإكسسوارات.</p></div><button type="button" class="lf-store-ai-open" aria-haspopup="dialog">ابدئي الاختيار <span aria-hidden="true">←</span></button>';
   main.insertBefore(card,main.firstElementChild);card.querySelector('button').addEventListener('click',open);
  }
  const dialog=document.createElement('div');dialog.id='lfStoreAiDialog';dialog.className='lf-store-ai-overlay';dialog.hidden=true;
  dialog.innerHTML='<section class="lf-store-ai-panel" role="dialog" aria-modal="true" aria-labelledby="lfStoreAiTitle"><header class="lf-store-ai-header"><div class="lf-store-ai-brand"><img class="lf-store-ai-avatar" src="naya-boutique.png" alt=""><div><span class="lf-store-ai-eyebrow">Ladies First</span><h2 id="lfStoreAiTitle">نايا • مستشارة التسوّق</h2><p>بحث مباشر في المنتجات ومعلومات المتجر</p></div></div><button type="button" class="lf-store-ai-close" aria-label="إغلاق">×</button></header><div class="lf-store-ai-prompts"><button type="button" data-prompt="بدي أجهز هدية لشخص. اسألني عن المناسبة والميزانية والمستلم خطوة خطوة.">هدية مناسبة</button><button type="button" data-prompt="ساعدني أختار عطرًا من الموجود. اسألني عن الرائحة التي أحبها والميزانية.">اختيار عطر</button><button type="button" data-prompt="نسق لي ساعة مع إكسسوار متوفر في المتجر.">تنسيق إكسسوارات</button><button type="button" data-prompt="ما المنتجات والعروض المتاحة حاليًا؟">المنتجات والعروض</button></div><div class="lf-store-ai-messages" id="lfStoreAiMessages" aria-live="polite"><p class="lf-store-ai-welcome">أهلًا، أنا نايا 🌸 احكيلي شو بتدوري عليه، وببحث لك في منتجات المتجر وبجاوبك عن المعلومات المتاحة.</p></div><form class="lf-store-ai-form"><input id="lfStoreAiInput" type="text" maxlength="1000" autocomplete="off" placeholder="اكتبي أو احكي سؤالك لنايا..." aria-label="اكتبي سؤالك لمساعد التسوق"><button class="lf-store-ai-mic" type="button" aria-label="تسجيل سؤال صوتي">🎙 تسجيل</button><button type="submit">إرسال</button></form><p class="lf-store-ai-recording-status" id="lfStoreAiRecordingStatus" aria-live="polite"></p><small class="lf-store-ai-note">يمكنك كتابة سؤالك أو تسجيله. يُرسل التسجيل لتحويله إلى نص ومعالجته، ولا يحفظه الموقع.</small></section>';
  dialog.addEventListener('click',e=>{if(e.target===dialog||e.target.closest('.lf-store-ai-close'))close()});
  dialog.querySelector('.lf-store-ai-form').addEventListener('submit',e=>{e.preventDefault();send()});
  dialog.querySelector('.lf-store-ai-mic').addEventListener('click',toggleRecording);
  dialog.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>send(b.dataset.prompt)));
  document.body.appendChild(dialog);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.hidden)close()});
 }
 function open(){shell();const d=$('#lfStoreAiDialog');if(!d)return;scrollY=window.scrollY||0;oldBody={position:document.body.style.position,top:document.body.style.top,width:document.body.style.width};oldHtmlOverflow=document.documentElement.style.overflow;document.body.style.position='fixed';document.body.style.top='-'+scrollY+'px';document.body.style.width='100%';document.documentElement.style.overflow='hidden';d.hidden=false;document.body.classList.add('lf-store-ai-open');$('#lfStoreAiInput')?.focus()}
 function close(){stopAudio(playing);if(activeRecorder){cancelRecording=true;activeRecorder.stop()}const d=$('#lfStoreAiDialog');if(!d)return;d.hidden=true;document.body.classList.remove('lf-store-ai-open');document.body.style.position=oldBody.position;document.body.style.top=oldBody.top;document.body.style.width=oldBody.width;document.documentElement.style.overflow=oldHtmlOverflow;window.scrollTo(0,scrollY)}
 function appendReplyText(row,text){
  const chunks=String(text||'').split(/(https?:\/\/(?:www\.)?wa\.me\/[^\s]+)/gi);
  chunks.forEach(chunk=>{
   if(!/^https?:\/\/(?:www\.)?wa\.me\//i.test(chunk)){row.appendChild(document.createTextNode(chunk));return}
   const linkText=chunk.replace(/[.,،؛!?؟)\]]+$/u,'');
   const punctuation=chunk.slice(linkText.length);
   try{
    const url=new URL(linkText);
    if(url.hostname!=='wa.me'||!/^\/\d{7,15}$/.test(url.pathname)){row.appendChild(document.createTextNode(chunk));return}
    const a=document.createElement('a');a.className='lf-store-ai-whatsapp-link';a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent='تواصلي مع المتجر على واتساب';row.appendChild(a);
    if(punctuation)row.appendChild(document.createTextNode(punctuation));
   }catch{row.appendChild(document.createTextNode(chunk))}
  });
 }
 function addMessage(text,kind='assistant'){const box=$('#lfStoreAiMessages'),row=document.createElement('div');row.className='lf-store-ai-message '+kind;if(kind==='assistant')appendReplyText(row,text);else row.textContent=String(text||'');box.appendChild(row);box.scrollTop=box.scrollHeight;return row}
 function setAudioIdle(audio,playButton,stopButton){if(playing===audio){playing=null;playingStopButton=null;playingPlayButton=null}stopButton.disabled=true;playButton.textContent='استمعي للرد مرة أخرى'}
 function stopAudio(audio){
  if(!audio)return;
  try{audio.pause();audio.currentTime=0}catch{}
  if(playing===audio){playing=null;if(playingStopButton)playingStopButton.disabled=true;if(playingPlayButton)playingPlayButton.textContent='استمعي للرد مرة أخرى';playingStopButton=null;playingPlayButton=null}
 }
 function addVoice(row,text){
  const controls=document.createElement('div');controls.className='lf-store-ai-voice-controls';
  const playButton=document.createElement('button'),stopButton=document.createElement('button');
  playButton.type=stopButton.type='button';playButton.textContent='استمعي لرد نايا';stopButton.textContent='إيقاف الصوت';stopButton.disabled=true;
  playButton.setAttribute('aria-label','استمعي إلى الرد بصوت نايا');stopButton.setAttribute('aria-label','إيقاف صوت نايا');
  controls.append(playButton,stopButton);row.appendChild(controls);
  let audio=null,url=null,loading=false;
  const spoken=String(text).replace(/https?:\/\/(?:www\.)?wa\.me\/[^\s]+/gi,'تواصلي مع المتجر عبر واتساب.');
  playButton.onclick=async()=>{
   if(loading)return;
   if(!audio){
    loading=true;playButton.disabled=true;playButton.textContent='جارٍ تجهيز الصوت…';
    try{
     const base=String(window.LF_API_URL||location.origin).replace(/\/$/,'');
     const r=await fetch(base+'/api/ai/tts',{method:'POST',headers:await window.lfAiHeaders(),body:JSON.stringify({text:spoken.slice(0,1200)})});
     if(!r.ok){const error=await r.json().catch(()=>({}));throw new Error(error.message||'الصوت غير متاح الآن.')}
     url=URL.createObjectURL(await r.blob());audio=new Audio(url);
     audio.addEventListener('ended',()=>setAudioIdle(audio,playButton,stopButton));
     stopButton.disabled=false;
    }catch(error){playButton.textContent=error.message||'تعذر تشغيل الصوت';if(url)URL.revokeObjectURL(url);url=null;loading=false;playButton.disabled=false;return}
    loading=false;playButton.disabled=false;
   }
   if(playing&&playing!==audio)stopAudio(playing);
   playing=audio;playingStopButton=stopButton;playingPlayButton=playButton;audio.currentTime=0;
   playButton.textContent='الصوت يعمل…';stopButton.disabled=false;
   try{await audio.play()}catch{setAudioIdle(audio,playButton,stopButton);playButton.textContent='اضغطي للاستماع'}
  };
  stopButton.onclick=()=>stopAudio(audio);
  window.addEventListener('pagehide',()=>{if(audio)audio.pause();if(url)URL.revokeObjectURL(url)},{once:true});
 }
 function addRecommendations(items){if(!Array.isArray(items)||!items.length)return;const box=$('#lfStoreAiMessages'),wrap=document.createElement('div');wrap.className='lf-store-ai-recommendations';items.slice(0,3).forEach(item=>{const b=document.createElement('button');b.type='button';b.dataset.productId=String(item.id);b.textContent=(item.name||'منتج من المتجر')+(Number.isFinite(Number(item.price))?' — '+Number(item.price)+' ₪':'');wrap.appendChild(b)});wrap.addEventListener('click',e=>{const b=e.target.closest('[data-product-id]');if(!b)return;const id=Number(b.dataset.productId);close();if(typeof window.openProduct==='function')window.openProduct(id)});box.appendChild(wrap);box.scrollTop=box.scrollHeight}
 function setRecordingStatus(message){const status=$('#lfStoreAiRecordingStatus');if(status)status.textContent=message}
 function recordingButton(){return $('.lf-store-ai-mic')}
 function releaseMicrophone(){if(recordingTimer)clearTimeout(recordingTimer);recordingTimer=null;if(microphoneStream)microphoneStream.getTracks().forEach(track=>track.stop());microphoneStream=null}
 async function toggleRecording(){
  const button=recordingButton();
  if(activeRecorder&&activeRecorder.state==='recording'){setRecordingStatus('جارٍ تجهيز التسجيل لتحويله إلى نص…');activeRecorder.stop();return}
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setRecordingStatus('التسجيل الصوتي غير مدعوم في هذا المتصفح.');return}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   const preferred=['audio/webm;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported?.(type));
   const recorder=preferred?new MediaRecorder(stream,{mimeType:preferred}):new MediaRecorder(stream);
   microphoneStream=stream;activeRecorder=recorder;recordingChunks=[];cancelRecording=false;
   recorder.ondataavailable=event=>{if(event.data?.size)recordingChunks.push(event.data)};
   recorder.onstop=()=>{
    const blob=new Blob(recordingChunks,{type:recorder.mimeType||preferred||'audio/webm'});recordingChunks=[];
    releaseMicrophone();activeRecorder=null;
    if(button){button.disabled=false;button.textContent='🎙 تسجيل';button.setAttribute('aria-label','تسجيل سؤال صوتي')}
    if(cancelRecording){cancelRecording=false;setRecordingStatus('');return}
    if(!blob.size){setRecordingStatus('ما وصل تسجيل واضح. جرّبي مرة ثانية.');return}
    transcribe(blob);
   };
   recorder.start();button.textContent='إيقاف التسجيل';button.setAttribute('aria-label','إيقاف التسجيل وإرسال الصوت');setRecordingStatus('جاري التسجيل… اضغطي «إيقاف التسجيل» عند الانتهاء.');recordingTimer=setTimeout(()=>{if(activeRecorder===recorder){setRecordingStatus('انتهت مدة التسجيل؛ جارٍ تحويله إلى نص…');recorder.stop()}},45000);
  }catch(error){releaseMicrophone();setRecordingStatus(error?.name==='NotAllowedError'?'اسمحي باستخدام الميكروفون لتسجيل سؤالك.':'تعذر بدء التسجيل. تحققي من إذن الميكروفون وحاولي مجددًا.')}
 }
 async function transcribe(blob){
  const button=recordingButton();if(button)button.disabled=true;setRecordingStatus('جارٍ تحويل كلامك إلى نص…');
  try{
   const base=String(window.LF_API_URL||location.origin).replace(/\/$/,'');
   const headers=await window.lfAiHeaders();headers['Content-Type']=blob.type||'audio/webm';
   const response=await fetch(base+'/api/ai/transcribe',{method:'POST',headers,body:blob,cache:'no-store'});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.ok)throw new Error(result.message||'تعذر تحويل التسجيل إلى نص.');
   const input=$('#lfStoreAiInput'),transcript=String(result.text||'').trim().slice(0,1000);
   if(!transcript)throw new Error('ما وصل كلام واضح في التسجيل. جرّبي مرة ثانية.');
   if(input){input.value=transcript;input.focus()}
   setRecordingStatus('راجعي النص وعدّليه إذا لزم، ثم اضغطي «إرسال».');
  }catch(error){setRecordingStatus(error.message||'تعذر تحويل التسجيل إلى نص.')}
  finally{if(button)button.disabled=false}
 }
 async function send(text){if(sending)return;const input=$('#lfStoreAiInput'),q=String(text??input?.value??'').trim();if(!q)return;if(input)input.value='';sending=true;addMessage(q,'user');const pending=addMessage('لحظة، أبحث لك بين منتجات المتجر…','pending');try{const base=String(window.LF_API_URL||location.origin).replace(/\/$/,'');const headers=await window.lfAiHeaders();const response=await fetch(base+'/api/ai/store-chat',{method:'POST',headers,cache:'no-store',body:JSON.stringify({message:q,history:history.slice(-8)})});const result=await response.json().catch(()=>({}));pending.remove();if(!response.ok||!result.ok)throw new Error(result.message||'مساعد التسوق غير متاح الآن.');const reply=String(result.reply||'كيف أقدر أساعدك؟');const replyRow=addMessage(reply);addVoice(replyRow,reply);history.push({role:'user',content:q},{role:'assistant',content:reply});history.splice(0,Math.max(0,history.length-8));addRecommendations(result.recommendations)}catch(error){pending.remove();addMessage(error.message||'تعذر الاتصال بمساعد التسوق الآن.','error')}finally{sending=false;input?.focus()}}
 document.addEventListener('DOMContentLoaded',shell);if(document.readyState!=='loading')shell();
 window.openStoreAIAssistant=open;window.closeStoreAIAssistant=close;
})();
