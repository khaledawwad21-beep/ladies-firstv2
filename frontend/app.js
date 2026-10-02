/* =========================================================
   LADIES FIRST - FRONTEND APP
   Clean integration build for the current index.html
   ========================================================= */
(() => {
  "use strict";

  const API_BASE = "/api";

  const state = {
    page: "home",
    products: [],
    categories: [],
    brands: [],
    offers: [],
    topFive: [],
    bestSellers: [],
    heroSlides: [],
    favorites: readJSON("lf_favorites", []),
    cart: readJSON("lf_cart", []),
    user: readJSON("lf_user", null),
    token: localStorage.getItem("lf_token") || "",
    settings: {},
    currentProduct: null,
    currentFilter: {},
    heroIndex: 0,
    heroTimer: null,
    orderSubmitting: false
  };

  function readJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = (value) => `${Number(value || 0).toFixed(2)} ₪`;

  function escapeHTML(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function saveState() {
    localStorage.setItem("lf_favorites", JSON.stringify(state.favorites));
    localStorage.setItem("lf_cart", JSON.stringify(state.cart));
    if (state.user) localStorage.setItem("lf_user", JSON.stringify(state.user));
    else localStorage.removeItem("lf_user");
  }

  function setToken(token) {
    state.token = token || "";
    if (state.token) localStorage.setItem("lf_token", state.token);
    else localStorage.removeItem("lf_token");
  }

  async function api(path, options = {}) {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
        ...(options.headers || {})
      };

      const response = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        ...options,
        headers
      });

      const raw = await response.text();
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }

      if (!response.ok) {
        const error = new Error(
          data?.message ||
          data?.error ||
          `HTTP ${response.status}`
        );
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.warn("Ladies First API:", path, error);
      return null;
    }
  }

  function toast(message) {
    let node = $("#lfToast");
    if (!node) {
      node = document.createElement("div");
      node.id = "lfToast";
      node.className = "lf-toast";
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(node._timer);
    node._timer = setTimeout(
      () => node.classList.remove("show"),
      2800
    );
  }

  /* =========================================================
     USER / AUTH
     ========================================================= */

  function genderGreeting(gender) {
    const value = String(gender || "").trim().toLowerCase();

    if (["male", "ذكر", "m"].includes(value)) {
      return "نورتنا";
    }

    if (["female", "أنثى", "انثى", "f"].includes(value)) {
      return "نورتينا";
    }

    return "أهلاً وسهلاً";
  }

  function updateGreeting() {
    const node = $("#accountGreeting");
    if (!node) return;

    if (!state.user) {
      node.textContent = "حسابي";
      return;
    }

    const greeting = genderGreeting(state.user.gender);

    node.textContent =
      greeting === "أهلاً وسهلاً"
        ? (state.user.name || greeting)
        : greeting;
  }

  function fillProfile() {
    const user = state.user || {};

    const values = {
      profileName: user.name || "",
      profileEmail: user.email || "",
      profilePhone: user.phone || "",
      profileGender: user.gender || "female",
      profileAge: user.age ?? "",
      loyaltyPoints: Number(
        user.loyaltyPoints ??
        user.loyalty_points ??
        user.points ??
        0
      ).toLocaleString("ar")
    };

    Object.entries(values).forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (!node) return;

      if (id === "loyaltyPoints") {
        node.textContent = value;
      } else {
        node.value = value;
      }
    });
  }

  function renderAccount() {
    const auth = $("#accountAuth");
    const profile = $("#accountProfile");

    if (!auth || !profile) return;

    if (state.user) {
      auth.classList.add("hidden");
      profile.classList.remove("hidden");
      fillProfile();
    } else {
      auth.classList.remove("hidden");
      profile.classList.add("hidden");
    }

    updateGreeting();
  }

  async function loadCurrentUser() {
    if (!state.token) {
      renderAccount();
      return;
    }

    const result = await api("/auth/me");

    if (result?.user) {
      state.user = result.user;
      saveState();
    }

    renderAccount();
  }

  async function loginUser() {
    const contact = $("#loginContact")?.value.trim();
    const password = $("#loginPassword")?.value || "";

    if (!contact || !password) {
      toast("أدخلي البريد أو الهاتف وكلمة المرور");
      return;
    }

    const result = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        contact,
        password
      })
    });

    if (!result) {
      toast("تعذر تسجيل الدخول حالياً");
      return;
    }

    if (result.token) {
      setToken(result.token);
    }

    if (result.user) {
      state.user = result.user;
      saveState();
      renderAccount();

      toast(
        `${genderGreeting(result.user.gender)}، تم تسجيل الدخول بنجاح`
      );

      return;
    }

    toast(result.message || "تعذر تسجيل الدخول");
  }

  async function registerUser() {
    const data = {
      name: $("#registerName")?.value.trim() || "",
      email: $("#registerEmail")?.value.trim() || null,
      phone: $("#registerPhone")?.value.trim() || null,
      gender: $("#registerGender")?.value || null,
      age: $("#registerAge")?.value
        ? Number($("#registerAge").value)
        : null,
      password: $("#registerPassword")?.value || ""
    };

    if (
      !data.name ||
      !data.password ||
      (!data.email && !data.phone)
    ) {
      toast("أكملي البيانات المطلوبة");
      return;
    }

    const result = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify(data)
    });

    if (!result) {
      toast("تعذر إنشاء الحساب حالياً");
      return;
    }

    if (result.token) setToken(result.token);

    if (result.user) {
      state.user = result.user;
      saveState();
      renderAccount();
      toast("تم إنشاء الحساب بنجاح");
    } else {
      toast(result.message || "تعذر إنشاء الحساب");
    }
  }

  async function saveProfile() {
    if (!state.user) {
      toast("سجلي الدخول أولاً");
      return;
    }

    const payload = {
      name: $("#profileName")?.value.trim() || "",
      email: $("#profileEmail")?.value.trim() || null,
      phone: $("#profilePhone")?.value.trim() || null,
      gender: $("#profileGender")?.value || null,
      age: $("#profileAge")?.value
        ? Number($("#profileAge").value)
        : null
    };

    if (!payload.name) {
      toast("الاسم مطلوب");
      return;
    }

    const result = await api("/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });

    if (!result) {
      toast("تعذر حفظ البيانات حالياً");
      return;
    }

    if (result.user) {
      state.user = result.user;
    } else {
      state.user = {
        ...state.user,
        ...payload
      };
    }

    saveState();
    renderAccount();

    toast(
      `تم حفظ البيانات — ${genderGreeting(state.user.gender)}`
    );
  }

  function logoutUser() {
    state.user = null;
    setToken("");
    saveState();
    renderAccount();
    updateGreeting();
    navigate("home");
    toast("تم تسجيل الخروج");
  }

  function switchAuthTab(tab) {
    const login = $("#loginForm");
    const register = $("#registerForm");
    const tabs = $$("[data-auth-tab]");

    if (!login || !register) return;

    login.classList.toggle("hidden", tab !== "login");
    register.classList.toggle("hidden", tab !== "register");

    tabs.forEach(btn => {
      btn.classList.toggle(
        "active",
        btn.dataset.authTab === tab
      );
    });
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */

  const pageMap = {
    home: "homePage",
    products: "productsPage",
    product: "productPage",
    categories: "categoriesPage",
    brands: "brandsPage",
    offers: "offersPage",
    bestsellers: "bestsellersPage",
    favorites: "favoritesPage",
    cart: "cartPage",
    checkout: "checkoutPage",
    orders: "ordersPage",
    account: "accountPage"
  };

  function closeMobileMenu() {
    $("#mobileMenu")?.classList.add("hidden");
    $("#pageOverlay")?.classList.add("hidden");
    $("#mobileMenuButton")?.classList.remove("active");
  }

  function openMobileMenu() {
    $("#mobileMenu")?.classList.remove("hidden");
    $("#pageOverlay")?.classList.remove("hidden");
    $("#mobileMenuButton")?.classList.add("active");
  }

  function showPage(page) {
    if (!pageMap[page]) page = "home";

    state.page = page;

    $$(".page").forEach(section => {
      section.classList.add("hidden");
      section.classList.remove("active");
    });

    const target = document.getElementById(pageMap[page]);

    if (target) {
      target.classList.remove("hidden");
      target.classList.add("active");
    }

    closeMobileMenu();
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    updatePageUI();
  }

  function navigate(page, data = null) {
    if (data) {
      if (page === "product") {
        state.currentProduct = data;
      }

      if (page === "products") {
        state.currentFilter = data || {};
      }
    }

    showPage(page);
  }

  function updatePageUI() {
    renderAccount();
    renderCart();
    renderFavorites();
    renderProducts();
    renderProductDetails();
    renderOrders();

    if (state.page === "checkout") {
      renderCheckout();
    }
  }

  /* =========================================================
     PRODUCT HELPERS
     ========================================================= */

  function productId(product) {
    return (
      product?.id ??
      product?._id ??
      product?.product_id ??
      product?.productId
    );
  }

  function productName(product) {
    return (
      product?.name ??
      product?.title ??
      "منتج"
    );
  }

  function productImage(product) {
  if (product?.imageUrl) return product.imageUrl;
  if (product?.image_url) return product.image_url;
  if (product?.image) return product.image;
  if (product?.thumbnail) return product.thumbnail;

  if (Array.isArray(product?.images) && product.images.length) {
    const first = product.images[0];

    if (typeof first === "string") {
      return first;
    }

    return first?.url ||
      first?.imageUrl ||
      first?.image_url ||
      first?.src ||
      "";
  }

  return "";
  }

  function productPrice(product) {
    return Number(
      product?.sale_price ??
      product?.price ??
      0
    );
  }

  function productOldPrice(product) {
    return Number(
      product?.old_price ??
      product?.compare_at_price ??
      product?.oldPrice ??
      0
    );
  }

  function productStock(product) {
    return Number(
      product?.stock ??
      product?.inventory ??
      product?.quantity ??
      0
    );
  }

  function productVariants(product) {
    return Array.isArray(product?.variants)
      ? product.variants
      : [];
  }

  function variantId(variant) {
    return (
      variant?.id ??
      variant?._id ??
      variant?.variant_id ??
      variant?.variantId
    );
  }

  function variantName(variant) {
    return (
      variant?.name ??
      variant?.title ??
      variant?.label ??
      ""
    );
  }

  function variantPrice(variant, product) {
    return Number(
      variant?.sale_price ??
      variant?.price ??
      productPrice(product)
    );
  }

  function variantStock(variant, product) {
    return Number(
      variant?.stock ??
      variant?.inventory ??
      productStock(product)
    );
  }
  /* =========================================================
     PRODUCT CARDS
     ========================================================= */

  function isFavorite(id) {
    return state.favorites.some(
      item => String(item) === String(id)
    );
  }

  function toggleFavorite(id) {
    const key = String(id);

    if (isFavorite(key)) {
      state.favorites = state.favorites.filter(
        item => String(item) !== key
      );
      toast("تمت إزالة المنتج من المفضلة");
    } else {
      state.favorites.push(key);
      toast("تمت إضافة المنتج للمفضلة");
    }

    saveState();
    renderFavorites();
    renderProducts();
  }

  function findProduct(id) {
    return state.products.find(
      product => String(productId(product)) === String(id)
    );
  }

  function productCard(product) {
    const id = productId(product);
    const name = productName(product);
    const image = productImage(product);
    const price = productPrice(product);
    const oldPrice = productOldPrice(product);
    const stock = productStock(product);
    const favorite = isFavorite(id);

    const discount =
      oldPrice > price && oldPrice > 0
        ? Math.round((1 - price / oldPrice) * 100)
        : 0;

    return `
      <article class="product-card" data-product-id="${escapeHTML(id)}">

        <div class="product-card-image">

          ${discount > 0
            ? `<span class="product-discount">-${discount}%</span>`
            : ""
          }

          <button
            class="favorite-btn ${favorite ? "active" : ""}"
            type="button"
            data-action="favorite"
            data-product-id="${escapeHTML(id)}"
            aria-label="المفضلة"
          >
            ${favorite ? "♥" : "♡"}
          </button>

          <button
            class="product-open-image"
            type="button"
            data-action="product"
            data-product-id="${escapeHTML(id)}"
          >
            ${
              image
                ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(name)}" loading="lazy">`
                : `<div class="product-image-placeholder">Ladies First</div>`
            }
          </button>
        </div>

        <div class="product-card-body">

          <h3 class="product-title">
            ${escapeHTML(name)}
          </h3>

          <div class="product-price-row">
            <strong class="product-price">
              ${money(price)}
            </strong>

            ${
              oldPrice > price
                ? `<del class="product-old-price">${money(oldPrice)}</del>`
                : ""
            }
          </div>

          ${
            stock <= 0
              ? `<div class="product-stock out">غير متوفر حالياً</div>`
              : ""
          }

          <div class="product-card-actions">

            <button
              type="button"
              class="btn btn-primary"
              data-action="product"
              data-product-id="${escapeHTML(id)}"
            >
              عرض المنتج
            </button>

            <button
              type="button"
              class="btn btn-secondary"
              data-action="add-cart"
              data-product-id="${escapeHTML(id)}"
              ${stock <= 0 ? "disabled" : ""}
            >
              أضف للسلة
            </button>

          </div>

        </div>
      </article>
    `;
  }

  function renderProducts() {
    const grids = [
      $("#productsGrid"),
      $("#offersGrid"),
      $("#bestsellersGrid"),
      $("#favoritesGrid")
    ];

    const filter = state.currentFilter || {};

    let products = [...state.products];

    if (filter.category) {
      products = products.filter(product =>
        String(
          product.category_id ??
          product.categoryId ??
          product.category?.id ??
          ""
        ) === String(filter.category)
      );
    }

    if (filter.brand) {
      products = products.filter(product =>
        String(
          product.brand_id ??
          product.brandId ??
          product.brand?.id ??
          ""
        ) === String(filter.brand)
      );
    }

    if (filter.search) {
      const query = String(filter.search).toLowerCase();

      products = products.filter(product =>
        [
          productName(product),
          product.description,
          product.category?.name,
          product.brand?.name
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    const productsGrid = $("#productsGrid");

    if (productsGrid) {
      productsGrid.innerHTML = products.length
        ? products.map(productCard).join("")
        : `
          <div class="empty-state">
            <h3>لا توجد منتجات</h3>
            <p>جربي تغيير البحث أو التصنيف.</p>
          </div>
        `;
    }

    const offersGrid = $("#offersGrid");

    if (offersGrid) {
      const offers =
        state.offers.length
          ? state.offers
          : products.filter(product =>
              productOldPrice(product) > productPrice(product)
            );

      offersGrid.innerHTML = offers.length
        ? offers.map(productCard).join("")
        : `
          <div class="empty-state">
            <h3>لا توجد عروض حالياً</h3>
          </div>
        `;
    }

    const bestGrid = $("#bestsellersGrid");

    if (bestGrid) {
      const best =
        state.bestSellers.length
          ? state.bestSellers
          : products.slice(0, 10);

      bestGrid.innerHTML = best.length
        ? best.map(productCard).join("")
        : `
          <div class="empty-state">
            <h3>لا توجد منتجات حالياً</h3>
          </div>
        `;
    }

    renderMiniProductSlider(
  $("#topFiveSlider"),
  state.topFive.length
    ? state.topFive
    : products.slice(0, 5)
);

renderMiniProductSlider(
  $("#bestSellersSlider"),
  state.bestSellers.length
    ? state.bestSellers
    : products.slice(0, 10)
);

renderMiniProductSlider(
  $("#quickOffersSlider"),
  state.offers.length
    ? state.offers
    : products.filter(product =>
        productOldPrice(product) > productPrice(product)
      )
);

/*
 * بيلبق معه:
 * نعرض منتجات فعلية بدل صندوق النص الفارغ.
 */
const completeLookProducts =
  state.bestSellers.length
    ? state.bestSellers.slice(0, 8)
    : state.topFive.length
      ? state.topFive.slice(0, 8)
      : products.slice(0, 8);

renderMiniProductSlider(
  $("#completeLookSlider"),
  completeLookProducts
);
  }
  function renderMiniProductSlider(container, products) {
    if (!container) return;

    if (!products?.length) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = products
      .map(productCard)
      .join("");
  }

  /* =========================================================
     PRODUCT DETAILS
     ========================================================= */

  function renderProductDetails() {
    const container = $("#productDetails");

    if (!container) return;

    const product = state.currentProduct;

    if (!product) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>اختاري منتجاً</h3>
        </div>
      `;
      return;
    }

    const id = productId(product);
    const name = productName(product);
    const image = productImage(product);
    const variants = productVariants(product);
    const price = productPrice(product);
    const stock = productStock(product);

    container.innerHTML = `
      <div class="product-details-layout">

        <div class="product-details-image">
          ${
            image
              ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(name)}">`
              : `<div class="product-image-placeholder">Ladies First</div>`
          }
        </div>

        <div class="product-details-info">

          <button
            type="button"
            class="back-button"
            data-action="back-products"
          >
            ← العودة للمنتجات
          </button>

          <h1>${escapeHTML(name)}</h1>

          <div class="product-details-price">
            ${money(price)}
          </div>

          ${
            productOldPrice(product) > price
              ? `
                <del>
                  ${money(productOldPrice(product))}
                </del>
              `
              : ""
          }

          ${
            product.description
              ? `
                <p class="product-description">
                  ${escapeHTML(product.description)}
                </p>
              `
              : ""
          }

          ${
            variants.length
              ? `
                <div class="product-variants">
                  <label for="productVariant">
                    اختاري الخيار
                  </label>

                  <select id="productVariant">
                    ${variants.map((variant, index) => `
                      <option
                        value="${escapeHTML(variantId(variant))}"
                        data-price="${variantPrice(variant, product)}"
                        data-stock="${variantStock(variant, product)}"
                        ${index === 0 ? "selected" : ""}
                      >
                        ${escapeHTML(
                          variantName(variant) ||
                          `الخيار ${index + 1}`
                        )}
                      </option>
                    `).join("")}
                  </select>
                </div>
              `
              : ""
          }

          <div class="product-quantity">
            <label for="productQuantity">
              الكمية
            </label>

            <div class="quantity-control">
              <button
                type="button"
                data-action="quantity-minus"
              >
                −
              </button>

              <input
                id="productQuantity"
                type="number"
                min="1"
                value="1"
                max="${Math.max(stock, 1)}"
              >

              <button
                type="button"
                data-action="quantity-plus"
              >
                +
              </button>
            </div>
          </div>

          <button
            id="productAddToCart"
            type="button"
            class="btn btn-primary btn-large"
            data-action="add-detail-cart"
            data-product-id="${escapeHTML(id)}"
            ${stock <= 0 ? "disabled" : ""}
          >
            ${stock <= 0 ? "غير متوفر" : "أضف للسلة"}
          </button>

        </div>
      </div>
    `;
  }

  /* =========================================================
     CART
     ========================================================= */

  function cartItemProduct(item) {
    return findProduct(item.productId);
  }

  function cartSubtotal() {
    return state.cart.reduce((total, item) => {
      const product = cartItemProduct(item);

      if (!product) return total;

      const variants = productVariants(product);
      const variant = variants.find(
        v => String(variantId(v)) === String(item.variantId)
      );

      const price = variant
        ? variantPrice(variant, product)
        : productPrice(product);

      return total + price * Number(item.quantity || 0);
    }, 0);
  }

  function cartShipping(subtotal) {
    if (!subtotal) return 0;
    return subtotal >= 150 ? 0 : 15;
  }

  function cartPackaging() {
    return state.cart.some(item => item.giftPackaging)
      ? 10
      : 0;
  }

  function cartTotal() {
    const subtotal = cartSubtotal();
    return subtotal + cartShipping(subtotal) + cartPackaging();
  }

  function addToCart(product, quantity = 1, variant = null) {
    if (!product) return;

    const id = productId(product);
    const variants = productVariants(product);

    const selectedVariant =
      variant ||
      (variants.length ? variants[0] : null);

    const variantKey = selectedVariant
      ? variantId(selectedVariant)
      : null;

    const availableStock = selectedVariant
      ? variantStock(selectedVariant, product)
      : productStock(product);

    const existing = state.cart.find(item =>
      String(item.productId) === String(id) &&
      String(item.variantId || "") === String(variantKey || "")
    );

    const newQuantity =
      Number(existing?.quantity || 0) +
      Number(quantity || 1);

    if (
      Number.isFinite(availableStock) &&
      availableStock > 0 &&
      newQuantity > availableStock
    ) {
      toast("الكمية المطلوبة أكبر من المخزون");
      return;
    }

    if (existing) {
      existing.quantity = newQuantity;
    } else {
      state.cart.push({
        productId: id,
        variantId: variantKey,
        quantity: Number(quantity || 1),
        giftPackaging: false
      });
    }

    saveState();
    renderCart();

    toast("تمت إضافة المنتج إلى السلة");
  }
  function removeFromCart(productIdValue, variantIdValue = null) {
    state.cart = state.cart.filter(item =>
      !(
        String(item.productId) === String(productIdValue) &&
        String(item.variantId || "") === String(variantIdValue || "")
      )
    );

    saveState();
    renderCart();
    toast("تم حذف المنتج من السلة");
  }

  function changeCartQuantity(
    productIdValue,
    variantIdValue,
    change
  ) {
    const item = state.cart.find(item =>
      String(item.productId) === String(productIdValue) &&
      String(item.variantId || "") === String(variantIdValue || "")
    );

    if (!item) return;

    const product = cartItemProduct(item);

    if (!product) return;

    const variants = productVariants(product);
    const variant = variants.find(
      v => String(variantId(v)) === String(item.variantId || "")
    );

    const stock = variant
      ? variantStock(variant, product)
      : productStock(product);

    const nextQuantity =
      Number(item.quantity || 1) + Number(change || 0);

    if (nextQuantity <= 0) {
      removeFromCart(productIdValue, variantIdValue);
      return;
    }

    if (stock > 0 && nextQuantity > stock) {
      toast("وصلتِ للكمية المتوفرة بالمخزون");
      return;
    }

    item.quantity = nextQuantity;

    saveState();
    renderCart();
  }

  function renderCart() {
    const container = $("#cartItems");
    const subtotalNode = $("#cartSubtotal");
    const shippingNode = $("#cartShipping");
    const totalNode = $("#cartTotal");
    const countNodes = $$(".cart-count");

    const count = state.cart.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    countNodes.forEach(node => {
      node.textContent = count;
      node.classList.toggle("hidden", count === 0);
    });

    if (!container) return;

    if (!state.cart.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛍️</div>
          <h3>السلة فارغة</h3>
          <p>أضيفي منتجاتك المفضلة إلى السلة.</p>

          <button
            type="button"
            class="btn btn-primary"
            data-action="go-products"
          >
            تصفح المنتجات
          </button>
        </div>
      `;

      if (subtotalNode) subtotalNode.textContent = money(0);
      if (shippingNode) shippingNode.textContent = money(0);
      if (totalNode) totalNode.textContent = money(0);

      return;
    }

    container.innerHTML = state.cart
      .map(item => {
        const product = cartItemProduct(item);

        if (!product) return "";

        const variants = productVariants(product);
        const variant = variants.find(
          v => String(variantId(v)) === String(item.variantId || "")
        );

        const price = variant
          ? variantPrice(variant, product)
          : productPrice(product);

        const image = productImage(product);
        const name = productName(product);
        const quantity = Number(item.quantity || 1);

        return `
          <article class="cart-item">

            <div class="cart-item-image">
              ${
                image
                  ? `<img
                      src="${escapeHTML(image)}"
                      alt="${escapeHTML(name)}"
                      loading="lazy"
                    >`
                  : `<div class="product-image-placeholder">
                      Ladies First
                    </div>`
              }
            </div>

            <div class="cart-item-info">

              <h3>
                ${escapeHTML(name)}
              </h3>

              ${
                variant
                  ? `<div class="cart-item-variant">
                      ${escapeHTML(variantName(variant))}
                    </div>`
                  : ""
              }

              <strong>
                ${money(price)}
              </strong>

              <div class="cart-item-controls">

                <button
                  type="button"
                  data-action="cart-minus"
                  data-product-id="${escapeHTML(item.productId)}"
                  data-variant-id="${escapeHTML(item.variantId || "")}"
                >
                  −
                </button>

                <span>${quantity}</span>

                <button
                  type="button"
                  data-action="cart-plus"
                  data-product-id="${escapeHTML(item.productId)}"
                  data-variant-id="${escapeHTML(item.variantId || "")}"
                >
                  +
                </button>

              </div>

            </div>

            <button
              type="button"
              class="cart-item-remove"
              data-action="cart-remove"
              data-product-id="${escapeHTML(item.productId)}"
              data-variant-id="${escapeHTML(item.variantId || "")}"
              aria-label="حذف"
            >
              ×
            </button>

          </article>
        `;
      })
      .join("");

    const subtotal = cartSubtotal();
    const shipping = cartShipping(subtotal);
    const packaging = cartPackaging();
    const total = subtotal + shipping + packaging;

    if (subtotalNode) {
      subtotalNode.textContent = money(subtotal);
    }

    if (shippingNode) {
      shippingNode.textContent =
        shipping === 0 && subtotal > 0
          ? "مجاني"
          : money(shipping);
    }

    const packagingNode = $("#cartPackaging");

    if (packagingNode) {
      packagingNode.textContent = money(packaging);
    }

    if (totalNode) {
      totalNode.textContent = money(total);
    }
  }

  /* =========================================================
     FAVORITES
     ========================================================= */

  function renderFavorites() {
    const container = $("#favoritesGrid");

    if (!container) return;

    const products = state.favorites
      .map(id => findProduct(id))
      .filter(Boolean);

    if (!products.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">♡</div>
          <h3>المفضلة فارغة</h3>
          <p>
            اضغطي على علامة القلب بجانب أي منتج لإضافته هنا.
          </p>

          <button
            type="button"
            class="btn btn-primary"
            data-action="go-products"
          >
            تصفح المنتجات
          </button>
        </div>
      `;

      return;
    }

    container.innerHTML = products
      .map(productCard)
      .join("");
  }

  /* =========================================================
     CATEGORIES / BRANDS
     ========================================================= */

  function renderCategories() {
    const containers = [
      $("#homeCategories"),
      $("#categoriesGrid")
    ].filter(Boolean);

    containers.forEach(container => {
      if (!state.categories.length) {
        container.innerHTML = "";
        return;
      }

      container.innerHTML = state.categories
        .map(category => {
          const id =
            category.id ??
            category._id ??
            category.category_id;

          const name =
            category.name ??
            category.title ??
            "تصنيف";

          const image =
  category.imageUrl ??
  category.image_url ??
  category.image ??
  "";

          return `
            <button
              type="button"
              class="category-card"
              data-action="category"
              data-category-id="${escapeHTML(id)}"
            >
              ${
                image
                  ? `<img
                      src="${escapeHTML(image)}"
                      alt="${escapeHTML(name)}"
                      loading="lazy"
                    >`
                  : `<div class="category-placeholder">
                      ✦
                    </div>`
              }

              <span>
                ${escapeHTML(name)}
              </span>
            </button>
          `;
        })
        .join("");
    });
  }

  function renderBrands() {
    const containers = [
      $("#homeBrands"),
      $("#brandsGrid")
    ].filter(Boolean);

    containers.forEach(container => {
      if (!state.brands.length) {
        container.innerHTML = "";
        return;
      }

      container.innerHTML = state.brands
        .map(brand => {
          const id =
            brand.id ??
            brand._id ??
            brand.brand_id;

          const name =
            brand.name ??
            brand.title ??
            "علامة تجارية";

          const logo =
  brand.logoUrl ??
  brand.logo_url ??
  brand.logo ??
  brand.imageUrl ??
  brand.image_url ??
  brand.image ??
  "";

          return `
            <button
              type="button"
              class="brand-card"
              data-action="brand"
              data-brand-id="${escapeHTML(id)}"
            >
              ${
                logo
                  ? `<img
                      src="${escapeHTML(logo)}"
                      alt="${escapeHTML(name)}"
                      loading="lazy"
                    >`
                  : `<div class="brand-placeholder">
                      LF
                    </div>`
              }

              <span>
                ${escapeHTML(name)}
              </span>
            </button>
          `;
        })
        .join("");
    });
  }

  /* =========================================================
     HOME / HERO
     ========================================================= */

  function renderHero() {
    const container = $("#heroSlider");

    if (!container) return;

    const slides = state.heroSlides;

    if (!slides.length) {
      container.innerHTML = `
        <div class="hero-fallback">
          <div>
            <span> LADIES FIRST </span>
            <h1>كل ما تحتاجينه... بمكان واحد</h1>
            <p>
              اكتشفي تشكيلتنا واختاري المفضل لديك.
            </p>

            <button
              type="button"
              class="btn btn-primary"
              data-action="go-products"
            >
              تسوقي الآن
            </button>
          </div>
        </div>
      `;

      return;
    }

    const slide =
      slides[state.heroIndex % slides.length];

    const image =
      slide.image_url ??
      slide.image ??
      slide.background ??
      "";

    const title =
      slide.title ??
      slide.name ??
      "";

    const subtitle =
      slide.subtitle ??
      slide.description ??
      "";

    const buttonText =
      slide.button_text ??
      slide.buttonText ??
      "تسوقي الآن";

    container.innerHTML = `
      <div
        class="hero-slide"
        style="${
          image
            ? `background-image:url("${escapeHTML(image)}");`
            : ""
        }"
      >
        <div class="hero-slide-content">

          ${
            title
              ? `<h1>${escapeHTML(title)}</h1>`
              : ""
          }

          ${
            subtitle
              ? `<p>${escapeHTML(subtitle)}</p>`
              : ""
          }

          <button
            type="button"
            class="btn btn-primary"
            data-action="go-products"
          >
            ${escapeHTML(buttonText)}
          </button>

        </div>
      </div>

      ${
        slides.length > 1
          ? `
            <div class="hero-dots">
              ${slides.map((_, index) => `
                <button
                  type="button"
                  class="hero-dot ${
                    index === state.heroIndex
                      ? "active"
                      : ""
                  }"
                  data-action="hero-dot"
                  data-hero-index="${index}"
                  aria-label="الشريحة ${index + 1}"
                ></button>
              `).join("")}
            </div>
          `
          : ""
      }
    `;
  }

  function startHeroTimer() {
    clearInterval(state.heroTimer);

    if (state.heroSlides.length <= 1) {
      return;
    }

    state.heroTimer = setInterval(() => {
      state.heroIndex =
        (state.heroIndex + 1) %
        state.heroSlides.length;

      renderHero();
    }, 6000);
  }

  function setHeroIndex(index) {
    if (!state.heroSlides.length) return;

    state.heroIndex =
      (Number(index) + state.heroSlides.length) %
      state.heroSlides.length;

    renderHero();
    startHeroTimer();
  }

  /* =========================================================
     SETTINGS / SOCIAL
     ========================================================= */

  function renderSocialLinks() {
    const container = $("#socialLinks");

    if (!container) return;

    const links = [
      {
        key: "instagram",
        label: "Instagram"
      },
      {
        key: "facebook",
        label: "Facebook"
      },
      {
        key: "tiktok",
        label: "TikTok"
      },
      {
        key: "whatsapp",
        label: "WhatsApp"
      }
    ];

    container.innerHTML = links
      .map(item => {
        const url =
          state.settings?.[item.key] ??
          state.settings?.social?.[item.key] ??
          "";

        if (!url) return "";

        return `
          <a
            href="${escapeHTML(url)}"
            target="_blank"
            rel="noopener noreferrer"
            class="social-link"
          >
            ${escapeHTML(item.label)}
          </a>
        `;
      })
      .join("");
}
  /* =========================================================
     DATA LOADING
     ========================================================= */

  async function loadHomeData() {
    const result = await api("/store/home");

    if (!result) {
      return;
    }

    state.products =
      result.products ??
      result.data?.products ??
      [];

    state.categories =
      result.categories ??
      result.data?.categories ??
      [];

    state.brands =
      result.brands ??
      result.data?.brands ??
      [];

    state.offers =
      result.offers ??
      result.data?.offers ??
      [];

    state.topFive =
      result.topFive ??
      result.top_five ??
      result.data?.topFive ??
      result.data?.top_five ??
      [];

    state.bestSellers =
      result.bestSellers ??
      result.best_sellers ??
      result.data?.bestSellers ??
      result.data?.best_sellers ??
      [];

    state.heroSlides =
      result.heroSlides ??
      result.hero_slides ??
      result.slides ??
      result.data?.heroSlides ??
      result.data?.hero_slides ??
      result.data?.slides ??
      [];

    renderHero();
    renderProducts();
    renderCategories();
    renderBrands();
    renderFavorites();
    renderCart();

    startHeroTimer();
  }

  async function loadSettings() {
    const result = await api("/settings");

    if (!result) return;

    state.settings =
      result.settings ??
      result.data ??
      result;

    renderSocialLinks();
  }

  async function refreshProducts() {
    const result = await api("/products");

    if (!result) return;

    state.products =
      result.products ??
      result.data ??
      (Array.isArray(result) ? result : []);

    renderProducts();
    renderFavorites();
  }

  async function refreshCategories() {
    const result = await api("/categories");

    if (!result) return;

    state.categories =
      result.categories ??
      result.data ??
      (Array.isArray(result) ? result : []);

    renderCategories();
  }

  async function refreshBrands() {
    const result = await api("/brands");

    if (!result) return;

    state.brands =
      result.brands ??
      result.data ??
      (Array.isArray(result) ? result : []);

    renderBrands();
  }

  /* =========================================================
     ORDERS
     ========================================================= */

  function orderStatusText(status) {
    const values = {
      pending: "قيد المراجعة",
      confirmed: "تم التأكيد",
      preparing: "جاري التجهيز",
      shipped: "تم الشحن",
      delivered: "تم التوصيل",
      cancelled: "ملغي",
      canceled: "ملغي"
    };

    return values[String(status || "").toLowerCase()]
      || status
      || "غير محدد";
  }

  async function loadOrders() {
    if (!state.user) {
      renderOrders();
      return;
    }

    const result = await api("/orders");

    if (!result) return;

    state.orders =
      result.orders ??
      result.data ??
      (Array.isArray(result) ? result : []);

    renderOrders();
  }

  function renderOrders() {
    const container = $("#ordersList");

    if (!container) return;

    if (!state.user) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>سجلي الدخول أولاً</h3>
          <p>
            حتى تتمكني من مشاهدة طلباتك.
          </p>

          <button
            type="button"
            class="btn btn-primary"
            data-action="go-account"
          >
            تسجيل الدخول
          </button>
        </div>
      `;

      return;
    }

    const orders = state.orders || [];

    if (!orders.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <h3>لا توجد طلبات بعد</h3>
          <p>
            عندما تطلبين منتجاتك ستظهر طلباتك هنا.
          </p>

          <button
            type="button"
            class="btn btn-primary"
            data-action="go-products"
          >
            ابدئي التسوق
          </button>
        </div>
      `;

      return;
    }

    container.innerHTML = orders
      .map(order => {
        const id =
          order.id ??
          order._id ??
          order.order_id ??
          "";

        const status =
          order.status ??
          "pending";

        const total = Number(
          order.total ??
          order.total_amount ??
          order.amount ??
          0
        );

        const created =
          order.created_at ??
          order.createdAt ??
          "";

        const items =
          order.items ??
          [];

        return `
          <article class="order-card">

            <div class="order-card-header">

              <div>
                <strong>
                  طلب #${escapeHTML(id)}
                </strong>

                ${
                  created
                    ? `<small>
                        ${escapeHTML(
                          new Date(created).toLocaleDateString(
                            "ar"
                          )
                        )}
                      </small>`
                    : ""
                }
              </div>

              <span class="order-status">
                ${escapeHTML(orderStatusText(status))}
              </span>

            </div>

            <div class="order-items">

              ${
                items.length
                  ? items.map(item => {
                      const product =
                        findProduct(
                          item.productId ??
                          item.product_id
                        );

                      const name =
                        item.productName ??
                        item.product_name ??
                        productName(product);

                      const quantity =
                        item.quantity ?? 1;

                      return `
                        <div class="order-item">
                          <span>
                            ${escapeHTML(name)}
                          </span>

                          <span>
                            × ${escapeHTML(quantity)}
                          </span>
                        </div>
                      `;
                    }).join("")
                  : `
                    <div class="order-item">
                      تفاصيل الطلب متاحة من الحساب
                    </div>
                  `
              }

            </div>

            <div class="order-card-footer">
              <strong>
                ${money(total)}
              </strong>
            </div>

          </article>
        `;
      })
      .join("");
  }

  /* =========================================================
     CHECKOUT
     ========================================================= */

  function checkoutItemsPayload() {
    return state.cart
      .map(item => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: Number(item.quantity || 1)
      }));
  }

  function renderCheckout() {
    const totalNode = $("#checkoutTotal");

    if (totalNode) {
      totalNode.textContent = money(cartTotal());
    }

    const name =
      $("#checkoutName");

    const email =
      $("#checkoutEmail");

    const phone =
      $("#checkoutPhone");

    if (state.user) {
      if (name && !name.value) {
        name.value = state.user.name || "";
      }

      if (email && !email.value) {
        email.value = state.user.email || "";
      }

      if (phone && !phone.value) {
        phone.value = state.user.phone || "";
      }
    }

    if (!state.cart.length) {
      const form = $("#checkoutForm");

      if (form) {
        form.classList.add("checkout-empty");
      }
    }
  }

  async function submitCheckout(event) {
    event?.preventDefault();

    if (state.orderSubmitting) return;

    if (!state.cart.length) {
      toast("السلة فارغة");
      navigate("cart");
      return;
    }

    const name =
      $("#checkoutName")?.value.trim() || "";

    const email =
      $("#checkoutEmail")?.value.trim() || "";

    const phone =
      $("#checkoutPhone")?.value.trim() || "";

    const city =
      $("#checkoutCity")?.value.trim() || "";

    const address =
      $("#checkoutAddress")?.value.trim() || "";

    const payment =
      $('input[name="paymentMethod"]:checked')?.value
      || "cash";

    const giftPackaging =
      $("#giftPackaging")?.checked || false;

    if (!name || !phone || !address) {
      toast("أكملي الاسم والهاتف والعنوان");
      return;
    }

    const subtotal = cartSubtotal();
    const shipping = cartShipping(subtotal);
    const packaging = giftPackaging ? 10 : 0;

    const payload = {
      customerName: name,
      customerPhone: phone,
      address: [city, address]
        .filter(Boolean)
        .join(" - "),
      email: email || null,
      paymentMethod: payment,
      giftPackaging,
      shipping,
      packaging,
      items: checkoutItemsPayload()
    };

    state.orderSubmitting = true;

    const button =
      $("#checkoutSubmit");

    if (button) {
      button.disabled = true;
      button.dataset.originalText =
        button.textContent;
      button.textContent = "جاري إرسال الطلب...";
    }

    const result = await api("/orders", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    state.orderSubmitting = false;

    if (button) {
      button.disabled = false;
      button.textContent =
        button.dataset.originalText ||
        "تأكيد الطلب";
    }

    if (!result) {
      toast("تعذر إرسال الطلب حالياً");
      return;
    }

    state.cart = [];
    saveState();
    renderCart();

    toast("تم إرسال طلبك بنجاح ❤️");

    await loadOrders();

    navigate("orders");
  }

  /* =========================================================
     SEARCH
     ========================================================= */

  function performSearch(value) {
    const query = String(value || "").trim();

    state.currentFilter = {
      ...state.currentFilter,
      search: query
    };

    navigate("products");

    renderProducts();
  }

  /* =========================================================
     NAYA ASSISTANT
     ========================================================= */

  function openNaya() {
  const assistant =
    $("#nayaAssistant");

  if (!assistant) return;

  assistant.classList.remove("hidden");
  assistant.classList.add("active");
  document.body.classList.add("naya-open");

  $("#nayaInput")?.focus();
}

  function closeNaya() {
  const assistant =
    $("#nayaAssistant");

  if (!assistant) return;

  assistant.classList.remove("active");
  assistant.classList.add("hidden");
  document.body.classList.remove("naya-open");
}

  function nayaMessage(text, type = "bot") {
    const conversation =
      $("#nayaConversation");

    if (!conversation) return;

    const message =
      document.createElement("div");

    message.className =
      `naya-message ${type}`;

    message.textContent = text;

    conversation.appendChild(message);

    conversation.scrollTop =
      conversation.scrollHeight;
  }

  function nayaReply(input) {
    const text =
      String(input || "")
        .trim()
        .toLowerCase();

    if (!text) {
      return "احكيلي شو بدك وأنا بساعدك ❤️";
    }

    if (
      text.includes("مرحبا") ||
      text.includes("اهلا") ||
      text.includes("أهلا") ||
      text.includes("هاي")
    ) {
      return "أهلاً وسهلاً فيكِ ❤️ شو حابة تشتري اليوم؟";
    }

    if (
      text.includes("عرض") ||
      text.includes("خصم") ||
      text.includes("تخفيض")
    ) {
      if (state.offers.length) {
        return `عنا حالياً ${state.offers.length} منتج ضمن العروض. افتحي قسم العروض وشوفيهم ❤️`;
      }

      return "حالياً ما عندي عروض ظاهرة، بس بقدر أساعدك تختاري من المنتجات الموجودة.";
    }

    if (
      text.includes("سلة") ||
      text.includes("طلب")
    ) {
      if (state.cart.length) {
        return `عندك ${state.cart.reduce(
          (sum, item) =>
            sum + Number(item.quantity || 0),
          0
        )} قطعة بالسلة، والمجموع ${money(cartTotal())}.`;
      }

      return "السلة فاضية حالياً. إذا بدك بساعدك تلاقي منتج مناسب.";
    }

    if (
      text.includes("مفضل") ||
      text.includes("مفضلة")
    ) {
      return state.favorites.length
        ? `عندك ${state.favorites.length} منتج بالمفضلة ❤️`
        : "لسه ما أضفتي منتجات للمفضلة.";
    }

    if (
      text.includes("منتج") ||
      text.includes("شو عندكم") ||
      text.includes("بدي")
    ) {
      return `عنا حالياً ${state.products.length} منتج متاح. اضغطي «المنتجات» وشوفي التشكيلة.`;
    }

    if (
      text.includes("سعر") ||
      text.includes("كم")
    ) {
      return "ابعتيلي اسم المنتج أو افتحي المنتج نفسه، وبقدر أساعدك بالسعر والخيار المتوفر.";
    }

    return "أكيد بساعدك ❤️ احكيلي مثلاً: بدي عروض، بدي أشوف المنتجات، أو شو موجود بالسلة؟";
  }

  function sendNayaMessage() {
    const input =
      $("#nayaInput");

    if (!input) return;

    const value =
      input.value.trim();

    if (!value) return;

    nayaMessage(value, "user");

    input.value = "";

    const loading =
      $("#nayaLoading");

    if (loading) {
      loading.classList.remove("hidden");
    }

    setTimeout(() => {
      if (loading) {
        loading.classList.add("hidden");
      }

      nayaMessage(
        nayaReply(value),
        "bot"
      );
    }, 350);
  }
  /* =========================================================
     EVENT HANDLERS
     ========================================================= */

  function handleAction(action, element) {
    const productIdValue =
      element.dataset.productId;

    switch (action) {

      case "favorite":
        toggleFavorite(productIdValue);
        break;

      case "product": {
        const product =
          findProduct(productIdValue);

        if (!product) {
          toast("المنتج غير موجود");
          return;
        }

        state.currentProduct = product;
        navigate("product");
        break;
      }

      case "add-cart": {
        const product =
          findProduct(productIdValue);

        if (!product) {
          toast("المنتج غير موجود");
          return;
        }

        addToCart(product, 1);
        break;
      }

      case "add-detail-cart": {
        const product =
          findProduct(productIdValue) ||
          state.currentProduct;

        if (!product) {
          toast("المنتج غير موجود");
          return;
        }

        const quantity =
          Math.max(
            1,
            Number(
              $("#productQuantity")?.value || 1
            )
          );

        let variant = null;

        const variantSelect =
          $("#productVariant");

        if (variantSelect) {
          const selectedId =
            variantSelect.value;

          variant =
            productVariants(product).find(
              item =>
                String(variantId(item)) ===
                String(selectedId)
            ) || null;
        }

        addToCart(
          product,
          quantity,
          variant
        );

        break;
      }

      case "quantity-minus": {
        const input =
          $("#productQuantity");

        if (!input) return;

        const value =
          Math.max(
            1,
            Number(input.value || 1) - 1
          );

        input.value = value;
        break;
      }

      case "quantity-plus": {
        const input =
          $("#productQuantity");

        if (!input) return;

        const product =
          state.currentProduct;

        const variants =
          productVariants(product);

        let stock =
          productStock(product);

        const variantSelect =
          $("#productVariant");

        if (
          variantSelect &&
          variants.length
        ) {
          const variant =
            variants.find(
              item =>
                String(variantId(item)) ===
                String(variantSelect.value)
            );

          if (variant) {
            stock =
              variantStock(
                variant,
                product
              );
          }
        }

        const current =
          Number(input.value || 1);

        input.value =
          stock > 0
            ? Math.min(current + 1, stock)
            : current + 1;

        break;
      }

      case "cart-minus":
        changeCartQuantity(
          productIdValue,
          element.dataset.variantId || null,
          -1
        );
        break;

      case "cart-plus":
        changeCartQuantity(
          productIdValue,
          element.dataset.variantId || null,
          1
        );
        break;

      case "cart-remove":
        removeFromCart(
          productIdValue,
          element.dataset.variantId || null
        );
        break;

      case "go-products":
        state.currentFilter = {};
        navigate("products");
        break;

      case "back-products":
        navigate("products");
        break;

      case "go-account":
        navigate("account");
        break;

      case "category":
        state.currentFilter = {
          category:
            element.dataset.categoryId
        };

        navigate(
          "products",
          state.currentFilter
        );

        renderProducts();
        break;

      case "brand":
        state.currentFilter = {
          brand:
            element.dataset.brandId
        };

        navigate(
          "products",
          state.currentFilter
        );

        renderProducts();
        break;

      case "hero-dot":
        setHeroIndex(
          Number(
            element.dataset.heroIndex || 0
          )
        );
        break;

      case "open-cart":
        navigate("cart");
        break;

      case "open-checkout":
        if (!state.cart.length) {
          toast("السلة فارغة");
          navigate("cart");
          return;
        }

        navigate("checkout");
        renderCheckout();
        break;

      case "open-orders":
        navigate("orders");
        loadOrders();
        break;

      case "open-account":
        navigate("account");
        break;

      case "open-naya":
        openNaya();
        break;

      case "close-naya":
        closeNaya();
        break;

      default:
        break;
    }
  }

  function bindEvents() {

    document.addEventListener(
      "click",
      event => {

        const actionElement =
          event.target.closest(
            "[data-action]"
          );

        if (!actionElement) return;

        event.preventDefault();

        handleAction(
          actionElement.dataset.action,
          actionElement
        );
      }
    );

    /* -------------------------
       NAVIGATION LINKS
       ------------------------- */

    document.addEventListener(
      "click",
      event => {

        const link =
          event.target.closest(
            "[data-page]"
          );

        if (!link) return;

        event.preventDefault();

        const page =
          link.dataset.page;

        navigate(page);

        if (page === "orders") {
          loadOrders();
        }
      }
    );

    /* -------------------------
       MOBILE MENU
       ------------------------- */

    $("#mobileMenuButton")
      ?.addEventListener(
        "click",
        () => {

          const menu =
            $("#mobileMenu");

          if (!menu) return;

          if (
            menu.classList.contains("hidden")
          ) {
            openMobileMenu();
          } else {
            closeMobileMenu();
          }
        }
      );

    $("#pageOverlay")
      ?.addEventListener(
        "click",
        closeMobileMenu
      );
/* -------------------------
   HEADER BUTTONS
   ------------------------- */

$("#searchButton")
  ?.addEventListener(
    "click",
    event => {
      event.preventDefault();

      const panel = $("#searchPanel");

      if (!panel) return;

      panel.classList.toggle("hidden");

      if (!panel.classList.contains("hidden")) {
        $("#globalSearch")?.focus();
      }
    }
  );

$("#searchSubmit")
  ?.addEventListener(
    "click",
    event => {
      event.preventDefault();

      performSearch(
        $("#globalSearch")?.value || ""
      );
    }
  );

$("#favoritesButton")
  ?.addEventListener(
    "click",
    event => {
      event.preventDefault();
      navigate("favorites");
    }
  );

$("#cartButton")
  ?.addEventListener(
    "click",
    event => {
      event.preventDefault();
      navigate("cart");
    }
  );

$("#accountButton")
  ?.addEventListener(
    "click",
    event => {
      event.preventDefault();
      navigate("account");
    }
  );

$("#closeMobileMenu")
  ?.addEventListener(
    "click",
    event => {
      event.preventDefault();
      closeMobileMenu();
    }
  );

/* -------------------------
   HERO CONTROLS
   ------------------------- */

$("#heroPrev")
  ?.addEventListener(
    "click",
    event => {
      event.preventDefault();

      if (!state.heroSlides.length) return;

      setHeroIndex(
        state.heroIndex - 1
      );
    }
  );

$("#heroNext")
  ?.addEventListener(
    "click",
    event => {
      event.preventDefault();

      if (!state.heroSlides.length) return;

      setHeroIndex(
        state.heroIndex + 1
      );
    }
  );
    /* -------------------------
       SEARCH
       ------------------------- */

    const search =
      $("#globalSearch");

    if (search) {

      search.addEventListener(
        "keydown",
        event => {

          if (event.key !== "Enter") {
            return;
          }

          event.preventDefault();

          performSearch(
            search.value
          );
        }
      );

    }

    /* -------------------------
       AUTH
       ------------------------- */

    $("#loginForm")
      ?.addEventListener(
        "submit",
        event => {
          event.preventDefault();
          loginUser();
        }
      );

    $("#registerForm")
      ?.addEventListener(
        "submit",
        event => {
          event.preventDefault();
          registerUser();
        }
      );

    $$("[data-auth-tab]")
      .forEach(button => {

        button.addEventListener(
          "click",
          event => {

            event.preventDefault();

            switchAuthTab(
              button.dataset.authTab
            );
          }
        );

      });

    /* -------------------------
       PROFILE
       ------------------------- */

    $("#profileForm")
      ?.addEventListener(
        "submit",
        event => {
          event.preventDefault();
          saveProfile();
        }
      );

    $("#logoutButton")
      ?.addEventListener(
        "click",
        event => {
          event.preventDefault();
          logoutUser();
        }
      );

    /* -------------------------
       CHECKOUT
       ------------------------- */

    $("#checkoutForm")
      ?.addEventListener(
        "submit",
        submitCheckout
      );

    /* -------------------------
       NAYA
       ------------------------- */

    $("#nayaLauncher")
      ?.addEventListener(
        "click",
        event => {
          event.preventDefault();
          openNaya();
        }
      );
$("#nayaClose")
  ?.addEventListener(
    "click",
    event => {
      event.preventDefault();
      closeNaya();
    }
  );
    $("#nayaSend")
      ?.addEventListener(
        "click",
        event => {
          event.preventDefault();
          sendNayaMessage();
        }
      );

    $("#nayaInput")
      ?.addEventListener(
        "keydown",
        event => {

          if (event.key !== "Enter") {
            return;
          }

          event.preventDefault();
          sendNayaMessage();
        }
      );

    /* -------------------------
       PRODUCT VARIANT
       ------------------------- */

    document.addEventListener(
      "change",
      event => {

        if (
          event.target.id !==
          "productVariant"
        ) {
          return;
        }

        const selected =
          event.target.options[
            event.target.selectedIndex
          ];

        const stock =
          Number(
            selected?.dataset.stock || 0
          );

        const input =
          $("#productQuantity");

        if (input) {
          input.max =
            String(
              Math.max(stock, 1)
            );

          const current =
            Number(input.value || 1);

          if (
            stock > 0 &&
            current > stock
          ) {
            input.value = stock;
          }
        }

        const price =
          Number(
            selected?.dataset.price || 0
          );

        const priceNode =
          $(".product-details-price");

        if (
          priceNode &&
          price > 0
        ) {
          priceNode.textContent =
            money(price);
        }
      }
    );

  }

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  async function initializeApp() {

    bindEvents();

    showPage("home");

    renderCart();
    renderFavorites();
    renderAccount();

    await Promise.all([
  loadHomeData(),
  refreshCategories(),
  refreshBrands(),
  loadSettings(),
  loadCurrentUser()
]);
  /*
   * Fallback:
   * إذا الصفحة الرئيسية لم ترجع المنتجات،
   * نحاول تحميل المنتجات مباشرة.
   */
  if (!state.products.length) {
    await refreshProducts();
  }
    renderHero();
    renderProducts();
    renderCategories();
    renderBrands();
    renderFavorites();
    renderCart();

    startHeroTimer();

    /*
     * Welcome message for Naya.
     * Only added once so reopening the assistant
     * does not duplicate it.
     */
    const conversation =
      $("#nayaConversation");

    if (
      conversation &&
      !conversation.children.length
    ) {
      nayaMessage(
        "أهلاً فيكِ ❤️ أنا نايا، كيف بقدر أساعدك اليوم؟",
        "bot"
      );
    }
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
       
      "DOMContentLoaded",
      initializeApp
    );
  } else {
    initializeApp();
  }

})();
