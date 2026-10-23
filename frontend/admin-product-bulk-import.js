(() => {
  const PRODUCT_HEADERS = {
    ref: 'مرجع الملف (اختياري، ليس رقم المنتج)', name: 'اسم الصنف*', category: 'الفئة*', brand: 'البراند',
    barcode: 'الباركود', price: 'سعر البيع الحالي*', oldPrice: 'السعر الأصلي', costPrice: 'تكلفة الشراء',
    stock: 'المخزون العام', supplier: 'المورد / التاجر', active: 'فعال؟ (نعم/لا)', mainImage: 'رابط الصورة الرئيسية',
    subImages: 'روابط الصور الإضافية (افصل بينها بـ |)', description: 'الوصف', videos: 'روابط الفيديو (افصل بينها بـ |)',
    scentTags: 'نفحات العطر (افصل بينها بـ |)', styleTags: 'وسوم التنسيق (افصل بينها بـ |)',
    occasionTags: 'المناسبات (افصل بينها بـ |)', exclusiveLaunch: 'إطلاق حصري؟ (نعم/لا)',
    saleStartsAt: 'بداية التخفيض (YYYY-MM-DD)', saleEndsAt: 'نهاية التخفيض (YYYY-MM-DD)'
  };
  const OPTION_HEADERS = { ref: 'مرجع الملف (مطابق لورقة الأصناف)', name: 'الخيار / اللون', stock: 'مخزون الخيار' };
  const clean = value => String(value ?? '').trim();
  const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parseBool = value => {
    const s=clean(value); if(!s)return false;
    if(/^(نعم|yes|true|1|فعال|فعّال)$/i.test(s))return true;
    if(/^(لا|no|false|0|متوقف|غير فعال)$/i.test(s))return false;
    throw Error('استخدمي «نعم» أو «لا» فقط في خانات التفعيل.');
  };
  function colNumber(ref) { let n=0; for (const ch of ref.match(/^[A-Z]+/i)?.[0]||'') n=n*26+ch.toUpperCase().charCodeAt(0)-64; return n-1; }
  function xlsxDate(value) {
    if (typeof value === 'number' && value > 20000 && value < 90000) {
      const date = new Date(Date.UTC(1899,11,30) + Math.floor(value)*86400000);
      return date.toISOString().slice(0,10);
    }
    const s=clean(value); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const match=s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
    if(match){const a=Number(match[1]),b=Number(match[2]),y=Number(match[3]);const d=new Date(Date.UTC(y,b-1,a));if(d.getUTCFullYear()===y&&d.getUTCMonth()===b-1&&d.getUTCDate()===a)return d.toISOString().slice(0,10);}
    return s;
  }
  function parseXml(text) { const xml=new DOMParser().parseFromString(text,'application/xml'); if(xml.querySelector('parsererror'))throw Error('تعذر قراءة أحد أوراق ملف Excel.'); return xml; }
  async function parseSheet(zip, path, shared) {
    const entry=zip.file(path); if(!entry)throw Error('ورقة Excel غير موجودة: '+path);
    const doc=parseXml(await entry.async('text'));
    const rows=[...doc.getElementsByTagNameNS('*','row')].map(row=>{
      const cells={};
      for(const cell of row.getElementsByTagNameNS('*','c')){
        const idx=colNumber(cell.getAttribute('r')||'A1'); const type=cell.getAttribute('t');
        const v=cell.getElementsByTagNameNS('*','v')[0]?.textContent||'';
        let value=v;
        if(type==='s')value=shared[Number(v)]??'';
        else if(type==='inlineStr')value=[...cell.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join('');
        else if(type==='b')value=v==='1';
        else if(v!==''&&Number.isFinite(Number(v)))value=Number(v);
        cells[idx]=value;
      }
      return cells;
    });
    const headerRow=rows.findIndex(row=>Object.values(row).some(v=>clean(v)));
    if(headerRow<0)return [];
    return rows.slice(headerRow).map(row=>({row}));
  }
  async function readWorkbook(file) {
    if(!window.JSZip)throw Error('مكتبة قراءة Excel لم تحمل. حدّثي الصفحة وجربي مرة ثانية.');
    if(!file)throw Error('اختاري ملف Excel أولًا.');
    if(file.size>4*1024*1024)throw Error('حجم الملف أكبر من 4 ميغابايت.');
    const zip=await window.JSZip.loadAsync(file,{checkCRC32:true});
    const files=Object.keys(zip.files); if(files.length>100)throw Error('ملف Excel يحتوي عناصر أكثر من المسموح.');
    const workbook=parseXml(await zip.file('xl/workbook.xml').async('text'));
    const relDoc=parseXml(await zip.file('xl/_rels/workbook.xml.rels').async('text'));
    const rels={}; for(const rel of relDoc.getElementsByTagNameNS('*','Relationship'))rels[rel.getAttribute('Id')]=rel.getAttribute('Target');
    const sheets={}; for(const sheet of workbook.getElementsByTagNameNS('*','sheet')){
      const name=sheet.getAttribute('name'), id=sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
      let target=rels[id]||''; target=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
      const parts=[]; for(const part of target.split('/')){if(part==='..')parts.pop();else if(part!=='.')parts.push(part);} sheets[name]=parts.join('/');
    }
    const sharedEntry=zip.file('xl/sharedStrings.xml'); let shared=[];
    if(sharedEntry){const doc=parseXml(await sharedEntry.async('text')); shared=[...doc.getElementsByTagNameNS('*','si')].map(si=>[...si.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join(''));}
    function rowsToObjects(rows, headers) {
      if(!rows.length)return [];
      const [header,...data]=rows, positions={};
      for(const [key,label] of Object.entries(headers)){const pos=Object.keys(header.row).find(i=>clean(header.row[i])===label);if(pos!==undefined)positions[key]=Number(pos);}
      if(Object.keys(positions).length!==Object.keys(headers).length)throw Error('تأكدي أن عناوين الأعمدة مطابقة لعناوين القالب الرسمي.');
      return data.map(({row})=>{const obj={};for(const [key,pos] of Object.entries(positions))obj[key]=row[pos]??'';return obj;})
        .filter(obj=>Object.values(obj).some(v=>clean(v)))
        .filter(obj=>!(clean(obj.name)==='حقيبة مثال'&&clean(obj.ref)==='مثال-1'));
    }
    if(!sheets['الأصناف'])throw Error('لم أجد ورقة «الأصناف». نزّلي القالب الرسمي واستخدميه.');
    const productRows=await parseSheet(zip,sheets['الأصناف'],shared);
    const optionRows=sheets['الخيارات']?await parseSheet(zip,sheets['الخيارات'],shared):[];
    const products=rowsToObjects(productRows,PRODUCT_HEADERS).map(p=>({...p,price:clean(p.price),oldPrice:clean(p.oldPrice),costPrice:clean(p.costPrice),stock:clean(p.stock),active:parseBool(p.active),exclusiveLaunch:parseBool(p.exclusiveLaunch),saleStartsAt:xlsxDate(p.saleStartsAt),saleEndsAt:xlsxDate(p.saleEndsAt)}));
    const options=rowsToObjects(optionRows,OPTION_HEADERS).map(o=>({...o,stock:clean(o.stock)}));
    if(!products.length)throw Error('الملف ما فيه أصناف للتجهيز.');
    if(products.length>200)throw Error('الحد الأقصى 200 صنف في الدفعة.');
    return {products,options};
  }
  function previewHtml(data) {
    const bad=data.products.map((p,i)=>!clean(p.name)||!clean(p.category)||p.price===''?`الصف ${i+1}: الاسم والفئة والسعر مطلوبة`:p.active&&!clean(p.mainImage)?`الصف ${i+1}: الصنف الفعال يحتاج صورة رئيسية`:null).filter(Boolean);
    const dup=new Set(), refs=new Set(); for(const p of data.products){if(clean(p.barcode)){if(dup.has(clean(p.barcode)))bad.push(`باركود مكرر بالملف: ${clean(p.barcode)}`);dup.add(clean(p.barcode));}if(clean(p.ref)){if(refs.has(clean(p.ref)))bad.push(`مرجع مكرر: ${clean(p.ref)}`);refs.add(clean(p.ref));}}
    for(const o of data.options)if(!refs.has(clean(o.ref)))bad.push(`الخيار مرتبط بمرجع غير موجود: ${clean(o.ref)}`);
    const lines=data.products.slice(0,8).map((p,i)=>`<tr><td>${i+1}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.category)}</td><td>${escapeHtml(p.price)}</td><td>${p.active?'نعم':'لا'}</td></tr>`).join('');
    return `<div class="card"><b>معاينة الملف</b><p>الأصناف: ${data.products.length} · الخيارات: ${data.options.length}</p><div style="overflow:auto"><table><thead><tr><th>#</th><th>الصنف</th><th>الفئة</th><th>السعر</th><th>فعال</th></tr></thead><tbody>${lines}</tbody></table></div>${data.products.length>8?`<p>وتوجد ${data.products.length-8} أصناف أخرى.</p>`:''}${bad.length?`<div class="alert">${bad.map(escapeHtml).join('<br>')}</div>`:'<p>البيانات الأساسية تبدو سليمة. سيُجري الخادم مراجعة كاملة قبل الحفظ.</p>'}<button class="btn primary" id="productBulkConfirm" ${bad.length?'disabled':''}>اعتماد استيراد ${data.products.length} صنف</button></div>`;
  }
  window.productBulkImportOpen = function() {
    if(typeof modal!=='function')return;
    modal('استيراد الأصناف من Excel',`<p>اختاري ملف القالب بعد تعبئته. ستظهر معاينة قبل الحفظ، وإذا ظهر خطأ لن يُحفظ أي صنف.</p><label class="full">ملف Excel (.xlsx)<input id="productBulkFile" class="field" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label><div id="productBulkMessage" class="small-note"></div><div id="productBulkPreview"></div>`);
    document.getElementById('productBulkFile')?.addEventListener('change',async event=>{
      const output=document.getElementById('productBulkPreview'),message=document.getElementById('productBulkMessage');output.innerHTML='';
      try { const data=await readWorkbook(event.target.files[0]);output.innerHTML=previewHtml(data);document.getElementById('productBulkConfirm')?.addEventListener('click',()=>submit(data)); }
      catch(error){message.textContent=error.message||'تعذر قراءة الملف.';}
    });
  };
  async function submit(data) {
    const button=document.getElementById('productBulkConfirm');if(!button)return;button.disabled=true;button.textContent='جارٍ التحقق والحفظ…';
    try {
      const result=await api('/api/admin/products/bulk-import',{method:'POST',body:JSON.stringify(data)});
      const html=`<div class="card"><h3>تم استيراد ${result.imported} صنف بنجاح</h3><p>أنشأ النظام الأرقام التسلسلية تلقائيًا:</p><ul>${result.products.map(p=>`<li>${escapeHtml(p.name)} — ${escapeHtml(p.productNumber)}</li>`).join('')}</ul><button class="btn primary" onclick="closeModal();products()">عرض الأصناف</button></div>`;
      modal('اكتمل الاستيراد',html);
    } catch(error) {
      const message=document.getElementById('productBulkMessage');if(message)message.textContent=error.message||'تعذر استيراد الملف.';
      button.disabled=false;button.textContent='إعادة المحاولة';
    }
  }
})();
