/* Static shopping surfaces share the storefront language; customer content stays untouched. */
(()=>{'use strict';
 const translations={
  'اختيارات مميزة من المتجر':'Curated picks from the store',
  'اكتشفي عطرك، نسّقي إطلالتك، واختاري ما يناسب مناسبتك.':'Discover your fragrance, complete your look, and shop for your occasion.',
  'اكتشفي عطرك':'Discover your fragrance',
  'اختاري النفحات التي تحبينها.':'Choose the notes you love.',
  'اختاري النفحات التي تحبينها من عطور المتجر.':'Explore the store’s fragrances by your favorite notes.',
  'نسّقي ساعتك وإكسسواراتك':'Match your watch and accessories',
  'أكملي طلتك بقطع متناسقة.':'Complete your look with matching pieces.',
  'اختاري ساعة، وسنعرض الإكسسوارات ذات الطابع الأقرب لها.':'Choose a watch to find accessories in a similar style.',
  'مجموعات المناسبات':'Shop by occasion',
  'اختيارات للهدية والدوام والسهرة.':'Picks for gifts, work, and evenings.',
  'اختيارات مرتبة حسب المناسبة.':'Find pieces for your occasion.',
  'إطلاقات حصرية':'Exclusive launches',
  'تعرّفي على المنتجات المميزة الجديدة.':'Explore our special new arrivals.',
  'منتجات جديدة اختارها المتجر لتكون ضمن الإطلاقات الحصرية.':'New products selected for the store’s exclusive launches.',
  'نايا • مستشارة التسوّق':'Naia • Shopping advisor',
  'نايا تساعدك تختاري الأنسب':'Let Naia help you choose',
  'اسألي نايا عن منتج، هدية، عطر، سياسة المتجر أو تنسيق الإكسسوارات.':'Ask Naia about products, gifts, fragrances, store policies, or matching accessories.',
  'ابدئي الاختيار':'Find your favorites',
  'جهّزي إطلالتك':'Create your look',
  'بحث مباشر في المنتجات ومعلومات المتجر':'Search products and store information',
  'هدية مناسبة':'Find a gift',
  'اختيار عطر':'Choose a fragrance',
  'تنسيق إكسسوارات':'Match accessories',
  'المنتجات والعروض':'Products and offers',
  'يا أهلا فيكي حبيبتي 🌸 أنا نايا، شو بقدر ساعدك اليوم؟':'Welcome 🌸 I’m Naia. How can I help you today?',
  'يا أهلا فيك 🌸 أنا نايا، شو بقدر ساعدك اليوم؟':'Welcome 🌸 I’m Naia. How can I help you today?',
  'اكتبي أو احكي سؤالك لنايا...':'Type or speak your question to Naia...',
  'اكتبي سؤالك لمساعد التسوق':'Ask your shopping advisor',
  'إرسال سؤال صوتي':'Send a voice question',
  'تسجيل سؤال صوتي':'Record a voice question',
  'إرسال':'Send',
  'إغلاق':'Close',
  'لإرسال سؤال صوتي، اضغطي رمز الميكروفون وتحدثي، ثم اضغطي رمز الإيقاف للإرسال. يُحوَّل كلامك إلى نص ويُرسل لنايا، ولا يحفظ الموقع التسجيل.':'Tap the microphone and speak, then tap stop to send. Your speech is transcribed for Naia; the store does not save the recording.',
  'استمعي لرد نايا':'Listen to Naia',
  'استمعي للرد مرة أخرى':'Listen again',
  'إيقاف الصوت':'Stop audio',
  'استمعي إلى الرد بصوت نايا':'Listen to Naia’s reply',
  'إيقاف صوت نايا':'Stop Naia’s voice',
  'تواصلي مع المتجر على واتساب':'Contact the store on WhatsApp',
  'زهري':'Floral','منعش':'Fresh','مسك':'Musk','خشبي':'Woody','ناعم':'Soft','دافئ':'Warm',
  'هدية':'Gift','دوام':'Work','سهرة':'Evening','يومي':'Everyday','مناسبة خاصة':'Special occasion',
  'عطور تناسب النفحات المختارة':'Fragrances matching your selected notes',
  'اختاري نفحة لعرض العطور الأقرب لها':'Choose a note to explore matching fragrances',
  'لا توجد عطور متاحة بهذا الاختيار حاليًا. جرّبي نفحة أخرى.':'No fragrances match right now. Try another note.',
  'اختاري ساعة لعرض الإكسسوارات ذات الطابع المشترك.':'Choose a watch to explore accessories in a similar style.',
  'لا توجد ساعات متاحة حاليًا.':'No watches are available right now.',
  'اختيارات إكسسوارات متوفرة لتكمّلي تنسيق ساعتك.':'Available accessories to complete your watch styling.',
  '‹ اختيار ساعة أخرى':'‹ Choose another watch',
  'لا توجد إكسسوارات متاحة حاليًا.':'No accessories are available right now.',
  'اختاري مناسبة لعرض المنتجات المرتبطة بها.':'Choose an occasion to explore related products.',
  'ما في اختيارات متاحة لهذه المناسبة حاليًا.':'No picks are available for this occasion right now.',
  'لا توجد منتجات متاحة حاليًا.':'No products are available right now.',
  'منتجات أُدرجت كإطلاق حصري من لوحة التحكم.':'Products selected by the store as exclusive launches.',
  'ما في إطلاقات حصرية متاحة حاليًا.':'No exclusive launches are available right now.'
 };
 const masculineWords=[
  ['تختاري','تختار'],['بتحبّي','بتحب'],['بتحبيهم','بتحبهم'],['بتحبي','بتحب'],
  ['تحبينها','تحبها'],['اختاري','اختر'],['اكتشفي','اكتشف'],['نسّقي','نسّق'],['أكملي','أكمل'],
  ['تعرّفي','تعرّف'],['اسألي','اسأل'],['ابدئي','ابدأ'],['جهّزي','جهّز'],['اكتبي','اكتب'],['ابحثي','ابحث'],
  ['احكي','احكِ'],['اضغطي','اضغط'],['تحدثي','تحدث'],['استمعي','استمع'],['تواصلي','تواصل'],
  ['جرّبي','جرّب'],['سجّلي','سجّل'],['أضيفي','أضف'],['شوفي','شوف'],['استخدميها','استخدمها'],
  ['سيدتي','سيدي'],['تسوقي','تسوّق'],['تسوقكِ','تسوقك'],['تحتاجينه','تحتاجه'],
  ['تستحقين','تستحق'],['لم تضيفي','لم تضف'],['بتقدري','بتقدر'],['تكمّلي','تكمّل']
 ];
 const additional={
  'ابحثي عن قطعة مميزة':'Find something special','ابحثي عن منتج':'Search products','ابحثي عن منتج...':'Search products…',
  'تسوقي الآن':'Shop now','تسوقي حسب الفئة':'Shop by category','اختاري اللون / الخيار':'Choose options',
  'أضيفي للسلة':'Add to cart','🔔 سجّلي في قائمة التوفر':'Join availability list','🌸 شوفي أشياء بتشبهها':'See similar items',
  'جرّبي حظّك':'Spin & win','لفّي الدولاب':'Spin the wheel','سجّلي دخولك وجرّبي حظك':'Sign in and spin',
  'استخدميها بالسلة':'Use in cart','إلك وللي بتحبيهم':'For you and your loved ones','قوائمي والصحبات':'My lists and friends',
  'ساعديني أختار':'Help me choose','إلك ولصاحبتك':'For you and your friend','لأجلك سيدتي':'Just for you',
  'لم تضيفي منتجات للمفضلة بعد.':'You have no favorites yet.','كل ما تحتاجينه.. في مكان واحد':'Everything you need in one place',
  'تواصلي معنا عبر واتساب':'Contact us on WhatsApp','📞 تواصلي معنا':'Contact us',
  'لأنك تستحقين ،،،':'Because you deserve it'
 };
 Object.assign(translations,additional);
 const maleExact={'لفّي الدولاب':'لفّ الدولاب','ساعديني أختار':'ساعديني أختار',
  'يا أهلا فيكي حبيبتي 🌸 أنا نايا، شو بقدر ساعدك اليوم؟':'يا أهلا فيك 🌸 أنا نايا، شو بقدر ساعدك اليوم؟'};
 function isMale(){return ['male','m','ذكر'].includes(String(window.getAccount?.()?.gender||'').trim().toLowerCase())}
 function addressed(value){
  if(!isMale())return value;
  if(Object.hasOwn(maleExact,value))return maleExact[value];
  let result=value;for(const [female,male] of masculineWords)result=result.split(female).join(male);
  return result;
 }
 const roots='#storeDiscoveryIdeas,#lfStoreAiCard,#lfStoreAiDialog,#lfIdeaModal,#noEntry,button,input[placeholder],textarea[placeholder],.sectionTitle,.offerText,#brandTagline,footer,#sideAccountGreeting,.accountGreeting';
 const seen=new WeakMap();
 function english(){return document.documentElement.lang==='en'}
 function text(value){return english()?(translations[value]||value):addressed(value)}
 function translate(){
  document.querySelectorAll(roots).forEach(root=>{
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
   let node;
   while((node=walker.nextNode())){
    if(node.parentElement.closest('.lf-store-ai-message:not(.lf-store-ai-welcome),.lf-idea-product strong,.lf-idea-product span,[data-product-id],[data-key],.lf-wheel-slot,.lf-wheel-reward b'))continue;
    const current=node.nodeValue,known=seen.get(node);
    const original=known&&current===known.last?known.original:current;
    const trimmed=original.trim();
    if(!Object.hasOwn(translations,trimmed))continue;
    const next=original.replace(trimmed,text(trimmed));
    seen.set(node,{original,last:next});if(current!==next)node.nodeValue=next;
   }
   [root,...root.querySelectorAll('[aria-label],[placeholder],[title]')].forEach(el=>{
    for(const attr of ['aria-label','placeholder','title']){
     const current=el.getAttribute(attr);if(!current)continue;
     const record=seen.get(el)||{},known=record[attr];
     const original=known&&current===known.last?known.original:current;
     if(!Object.hasOwn(translations,original))continue;
     const next=text(original);record[attr]={original,last:next};seen.set(el,record);
     if(current!==next)el.setAttribute(attr,next);
    }
   });
  });
 }
 let queued=false;
 const schedule=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;translate()})};
 document.addEventListener('lf:languagechange',schedule);
 document.addEventListener('lf:accountchange',schedule);
 new MutationObserver(records=>{
  if(records.some(r=>(r.target.nodeType===1?r.target:r.target.parentElement)?.closest?.(roots)||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches(roots)||n.querySelector(roots)))))schedule();
 }).observe(document.body,{childList:true,subtree:true,characterData:true});
 window.LFStoreLanguage={text,translate};translate();
})();
