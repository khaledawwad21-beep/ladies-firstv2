'use strict';

const HERO_FONTS = ['Tahoma,Arial,sans-serif', 'Arial,Tahoma,sans-serif', 'Georgia,serif'];
function invalid(message) { const error = new Error(message); error.status = 400; error.code = 'INVALID_HOMEPAGE_SETTINGS'; throw error; }
function imageUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) invalid('رابط صورة السلايدر غير صالح');
  const url = value.trim();
  if (/^\/(?!\/)[^\s\\<>"']+$/.test(url)) return url;
  try { const parsed = new URL(url); if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password) return parsed.href; } catch {}
  invalid('استخدمي رابط صورة HTTP أو HTTPS أو صورة مرفوعة للمتجر');
}
function socialUrl(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || value.length > 2048) invalid('رابط التواصل غير صالح');
  try {
    const parsed = new URL(value.trim());
    if (!['https:','http:'].includes(parsed.protocol) || parsed.username || parsed.password) invalid('رابط التواصل غير صالح');
    return parsed.href;
  } catch {
    invalid('رابط التواصل غير صالح');
  }
}

function validateHomepageSettings(incoming) {
  const result = {...incoming};
  if (Object.hasOwn(incoming, 'feature_carousels')) {
    const settings=incoming.feature_carousels;
    if (!settings || typeof settings!=='object' || Array.isArray(settings)) invalid('إعدادات شرائح المنتجات غير صالحة');
    result.feature_carousels={};
    for(const key of ['top5','bestSellers']) {
      const item=settings[key];
      if(!item || typeof item!=='object' || typeof item.intervalSeconds!=='number' || !Number.isFinite(item.intervalSeconds) || item.intervalSeconds<2 || item.intervalSeconds>30 || !['smooth','slide','fade','instant'].includes(item.transition)) invalid('اختاري مدة بين 2 و30 ثانية وأسلوب انتقال صالح');
      result.feature_carousels[key]={intervalSeconds:item.intervalSeconds,transition:item.transition};
    }
  }
  if (Object.hasOwn(incoming, 'store_description')) {
    if (typeof incoming.store_description !== 'string' || incoming.store_description.length > 80) invalid('النص أسفل اسم المتجر طويل أو غير صالح');
    result.store_description = incoming.store_description.trim();
  }
  if (Object.hasOwn(incoming, 'hero_slides')) {
    if (!Array.isArray(incoming.hero_slides) || incoming.hero_slides.length > 12) invalid('الحد الأقصى 12 صورة للسلايدر');
    result.hero_slides = incoming.hero_slides.map((slide, index) => {
      if (!slide || typeof slide !== 'object' || Array.isArray(slide)) invalid('بيانات صورة السلايدر غير صالحة');
      const clean = {id: 'slide-' + (index + 1), image: imageUrl(slide.image), mobileImage: slide.mobileImage ? imageUrl(slide.mobileImage) : '', hideText: slide.hideText === true};
      for (const key of ['titleAr', 'titleEn', 'descAr', 'descEn']) {
        const value = slide[key] ?? '';
        if (typeof value !== 'string' || value.length > (key.startsWith('title') ? 200 : 1000)) invalid('نص السلايدر طويل أو غير صالح');
        clean[key] = value.trim();
      }
      return clean;
    });
  }
  if (Object.hasOwn(incoming, 'hero_text_style')) {
    const style = incoming.hero_text_style;
    if (!style || typeof style !== 'object' || Array.isArray(style)) invalid('تنسيق السلايدر غير صالح');
    const clean = {};
    for (const key of ['color', 'bgColor']) {
      if (typeof style[key] !== 'string' || !/^#[a-f\d]{6}$/i.test(style[key])) invalid('لون السلايدر غير صالح');
      clean[key] = style[key];
    }
    for (const key of ['opacity', 'bgOpacity']) {
      if (typeof style[key] !== 'number' || !Number.isFinite(style[key]) || style[key] < 0 || style[key] > 1) invalid('الشفافية يجب أن تكون بين 0 و1');
      clean[key] = style[key];
    }
    if (!HERO_FONTS.includes(style.font)) invalid('خط السلايدر غير مدعوم');
    clean.font = style.font;
    for (const key of ['x', 'y']) {
      const value = style[key] === undefined ? 70 : style[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) invalid('مكان النص يجب أن يكون بين 0 و100');
      clean[key] = Math.round(value);
    }
    const seconds = style.intervalSeconds ?? 3;
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 2 || seconds > 30) invalid('مدة التقليب يجب أن تكون بين 2 و30 ثانية');
    const transition = style.transition ?? 'fade';
    if (!['smooth','fade','slide','zoom','instant'].includes(transition)) invalid('أسلوب الانتقال غير صالح');
    clean.intervalSeconds = seconds;
    clean.transition = transition;
    result.hero_text_style = clean;
  }
  if (Object.hasOwn(incoming, 'shipping_fees')) {
    const fees = incoming.shipping_fees;
    if (!fees || typeof fees !== 'object' || Array.isArray(fees)) invalid('رسوم التوصيل غير صالحة');
    const clean = {};
    for (const key of ['westbank','jerusalem','inside']) {
      const value = Number(fees[key]);
      if (!Number.isFinite(value) || value < 0 || value > 10000) invalid('رسوم التوصيل غير صالحة');
      clean[key] = Math.round(value * 100) / 100;
    }
    result.shipping_fees = clean;
  }
  if (Object.hasOwn(incoming, 'social_links')) {
    const links = incoming.social_links;
    if (!links || typeof links !== 'object' || Array.isArray(links)) invalid('روابط التواصل غير صالحة');
    const supported = ['whatsapp','instagram','snapchat','facebook','tiktok'];
    const clean = {};
    for (const key of supported) {
      const item = links[key];
      if (item === undefined) continue;
      if (!item || typeof item !== 'object' || Array.isArray(item)) invalid('بيانات رابط التواصل غير صالحة');
      clean[key] = {
        url: socialUrl(item.url ?? ''),
        enabled: item.enabled !== false
      };
    }
    result.social_links = clean;
  }
  return result;
}
module.exports = {validateHomepageSettings};
