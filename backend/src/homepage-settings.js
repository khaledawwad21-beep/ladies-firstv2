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
  if (Object.hasOwn(incoming, 'hero_slides')) {
    if (!Array.isArray(incoming.hero_slides) || incoming.hero_slides.length > 12) invalid('الحد الأقصى 12 صورة للسلايدر');
    result.hero_slides = incoming.hero_slides.map((slide, index) => {
      if (!slide || typeof slide !== 'object' || Array.isArray(slide)) invalid('بيانات صورة السلايدر غير صالحة');
      const clean = {id: 'slide-' + (index + 1), image: imageUrl(slide.image)};
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
    result.hero_text_style = clean;
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
