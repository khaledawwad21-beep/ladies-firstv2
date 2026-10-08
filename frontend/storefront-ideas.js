(function () {
  const labels = {
    perfume: { icon: "fa-wand-magic-sparkles", title: "اكتشفي عطرك", desc: "اختاري النفحات التي تحبينها من عطور المتجر." },
    pairing: { icon: "fa-gem", title: "نسّقي ساعتك وإكسسواراتك", desc: "اختاري ساعة، وسنعرض الإكسسوارات ذات الطابع الأقرب لها." },
    occasion: { icon: "fa-calendar-heart", title: "مجموعات المناسبات", desc: "اختيارات مرتبة حسب المناسبة." },
    launch: { icon: "fa-star", title: "إطلاقات حصرية", desc: "منتجات جديدة اختارها المتجر لتكون ضمن الإطلاقات الحصرية." }
  };
  const occasions = ["هدية", "دوام", "سهرة", "يومي", "مناسبة خاصة"];
  let modal;
  function allProducts() { return typeof products !== "undefined" && Array.isArray(products) ? products : []; }
  function metadata(p) { return p && p.metadata && typeof p.metadata === "object" ? p.metadata : {}; }
  function text(v) { return String(v == null ? "" : v).trim(); }
  function splitTags(value) {
    const source = Array.isArray(value) ? value : String(value || "").split(/[,،;؛|\n]+/);
    return [...new Set(source.map(x => text(x).toLowerCase()).filter(Boolean))];
  }
  function productTags(p, key) { return splitTags(p[key] != null ? p[key] : metadata(p)[key]); }
  function category(p) { return text(p.cat || p.category || p.category_name).toLowerCase(); }
  function isPerfume(p) { return /عطر|عطور|perfume/i.test(category(p)); }
  function isAccessory(p) { return /اكسسوار|إكسسوار|accessor/i.test(category(p)); }
  function isWatch(p) { return /ساع|watch/i.test(category(p)); }
  function stock(p) {
    const variants = Array.isArray(p.variants) ? p.variants : [];
    if (variants.length) return variants.reduce((n, v) => n + Math.max(0, Number(v.stock) || 0), 0);
    return Math.max(0, Number(p.stock) || 0);
  }
  function available(items) { return items.filter(p => stock(p) > 0); }
  function lang() { return typeof currentLang !== "undefined" && currentLang === "en"; }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function imageUrl(p) {
    const raw = (Array.isArray(p.mainImages) && p.mainImages[0]) || (Array.isArray(p.images) && p.images[0]) || p.imageUrl || p.image_url || p.image || "";
    const value = text(raw);
    return /^(https?:\/\/|\/)/i.test(value) ? value : "";
  }
  function makeShell() {
    if (modal) return;
    modal = document.createElement("div");
    modal.className = "lf-idea-modal";
    modal.id = "lfIdeaModal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = '<div class="lf-idea-panel" role="dialog" aria-modal="true" aria-labelledby="lfIdeaTitle"><div class="lf-idea-head"><div><span class="lf-idea-kicker">LADIES FIRST</span><h2 id="lfIdeaTitle"></h2><p id="lfIdeaDesc"></p></div><button class="lf-idea-close" type="button" aria-label="إغلاق">×</button></div><div class="lf-idea-tools" id="lfIdeaTools"></div><p class="lf-idea-status" id="lfIdeaStatus" aria-live="polite"></p><div class="lf-idea-results" id="lfIdeaResults"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", e => {
      if (e.target === modal || e.target.closest(".lf-idea-close")) close();
      const action = e.target.closest("[data-idea-action]");
      if (!action) return;
      if (action.dataset.ideaAction === "perfume") showPerfumes(action.dataset.tag || "");
      if (action.dataset.ideaAction === "occasion") showOccasion(action.dataset.tag || "");
      if (action.dataset.ideaAction === "watch") showPairing(action.dataset.id || "");
      if (action.dataset.ideaAction === "product") {
        const id = action.dataset.id;
        if (id && typeof window.openProduct === "function") { close(); window.openProduct(id); }
      }
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && modal && modal.getAttribute("aria-hidden") === "false") close(); });
  }
  function setStatus(value) { document.getElementById("lfIdeaStatus").textContent = value || ""; }
  function showCards(items, emptyMessage) {
    const box = document.getElementById("lfIdeaResults");
    box.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "lf-idea-empty";
      empty.textContent = emptyMessage;
      box.appendChild(empty);
      return;
    }
    items.forEach(p => {
      const card = document.createElement("article");
      card.className = "lf-idea-product";
      const img = document.createElement("img");
      img.src = imageUrl(p) || "/logo.png";
      img.alt = text(p.name) || "منتج من Ladies First";
      img.loading = "lazy";
      img.onerror = () => { img.onerror = null; img.removeAttribute("src"); img.classList.add("lf-idea-no-image"); };
      const name = document.createElement("strong");
      name.textContent = text(p.name) || "منتج من المتجر";
      const detail = document.createElement("span");
      const price = Number(p.price);
      detail.textContent = Number.isFinite(price) ? price.toLocaleString(lang() ? "en" : "ar") + " ₪" : "";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "lf-idea-product-action";
      button.dataset.ideaAction = "product";
      button.dataset.id = String(p.id);
      button.textContent = lang() ? "View details" : "عرض التفاصيل";
      card.append(img, name, detail, button);
      box.appendChild(card);
    });
  }
  function open(kind) {
    makeShell();
    const entry = labels[kind];
    if (!entry) return;
    document.getElementById("lfIdeaTitle").textContent = entry.title;
    document.getElementById("lfIdeaDesc").textContent = entry.desc;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("lf-idea-open");
    if (kind === "perfume") showPerfumes("");
    if (kind === "pairing") showWatchChoices();
    if (kind === "occasion") showOccasion("");
    if (kind === "launch") showLaunches();
  }
  function close() {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lf-idea-open");
  }
  function showPerfumes(tag) {
    const tools = document.getElementById("lfIdeaTools");
    tools.innerHTML = ["زهري", "منعش", "مسك", "خشبي", "ناعم", "دافئ"].map(x => '<button type="button" class="lf-idea-chip ' + (tag === x ? "active" : "") + '" data-idea-action="perfume" data-tag="' + escapeHtml(x) + '">' + escapeHtml(x) + "</button>").join("");
    const perfumes = available(allProducts().filter(isPerfume));
    const results = tag ? perfumes.filter(p => productTags(p, "scentTags").some(t => t.includes(tag.toLowerCase()))) : perfumes;
    setStatus(tag ? "عطور تناسب النفحات المختارة" : "اختاري نفحة لعرض العطور الأقرب لها");
    showCards(results, "لا توجد عطور متاحة بهذا الاختيار حاليًا. جرّبي نفحة أخرى.");
  }
  function showWatchChoices() {
    document.getElementById("lfIdeaTools").replaceChildren();
    const watches = available(allProducts().filter(isWatch));
    setStatus("اختاري ساعة لعرض الإكسسوارات ذات الطابع المشترك.");
    showCards(watches, "لا توجد ساعات متاحة حاليًا.");
    document.querySelectorAll("#lfIdeaResults .lf-idea-product-action").forEach(button => {
      button.dataset.ideaAction = "watch";
      button.textContent = lang() ? "Match accessories" : "نسّقي معها";
    });
  }
  function showPairing(id) {
    const watch = allProducts().find(p => String(p.id) === String(id));
    if (!watch) return showWatchChoices();
    const watchTags = productTags(watch, "styleTags");
    const accessories = available(allProducts().filter(isAccessory));
    const scored = accessories.map(p => {
      const tags = productTags(p, "styleTags");
      const shared = tags.filter(t => watchTags.includes(t));
      return { product: p, score: shared.length, shared };
    }).sort((a, b) => b.score - a.score || Number(b.product.id) - Number(a.product.id));
    const matches = scored.filter(x => x.score > 0);
    const chosen = (matches.length ? matches : scored).slice(0, 8).map(x => x.product);
    setStatus(matches.length ? "إكسسوارات تشترك مع الساعة في: " + [...new Set(scored.flatMap(x => x.shared))].slice(0, 4).join("، ") : "اختيارات إكسسوارات متوفرة لتكمّلي تنسيق ساعتك.");
    const tools = document.getElementById("lfIdeaTools");
    tools.innerHTML = '<button type="button" class="lf-idea-chip" data-idea-action="watch">‹ اختيار ساعة أخرى</button>';
    showCards(chosen, "لا توجد إكسسوارات متاحة حاليًا.");
  }
  function showOccasion(tag) {
    const tools = document.getElementById("lfIdeaTools");
    tools.innerHTML = occasions.map(x => '<button type="button" class="lf-idea-chip ' + (tag === x ? "active" : "") + '" data-idea-action="occasion" data-tag="' + escapeHtml(x) + '">' + escapeHtml(x) + "</button>").join("");
    const items = available(allProducts().filter(p => !tag || productTags(p, "occasionTags").some(t => t.includes(tag.toLowerCase()))));
    setStatus(tag ? "اختيارات مناسبة لـ" + tag : "اختاري مناسبة لعرض المنتجات المرتبطة بها.");
    showCards(items.slice(0, 12), tag ? "ما في اختيارات متاحة لهذه المناسبة حاليًا." : "لا توجد منتجات متاحة حاليًا.");
  }
  function showLaunches() {
    document.getElementById("lfIdeaTools").replaceChildren();
    const items = available(allProducts().filter(p => {
      const m = metadata(p);
      return p.exclusiveLaunch === true || p.exclusiveLaunch === 1 || p.exclusiveLaunch === "true" || m.exclusiveLaunch === true || m.exclusiveLaunch === 1 || m.exclusiveLaunch === "true";
    })).sort((a, b) => {
      const da = Date.parse(a.createdAt || a.created_at || "") || 0;
      const db = Date.parse(b.createdAt || b.created_at || "") || 0;
      return db - da || Number(b.id) - Number(a.id);
    });
    setStatus("منتجات أُدرجت كإطلاق حصري من لوحة التحكم.");
    showCards(items.slice(0, 12), "ما في إطلاقات حصرية متاحة حاليًا.");
  }
  document.addEventListener("click", e => {
    const trigger = e.target.closest("[data-store-idea]");
    if (trigger) open(trigger.dataset.storeIdea);
  });
  window.lfOpenStoreIdea = open;
})();