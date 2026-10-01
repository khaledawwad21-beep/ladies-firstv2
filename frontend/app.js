/* =========================================================
   LADIES FIRST - FRONTEND APP
   Complete frontend application
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
    favorites: JSON.parse(localStorage.getItem("lf_favorites") || "[]"),
    cart: JSON.parse(localStorage.getItem("lf_cart") || "[]"),
    user: JSON.parse(localStorage.getItem("lf_user") || "null"),
    settings: {},
    currentProduct: null,
    currentFilter: {},
    heroIndex: 0,
    heroTimer: null,
    orderSubmitting: false
  };

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const escapeHTML = (value = "") =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const money = (value) =>
    `${Number(value || 0).toFixed(2)} ₪`;

  function saveState() {
    localStorage.setItem(
      "lf_favorites",
      JSON.stringify(state.favorites)
    );
    localStorage.setItem(
      "lf_cart",
      JSON.stringify(state.cart)
    );

    if (state.user) {
      localStorage.setItem(
        "lf_user",
        JSON.stringify(state.user)
      );
    } else {
      localStorage.removeItem("lf_user");
    }
  }

  /* =========================================================
     API
     ========================================================= */

  async function api(path, options = {}) {
    try {
      const token = localStorage.getItem("lf_token");

      const response = await fetch(
        `${API_BASE}${path}`,
        {
          credentials: "include",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
            ...(options.headers || {})
          }
        }
      );

      const raw = await response.text();
      let data = null;

      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = raw;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          `HTTP ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.warn("API:", path, error);
      return null;
    }
  }

  /* =========================================================
     TOAST
     ========================================================= */

  function showToast(message) {
    let toast = $("#lfToast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "lfToast";
      toast.className = "lf-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  /* =========================================================
     AUTH / USER
     ========================================================= */

  function setToken(token) {
    if (token) {
      localStorage.setItem("lf_token", token);
    } else {
      localStorage.removeItem("lf_token");
    }
  }

  function getGenderGreeting(gender) {
    const value =
      String(gender || "")
        .trim()
        .toLowerCase();

    if (
      value === "male" ||
      value === "ذكر" ||
      value === "m"
    ) {
      return "نورتنا";
    }

    if (
      value === "female" ||
      value === "أنثى" ||
      value === "انثى" ||
      value === "f"
    ) {
      return "نورتينا";
    }

    return "أهلاً وسهلاً";
  }

  function updateGreeting() {
    const greeting = $("#accountGreeting");

    if (!greeting) return;

    if (!state.user) {
      greeting.textContent = "حسابي";
      return;
    }

    const text = getGenderGreeting(
      state.user.gender
    );

    greeting.textContent =
      text === "أهلاً وسهلاً"
        ? state.user.name || text
        : text;
  }

  async function loadCurrentUser() {
    const result = await api("/auth/me");

    if (result?.user) {
      state.user = result.user;
      saveState();
    }

    updateGreeting();
  }

  function fillAccountProfile() {
    const user = state.user || {};

    const fields = {
      "#profileName": user.name || "",
      "#profileEmail": user.email || "",
      "#profilePhone":
        user.phone ||
        user.whatsapp ||
        "",
      "#profileGender":
        user.gender || "",
      "#profileAge":
        user.age ?? ""
    };

    Object.entries(fields).forEach(
      ([selector, value]) => {
        const el = $(selector);
        if (el) el.value = value;
      }
    );

    const points = $("#loyaltyPoints");

    if (points) {
      points.textContent =
        Number(
          user.loyaltyPoints ??
          user.points ??
          0
        ).toLocaleString("ar");
    }
  }

  function renderAccount() {
    const auth = $("#accountAuth");
    const profile = $("#accountProfile");

    if (!state.user) {
      auth?.classList.remove("hidden");
      profile?.classList.add("hidden");
      updateGreeting();
      return;
    }

    auth?.classList.add("hidden");
    profile?.classList.remove("hidden");

    fillAccountProfile();
    updateGreeting();
  }

  async function loginUser() {
    const contact =
      $("#loginContact")?.value.trim();

    const password =
      $("#loginPassword")?.value || "";

    if (!contact || !password) {
      showToast(
        "اكتبي رقم الهاتف أو البريد وكلمة المرور"
      );
      return;
    }

    const result = await api(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          contact,
          password
        })
      }
    );

    if (!result) {
      showToast("تعذر تسجيل الدخول حالياً");
      return;
    }

    if (result.token) {
      setToken(result.token);
    }

    if (result.user) {
      state.user = result.user;
      saveState();
      renderAccount();
      updateGreeting();

      showToast(
        getGenderGreeting(result.user.gender) ===
          "نورتنا"
          ? "نورتنا، تم تسجيل الدخول بنجاح"
          : getGenderGreeting(result.user.gender) ===
            "نورتينا"
            ? "نورتينا، تم تسجيل الدخول بنجاح"
            : "تم تسجيل الدخول بنجاح"
      );
      return;
    }

    showToast(
      result.message ||
      "تعذر تسجيل الدخول"
    );
  }

  async function registerUser() {
    const name =
      $("#registerName")?.value.trim();

    const email =
      $("#registerEmail")?.value.trim();

    const phone =
      $("#registerPhone")?.value.trim();

    const gender =
      $("#registerGender")?.value || "";

    const ageValue =
      $("#registerAge")?.value;

    const password =
      $("#registerPassword")?.value || "";

    if (
      !name ||
      !password ||
      (!email && !phone)
    ) {
      showToast(
        "الاسم ووسيلة التواصل وكلمة المرور مطلوبة"
      );
      return;
    }

    const age =
      ageValue === "" ||
      ageValue == null
        ? null
        : Number(ageValue);

    const result = await api(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          name,
          email: email || null,
          phone: phone || null,
          gender: gender || null,
          age,
          password
        })
      }
    );

    if (!result) {
      showToast(
        "تعذر إنشاء الحساب حالياً"
      );
      return;
    }

    if (result.token) {
      setToken(result.token);
    }

    if (result.user) {
      state.user = result.user;
      saveState();
      renderAccount();
      updateGreeting();

      showToast(
        "تم إنشاء الحساب بنجاح"
      );
      return;
    }

    showToast(
      result.message ||
      "تعذر إنشاء الحساب"
    );
  }

  async function saveProfile() {
    if (!state.user) {
      showToast("سجلي الدخول أولاً");
      return;
    }

    const name =
      $("#profileName")?.value.trim();

    const email =
      $("#profileEmail")?.value.trim();

    const phone =
      $("#profilePhone")?.value.trim();

    const gender =
      $("#profileGender")?.value || "";

    const ageValue =
      $("#profileAge")?.value;

    const age =
      ageValue === "" ||
      ageValue == null
        ? null
        : Number(ageValue);

    if (!name) {
      showToast("الاسم مطلوب");
      return;
    }

    if (!state.user.id) {
      showToast(
        "تعذر تحديد الحساب"
      );
      return;
    }

    const result = await api(
      `/users/${state.user.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          name,
          email: email || null,
          phone: phone || null,
          gender: gender || null,
          age
        })
      }
    );

    if (!result) {
      showToast(
        "تعذر حفظ البيانات حالياً"
      );
      return;
    }

    state.user =
      result.user ||
      {
        ...state.user,
        name,
        email,
        phone,
        gender,
        age
      };

    saveState();
    fillAccountProfile();
    updateGreeting();

    showToast(
      getGenderGreeting(gender) ===
        "نورتنا"
        ? "تم حفظ البيانات — نورتنا"
        : getGenderGreeting(gender) ===
          "نورتينا"
          ? "تم حفظ البيانات — نورتينا"
          : "تم حفظ بياناتك بنجاح"
    );
  }

  function logoutUser() {
    state.user = null;
    setToken(null);
    localStorage.removeItem("lf_user");

    renderAccount();
    updateGreeting();

    showToast(
      "تم تسجيل الخروج"
    );
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */

  const pageMap = {
    home: "homePage",
    products: "productsPage",
    categories: "categoriesPage",
    brands: "brandsPage",
    offers: "offersPage",
    bestsellers: "bestsellersPage",
    favorites: "favoritesPage",
    cart: "cartPage",
    checkout: "checkoutPage",
    account: "accountPage",
    product: "productPage"
  };

  function closeMobileMenu() {
    $("#mainNav")?.classList.remove("open");
    $("#mobileMenuButton")?.classList.remove("active");
    document.body.classList.remove(
      "menu-open"
    );
  }

  function showPage(page) {
    if (!pageMap[page]) {
      page = "home";
    }

    state.page = page;

    $$(".page-section").forEach(
      (section) => {
        section.classList.remove(
          "active"
        );
        section.hidden = true;
      }
    );

    const target =
      $(`#${pageMap[page]}`);

    if (target) {
      target.hidden = false;
      target.classList.add("active");
    }

    $$(".main-nav button[data-page]")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.page === page
        );
      });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    closeMobileMenu();
  }

  function navigate(page) {
    showPage(page);

    try {
      history.pushState(
        { page },
        "",
        `#${page}`
      );
    } catch {}
  }

  function handleHash() {
    const hash =
      window.location.hash
        .replace("#", "");

    showPage(
      hash && pageMap[hash]
        ? hash
        : "home"
    );
  }

  function toggleMobileMenu() {
    const nav = $("#mainNav");

    if (!nav) return;

    if (
      nav.classList.contains("open")
    ) {
      closeMobileMenu();
    } else {
      nav.classList.add("open");
      $("#mobileMenuButton")
        ?.classList.add("active");
      document.body.classList.add(
        "menu-open"
      );
    }
  }

  /* =========================================================
     COUNTERS / FAVORITES / CART
     ========================================================= */

  function updateCounters() {
    const cartCount = $("#cartCount");
    const favoritesCount =
      $("#favoritesCount");

    const cartTotal =
      state.cart.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 1),
        0
      );

    if (cartCount) {
      cartCount.textContent =
        cartTotal;
      cartCount.classList.toggle(
        "has-items",
        cartTotal > 0
      );
    }

    if (favoritesCount) {
      favoritesCount.textContent =
        state.favorites.length;
      favoritesCount.classList.toggle(
        "has-items",
        state.favorites.length > 0
      );
    }
  }

  function isFavorite(productId) {
    return state.favorites.some(
      (id) =>
        String(id) ===
        String(productId)
    );
  }

  function toggleFavorite(productId) {
    const id = String(productId);

    if (isFavorite(id)) {
      state.favorites =
        state.favorites.filter(
          (favoriteId) =>
            String(favoriteId) !== id
        );

      showToast(
        "تمت إزالة المنتج من المفضلة"
      );
    } else {
      state.favorites.push(id);

      showToast(
        "تمت إضافة المنتج للمفضلة"
      );
    }

    saveState();
    updateCounters();
    renderProducts();
    renderFavorites();
  }

  function getCartKey(
    productId,
    variantId = ""
  ) {
    return `${productId}::${variantId || ""}`;
  }

  function addToCart(
    product,
    quantity = 1,
    variant = null
  ) {
    if (!product) return;

    const productId = product.id;

    const variantId =
      variant?.id ||
      product.variant_id ||
      product.selectedVariantId ||
      "";

    const stock =
      Number(
        variant?.stock ??
        product.stock ??
        product.inventory ??
        999999
      );

    const key =
      getCartKey(
        productId,
        variantId
      );

    const existing =
      state.cart.find(
        (item) =>
          item.key === key
      );

    const current =
      existing
        ? Number(
            existing.quantity || 0
          )
        : 0;

    const requested =
      current +
      Number(quantity || 1);

    if (
      Number.isFinite(stock) &&
      requested > stock
    ) {
      showToast(
        "الكمية خلصت، حقك علينا"
      );
      return;
    }

    const item = {
      key,
      productId,
      variantId,
      quantity: requested,
      name: product.name || "",
      price: Number(
        variant?.price ??
        product.sale_price ??
        product.price ??
        0
      ),
      image:
        variant?.image_url ||
        product.image_url ||
        product.image ||
        "",
      variantName:
        variant?.name ||
        product.variant_name ||
        "",
      sku:
        variant?.sku ||
        product.sku ||
        ""
    };

    if (existing) {
      Object.assign(
        existing,
        item
      );
    } else {
      state.cart.push(item);
    }

    saveState();
    updateCounters();
    renderCart();

    showToast(
      "تمت إضافة المنتج للسلة 🛒"
    );
  }

  function changeCartQuantity(
    key,
    delta
  ) {
    const item =
      state.cart.find(
        (cartItem) =>
          cartItem.key === key
      );

    if (!item) return;

    const next =
      Number(item.quantity || 0) +
      Number(delta || 0);

    if (next <= 0) {
      removeFromCart(key);
      return;
    }

    item.quantity = next;

    saveState();
    updateCounters();
    renderCart();
    renderCheckout();
  }

  function removeFromCart(key) {
    state.cart =
      state.cart.filter(
        (item) =>
          item.key !== key
      );

    saveState();
    updateCounters();
    renderCart();
    renderCheckout();

    showToast(
      "تم حذف المنتج من السلة"
    );
  }

  function clearCart() {
    state.cart = [];

    saveState();
    updateCounters();
    renderCart();
    renderCheckout();
  }

  function getCartSubtotal() {
    return state.cart.reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
        Number(item.quantity || 0),
      0
    );
  }

  /* =========================================================
     PRODUCT HELPERS / CARDS
     ========================================================= */

  function productImage(product) {
    return (
      product?.image_url ||
      product?.image ||
      product?.thumbnail ||
      product?.images?.[0]?.url ||
      product?.images?.[0]?.image_url ||
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80"
    );
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
      product?.compare_at_price ??
      product?.old_price ??
      0
    );
  }

  function productStock(product) {
    if (
      product?.stock === null ||
      product?.stock === undefined
    ) {
      return null;
    }

    return Number(product.stock);
  }

  function isSoldOut(product) {
    const stock =
      productStock(product);

    return (
      stock !== null &&
      stock <= 0
    );
  }

  function renderProductCard(product) {
    if (!product) return "";

    const favorite =
      isFavorite(product.id);

    const soldOut =
      isSoldOut(product);

    const price =
      productPrice(product);

    const oldPrice =
      productOldPrice(product);

    const hasDiscount =
      oldPrice > price &&
      price > 0;

    return `
      <article class="product-card">
        <div class="product-card-image">

          <button
            class="favorite-button ${favorite ? "active" : ""}"
            type="button"
            data-action="favorite"
            data-product-id="${escapeHTML(product.id)}"
            aria-label="المفضلة"
          >
            ${favorite ? "♥" : "♡"}
          </button>

          ${
            hasDiscount
              ? `<span class="product-badge discount-badge">خصم</span>`
              : ""
          }

          ${
            soldOut
              ? `<span class="product-badge sold-out-badge">SOLD OUT</span>`
              : ""
          }

          <button
            class="product-image-button"
            type="button"
            data-action="open-product"
            data-product-id="${escapeHTML(product.id)}"
          >
            <img
              src="${escapeHTML(productImage(product))}"
              alt="${escapeHTML(product.name || "منتج")}"
              loading="lazy"
            >
          </button>
        </div>

        <div class="product-card-body">

          ${
            product.brand_name ||
            product.brand
              ? `<div class="product-brand">${escapeHTML(product.brand_name || product.brand)}</div>`
              : ""
          }

          <button
            class="product-name"
            type="button"
            data-action="open-product"
            data-product-id="${escapeHTML(product.id)}"
          >
            ${escapeHTML(product.name || "منتج")}
          </button>

          ${
            product.category_name ||
            product.category
              ? `<div class="product-category">${escapeHTML(product.category_name || product.category)}</div>`
              : ""
          }

          <div class="product-price-row">
            <strong class="product-price">
              ${money(price)}
            </strong>

            ${
              hasDiscount
                ? `<span class="product-old-price">${money(oldPrice)}</span>`
                : ""
            }
          </div>

          ${
            soldOut
              ? `<button class="add-to-cart-button disabled" disabled>الكمية خلصت</button>`
              : `<button class="add-to-cart-button" type="button" data-action="add-cart" data-product-id="${escapeHTML(product.id)}">أضيفي للسلة 🛒</button>`
          }

        </div>
      </article>
    `;
  }

  function getFilteredProducts() {
    let products =
      [...state.products];

    const filter =
      state.currentFilter || {};

    if (filter.category) {
      const value =
        String(
          filter.category
        ).toLowerCase();

      products =
        products.filter(
          (product) =>
            String(
              product.category_id ??
              product.category ??
              product.category_name ??
              ""
            ).toLowerCase() === value
        );
    }

    if (filter.brand) {
      const value =
        String(
          filter.brand
        ).toLowerCase();

      products =
        products.filter(
          (product) =>
            String(
              product.brand_id ??
              product.brand ??
              product.brand_name ??
              ""
            ).toLowerCase() === value
        );
    }

    if (filter.search) {
      const search =
        String(
          filter.search
        )
          .trim()
          .toLowerCase();

      products =
        products.filter(
          (product) => {
            const text = [
              product.name,
              product.description,
              product.brand,
              product.brand_name,
              product.category,
              product.category_name,
              product.sku
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return text.includes(search);
          }
        );
    }

    if (filter.offer) {
      products =
        products.filter(
          (product) =>
            productOldPrice(product) >
            productPrice(product)
        );
    }

    switch (filter.sort) {
      case "price-low":
        products.sort(
          (a, b) =>
            productPrice(a) -
            productPrice(b)
        );
        break;

      case "price-high":
        products.sort(
          (a, b) =>
            productPrice(b) -
            productPrice(a)
        );
        break;

      case "name":
        products.sort(
          (a, b) =>
            String(a.name || "")
              .localeCompare(
                String(b.name || ""),
                "ar"
              )
        );
        break;

      case "newest":
        products.sort(
          (a, b) =>
            String(
              b.created_at || ""
            ).localeCompare(
              String(
                a.created_at || ""
              )
            )
        );
        break;
    }

    return products;
  }

  function renderProducts() {
    const container =
      $("#productsGrid");

    if (!container) return;

    const products =
      getFilteredProducts();

    container.innerHTML =
      products.length
        ? products
            .map(renderProductCard)
            .join("")
        : `
          <div class="empty-state">
            <div class="empty-state-icon">🛍️</div>
            <h3>ما لقينا منتجات</h3>
            <p>جربي تغيير البحث أو التصنيف.</p>
          </div>
        `;
  }

  function renderFavorites() {
    const container =
      $("#favoritesGrid");

    if (!container) return;

    const products =
      state.products.filter(
        (product) =>
          isFavorite(product.id)
      );

    container.innerHTML =
      products.length
        ? products
            .map(renderProductCard)
            .join("")
        : `
          <div class="empty-state">
            <div class="empty-state-icon">♡</div>
            <h3>المفضلة فاضية</h3>
            <p>أضيفي المنتجات اللي بتحبيها للمفضلة.</p>
          </div>
        `;
  }

  /* =========================================================
     CART RENDER
     ========================================================= */

  function renderCart() {
    const container =
      $("#cartItems");

    const subtotalElement =
      $("#cartSubtotal");

    const totalElement =
      $("#cartTotal");

    if (!container) return;

    if (!state.cart.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛒</div>
          <h3>السلة فاضية</h3>
          <p>اختاري المنتجات اللي بتحبيها وابدئي التسوق.</p>
        </div>
      `;

      if (subtotalElement)
        subtotalElement.textContent =
          money(0);

      if (totalElement)
        totalElement.textContent =
          money(0);

      return;
    }

    container.innerHTML =
      state.cart.map((item) => {
        const total =
          Number(item.price || 0) *
          Number(item.quantity || 0);

        return `
          <div class="cart-item">
            <div class="cart-item-image">
              <img
                src="${escapeHTML(item.image || productImage({}))}"
                alt="${escapeHTML(item.name)}"
                loading="lazy"
              >
            </div>

            <div class="cart-item-info">
              <h3>${escapeHTML(item.name)}</h3>

              ${
                item.variantName
                  ? `<div class="cart-item-variant">${escapeHTML(item.variantName)}</div>`
                  : ""
              }

              ${
                item.sku
                  ? `<div class="cart-item-sku">SKU: ${escapeHTML(item.sku)}</div>`
                  : ""
              }

              <strong>${money(item.price)}</strong>
            </div>

            <div class="cart-item-controls">
              <button type="button" data-action="cart-minus" data-cart-key="${escapeHTML(item.key)}">−</button>
              <span>${Number(item.quantity || 0)}</span>
              <button type="button" data-action="cart-plus" data-cart-key="${escapeHTML(item.key)}">+</button>
            </div>

            <div class="cart-item-total">
              ${money(total)}
            </div>

            <button
              class="cart-remove-button"
              type="button"
              data-action="cart-remove"
              data-cart-key="${escapeHTML(item.key)}"
            >×</button>
          </div>
        `;
      }).join("");

    const subtotal =
      getCartSubtotal();

    if (subtotalElement)
      subtotalElement.textContent =
        money(subtotal);

    if (totalElement)
      totalElement.textContent =
        money(subtotal);
  }

  /* =========================================================
     PRODUCT DETAILS
     ========================================================= */

  async function openProduct(productId) {
    let product =
      state.products.find(
        (item) =>
          String(item.id) ===
          String(productId)
      );

    if (!product) {
      const result =
        await api(
          `/products/${encodeURIComponent(productId)}`
        );

      product =
        result?.product || null;
    }

    if (!product) {
      showToast(
        "تعذر فتح المنتج"
      );
      return;
    }

    state.currentProduct =
      product;

    renderProductDetails();
    navigate("product");
  }

  function renderProductDetails() {
    const product =
      state.currentProduct;

    const container =
      $("#productDetails");

    if (!product || !container)
      return;

    const variants =
      product.variants ||
      product.product_variants ||
      [];

    container.innerHTML = `
      <div class="product-details-layout">

        <div class="product-details-gallery">
          <div class="product-main-image">
            <img
              src="${escapeHTML(productImage(product))}"
              alt="${escapeHTML(product.name || "")}"
            >
          </div>
        </div>

        <div class="product-details-info">

          ${
            product.brand_name ||
            product.brand
              ? `<div class="product-brand">${escapeHTML(product.brand_name || product.brand)}</div>`
              : ""
          }

          <h1>${escapeHTML(product.name || "منتج")}</h1>

          ${
            product.description
              ? `<div class="product-description">${escapeHTML(product.description)}</div>`
              : ""
          }

          <div class="product-details-price">
            <strong>${money(productPrice(product))}</strong>

            ${
              productOldPrice(product) >
              productPrice(product)
                ? `<del>${money(productOldPrice(product))}</del>`
                : ""
            }
          </div>

          ${
            variants.length
              ? `
                <div class="variant-selector">
                  <label>اختاري الخيار</label>
                  <div class="variant-options">
                    ${variants.map((variant, index) => `
                      <button
                        type="button"
                        class="variant-option ${index === 0 ? "active" : ""}"
                        data-variant-id="${escapeHTML(variant.id)}"
                      >
                        ${escapeHTML(
                          variant.name ||
                          variant.color ||
                          variant.size ||
                          `الخيار ${index + 1}`
                        )}
                      </button>
                    `).join("")}
                  </div>
                </div>
              `
              : ""
          }

          <div class="product-quantity">
            <button type="button" id="productQuantityMinus">−</button>
            <input id="productQuantity" type="number" min="1" value="1">
            <button type="button" id="productQuantityPlus">+</button>
          </div>

          ${
            isSoldOut(product)
              ? `<button class="primary-button disabled" disabled>الكمية خلصت، حقك علينا</button>`
              : `<button class="primary-button" id="productAddToCart" type="button">أضيفي للسلة 🛒</button>`
          }

          <button
            class="secondary-button"
            id="productFavoriteButton"
            type="button"
          >
            ${
              isFavorite(product.id)
                ? "♥ إزالة من المفضلة"
                : "♡ أضيفي للمفضلة"
            }
          </button>

        </div>
      </div>
    `;

    bindProductDetails();
  }

  function bindProductDetails() {
    const product =
      state.currentProduct;

    if (!product) return;

    const quantityInput =
      $("#productQuantity");

    let selectedVariant =
      (
        product.variants ||
        product.product_variants ||
        []
      )[0] || null;

    const variants =
      product.variants ||
      product.product_variants ||
      [];

    $$(".variant-option")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            $$(".variant-option")
              .forEach((item) =>
                item.classList.remove(
                  "active"
                )
              );

            button.classList.add(
              "active"
            );

            selectedVariant =
              variants.find(
                (variant) =>
                  String(variant.id) ===
                  String(
                    button.dataset.variantId
                  )
              ) || null;
          }
        );
      });

    $("#productQuantityMinus")
      ?.addEventListener(
        "click",
        () => {
          if (!quantityInput) return;

          quantityInput.value =
            Math.max(
              1,
              Number(
                quantityInput.value || 1
              ) - 1
            );
        }
      );

    $("#productQuantityPlus")
      ?.addEventListener(
        "click",
        () => {
          if (!quantityInput) return;

          quantityInput.value =
            Number(
              quantityInput.value || 1
            ) + 1;
        }
      );

    $("#productAddToCart")
      ?.addEventListener(
        "click",
        () => {
          addToCart(
            product,
            Math.max(
              1,
              Number(
                quantityInput?.value || 1
              )
            ),
            selectedVariant
          );
        }
      );

    $("#productFavoriteButton")
      ?.addEventListener(
        "click",
        () => {
          toggleFavorite(
            product.id
          );

          const button =
            $("#productFavoriteButton");

          if (button) {
            button.textContent =
              isFavorite(product.id)
                ? "♥ إزالة من المفضلة"
                : "♡ أضيفي للمفضلة";
          }
        }
      );
  }

  /* =========================================================
     CATEGORIES / BRANDS / OFFERS
     ========================================================= */

  function renderCategories() {
    const container =
      $("#categoriesGrid");

    if (!container) return;

    container.innerHTML =
      state.categories.length
        ? state.categories.map(
            (category) => `
              <button
                type="button"
                class="category-card"
                data-action="category"
                data-category-id="${escapeHTML(category.id)}"
              >
                <div class="category-image">
                  <img
                    src="${escapeHTML(
                      category.image_url ||
                      category.image ||
                      "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=800&q=80"
                    )}"
                    alt="${escapeHTML(category.name || "")}"
                    loading="lazy"
                  >
                </div>

                <div class="category-card-content">
                  <strong>${escapeHTML(category.name || "تصنيف")}</strong>
                </div>
              </button>
            `
          ).join("")
        : `
          <div class="empty-state">
            <h3>التصنيفات قيد التجهيز</h3>
          </div>
        `;
  }

  function renderBrands() {
    const container =
      $("#brandsGrid");

    if (!container) return;

    container.innerHTML =
      state.brands.length
        ? state.brands.map(
            (brand) => `
              <button
                type="button"
                class="brand-card"
                data-action="brand"
                data-brand-id="${escapeHTML(brand.id)}"
              >
                ${
                  brand.image_url ||
                  brand.logo_url ||
                  brand.image
                    ? `<div class="brand-image"><img src="${escapeHTML(brand.image_url || brand.logo_url || brand.image)}" alt="${escapeHTML(brand.name || "")}"></div>`
                    : `<div class="brand-placeholder">✦</div>`
                }

                <strong>${escapeHTML(brand.name || "ماركة")}</strong>
              </button>
            `
          ).join("")
        : `
          <div class="empty-state">
            <h3>الماركات قيد التجهيز</h3>
          </div>
        `;
  }

  function renderOffers() {
    const container =
      $("#offersGrid");

    if (!container) return;

    const offers =
      state.offers.length
        ? state.offers
        : state.products.filter(
            (product) =>
              productOldPrice(product) >
              productPrice(product)
          );

    container.innerHTML =
      offers.length
        ? offers.map(
            renderProductCard
          ).join("")
        : `
          <div class="empty-state">
            <h3>ما في عروض حالياً</h3>
          </div>
        `;
  }

  function openCategory(id) {
    state.currentFilter = {
      category: id
    };
    renderProducts();
    navigate("products");
  }

  function openBrand(id) {
    state.currentFilter = {
      brand: id
    };
    renderProducts();
    navigate("products");
  }

  /* =========================================================
     TOP FIVE / BEST SELLERS
     ========================================================= */

  function renderMiniSlider(
    container,
    products
  ) {
    if (!container) return;

    container.innerHTML =
      products?.length
        ? `<div class="mini-slider-track">${products.map(renderProductCard).join("")}</div>`
        : `
          <div class="empty-state compact">
            <p>لسه ما في منتجات بهالقائمة.</p>
          </div>
        `;
  }

  function renderTopFive() {
    renderMiniSlider(
      $("#topFiveSlider"),
      state.topFive
    );
  }

  function renderBestSellers() {
    renderMiniSlider(
      $("#bestSellersSlider"),
      state.bestSellers
    );
  }

  /* =========================================================
     HERO
     ========================================================= */

  function renderHero() {
    const container =
      $("#heroSlider");

    const slides =
      state.heroSlides || [];

    if (!container) return;

    if (!slides.length) {
      container.innerHTML = `
        <div class="hero-slide active">
          <div class="hero-slide-content">
            <span class="hero-kicker">Ladies First</span>
            <h1>لأنك أولاً</h1>
            <p>اكتشفي اختياراتنا من الأزياء والجمال والإكسسوارات.</p>
            <button type="button" class="primary-button" data-action="go-products">
              تسوقي الآن
            </button>
          </div>
        </div>
      `;
      return;
    }

    const index =
      Math.max(
        0,
        Math.min(
          state.heroIndex,
          slides.length - 1
        )
      );

    container.innerHTML =
      slides.map(
        (slide, slideIndex) => `
          <div
            class="hero-slide ${slideIndex === index ? "active" : ""}"
            style="${
              slide.image_url || slide.image
                ? `background-image:url('${escapeHTML(slide.image_url || slide.image)}')`
                : ""
            }"
          >
            <div class="hero-slide-overlay"></div>

            <div class="hero-slide-content">
              ${
                slide.kicker
                  ? `<span class="hero-kicker">${escapeHTML(slide.kicker)}</span>`
                  : ""
              }

              <h1>${escapeHTML(slide.title || "لأنك أولاً")}</h1>

              ${
                slide.subtitle
                  ? `<p>${escapeHTML(slide.subtitle)}</p>`
                  : ""
              }

              <button
                type="button"
                class="primary-button"
                data-action="hero-action"
                data-hero-action="${escapeHTML(slide.action || "products")}"
              >
                ${escapeHTML(slide.button_text || "تسوقي الآن")}
              </button>
            </div>
          </div>
        `
      ).join("");

    renderHeroDots(
      slides.length
    );
  }

  function renderHeroDots(count) {
    const container =
      $("#heroDots");

    if (!container) return;

    container.innerHTML =
      count <= 1
        ? ""
        : Array.from(
            { length: count },
            (_, index) => `
              <button
                type="button"
                class="hero-dot ${index === state.heroIndex ? "active" : ""}"
                data-action="hero-dot"
                data-index="${index}"
                aria-label="الشريحة ${index + 1}"
              ></button>
            `
          ).join("");
  }

  function setHero(index) {
    const slides =
      state.heroSlides || [];

    if (!slides.length) return;

    state.heroIndex =
      (index + slides.length) %
      slides.length;

    renderHero();
  }

  function nextHero() {
    setHero(
      state.heroIndex + 1
    );
  }

  function previousHero() {
    setHero(
      state.heroIndex - 1
    );
  }

  function startHeroAutoPlay() {
    clearInterval(
      state.heroTimer
    );

    if (
      !state.heroSlides ||
      state.heroSlides.length <= 1
    ) {
      return;
    }

    state.heroTimer =
      setInterval(
        nextHero,
        6000
      );
  }

  /* =========================================================
     SEARCH
     ========================================================= */

  function performSearch(value) {
    state.currentFilter = {
      search:
        String(value || "")
          .trim()
    };

    renderProducts();
    navigate("products");
  }

  function openSearch() {
    const panel =
      $("#searchPanel");

    if (!panel) {
      const value =
        window.prompt(
          "عن شو بدك تدوري؟"
        );

      if (value?.trim()) {
        performSearch(value);
      }

      return;
    }

    panel.classList.add("open");
    $("#searchInput")?.focus();
  }

  function closeSearch() {
    $("#searchPanel")
      ?.classList.remove("open");
  }

  /* =========================================================
     CHECKOUT / PAYMENT
     ========================================================= */

  function getSettingNumber(...keys) {
    const settings =
      state.settings || {};

    for (const key of keys) {
      const value =
        settings[key];

      if (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        Number.isFinite(
          Number(value)
        )
      ) {
        return Number(value);
      }
    }

    return 0;
  }

  function getSelectedPaymentMethod() {
    const selected =
      document.querySelector(
        'input[name="payment_method"]:checked'
      );

    return selected?.value === "visa"
      ? "visa"
      : "cash";
  }

  function calculateCheckoutPreview() {
    const subtotal =
      getCartSubtotal();

    const paymentMethod =
      getSelectedPaymentMethod();

    const visaDiscountPercent =
      getSettingNumber(
        "visa_discount_percent",
        "visaDiscountPercent",
        "visa_discount"
      );

    const shipping =
      getSettingNumber(
        "shipping",
        "shipping_fee",
        "shippingFee",
        "delivery_fee",
        "deliveryFee"
      );

    const packaging =
      getSettingNumber(
        "packaging",
        "packaging_fee",
        "packagingFee"
      );

    const discount =
      paymentMethod === "visa"
        ? Math.min(
            subtotal,
            subtotal *
              visaDiscountPercent /
              100
          )
        : 0;

    const pointsRate =
      getSettingNumber(
        "loyalty_points_per_currency",
        "loyaltyPointsPerCurrency"
      );

    const points =
      Math.max(
        0,
        Math.floor(
          Math.max(
            0,
            subtotal - discount
          ) * pointsRate
        )
      );

    const total =
      Math.max(
        0,
        subtotal +
          shipping +
          packaging -
          discount
      );

    return {
      subtotal,
      paymentMethod,
      visaDiscountPercent,
      discount,
      shipping,
      packaging,
      points,
      total
    };
  }

  function updateCheckoutPaymentUI() {
    const preview =
      calculateCheckoutPreview();

    const discountRow =
      $("#checkoutVisaDiscountRow");

    const discountElement =
      $("#checkoutVisaDiscount");

    const shippingElement =
      $("#checkoutShipping");

    const packagingElement =
      $("#checkoutPackaging");

    const totalElement =
      $("#checkoutTotal");

    const pointsElement =
      $("#checkoutPoints");

    const visaMessage =
      $("#visaDiscountMessage");

    if (discountRow) {
      discountRow.classList.toggle(
        "hidden",
        preview.discount <= 0
      );
    }

    if (discountElement) {
      discountElement.textContent =
        money(preview.discount);
    }

    if (shippingElement) {
      shippingElement.textContent =
        money(preview.shipping);
    }

    if (packagingElement) {
      packagingElement.textContent =
        money(preview.packaging);
    }

    if (totalElement) {
      totalElement.textContent =
        money(preview.total);
    }

    if (pointsElement) {
      pointsElement.textContent =
        Number(
          preview.points || 0
        ).toLocaleString("ar");
    }

    if (visaMessage) {
      visaMessage.textContent =
        preview.visaDiscountPercent > 0
          ? "عند اختيار Visa سيتم خصم " +
            preview.visaDiscountPercent +
            "% من قيمة المنتجات."
          : "الدفع بالفيزا متاح، ولا يوجد خصم Visa مفعّل حالياً.";
    }
  }

  function bindCheckoutPaymentOptions() {
    $$(
      'input[name="payment_method"]'
    ).forEach((input) => {
      input.addEventListener(
        "change",
        updateCheckoutPaymentUI
      );
    });

    updateCheckoutPaymentUI();
  }

  function renderCheckout() {
    const subtotal =
      getCartSubtotal();

    const subtotalElement =
      $("#checkoutSubtotal");

    if (subtotalElement) {
      subtotalElement.textContent =
        money(subtotal);
    }

    updateCheckoutPaymentUI();
  }

  async function submitOrder() {
    if (state.orderSubmitting) {
      return;
    }

    if (!state.cart.length) {
      showToast(
        "السلة فاضية"
      );
      return;
    }

    const name =
      $("#checkoutName")?.value.trim();

    const phone =
      $("#checkoutPhone")?.value.trim();

    const address =
      $("#checkoutAddress")?.value.trim();

    const notes =
      $("#checkoutNotes")?.value.trim();

    const paymentMethod =
      getSelectedPaymentMethod();

    if (!name || !phone) {
      showToast(
        "الاسم ورقم الهاتف مطلوبان"
      );
      return;
    }

    const orderItems =
      state.cart.map((item) => ({
        product_id:
          item.productId,
        variant_id:
          item.variantId ||
          null,
        quantity:
          Number(
            item.quantity || 1
          ),
        unit_price:
          Number(
            item.price || 0
          )
      }));

    const preview =
      calculateCheckoutPreview();

    const payload = {
      customer_name: name,
      customer_phone: phone,
      shipping_address:
        address || "",
      notes: notes || "",
      items: orderItems,
      subtotal:
        preview.subtotal,
      total:
        preview.total,
      payment_method:
        paymentMethod,
      paymentMethod
    };

    state.orderSubmitting = true;

    const button =
      $("#submitOrderButton") ||
      $("#checkoutButton");

    if (button) {
      button.disabled = true;
      button.textContent =
        "جاري إرسال الطلب...";
    }

    let result = null;

    try {
      result = await api(
        "/orders",
        {
          method: "POST",
          body: JSON.stringify(
            payload
          )
        }
      );
    } finally {
      state.orderSubmitting =
        false;

      if (button) {
        button.disabled = false;
        button.textContent =
          "تأكيد الطلب";
      }
    }

    if (!result) {
      showToast(
        "تعذر إرسال الطلب حالياً"
      );
      return;
    }

    if (
      result.error ===
        "OUT_OF_STOCK" ||
      result.code ===
        "OUT_OF_STOCK"
    ) {
      showToast(
        "الكمية خلصت، حقك علينا"
      );
      return;
    }

    if (
      result.ok === false &&
      result.message
    ) {
      showToast(
        result.message
      );
      return;
    }

    const order =
      result.order || result;

    const orderNumber =
      order.order_number ||
      order.orderNumber ||
      order.id ||
      "";

    const returnedTotal =
      Number(
        order.total ??
        order.total_amount ??
        preview.total
      );

    const returnedDiscount =
      Number(
        order.visaDiscount ??
        order.visa_discount ??
        preview.discount
      );

    const returnedPoints =
      Number(
        order.loyaltyPoints ??
        order.loyalty_points_awarded ??
        preview.points
      );

    state.cart = [];
    saveState();
    updateCounters();
    renderCart();
    renderCheckout();

    showToast(
      returnedPoints > 0
        ? "تم إرسال طلبك بنجاح ❤️ وأضيفت " +
          returnedPoints.toLocaleString("ar") +
          " نقطة"
        : "تم إرسال طلبك بنجاح ❤️"
    );

    if (orderNumber) {
      const message = [
        "🛍️ طلب جديد من Ladies First",
        "",
        `رقم الطلب: ${orderNumber}`,
        `الاسم: ${name}`,
        `الهاتف: ${phone}`,
        `طريقة الدفع: ${
          paymentMethod === "visa"
            ? "Visa"
            : "الدفع عند الاستلام"
        }`,
        returnedDiscount > 0
          ? `خصم Visa: ${money(returnedDiscount)}`
          : "",
        `الإجمالي: ${money(returnedTotal)}`
      ]
        .filter(Boolean)
        .join("\n");

      openWhatsApp(
        message
      );
    }

    navigate("home");
  }

  /*
   * index.html may use onclick="submitOrder()".
   * Expose the function globally while keeping the rest private.
   */
  window.submitOrder =
    submitOrder;

  /* =========================================================
     WHATSAPP
     ========================================================= */

  function getWhatsAppNumber() {
    return "0562499924";
  }

  function openWhatsApp(message = "") {
    const cleanNumber =
      getWhatsAppNumber()
        .replace(/[^\d]/g, "");

    const url =
      `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function shareProductWhatsApp(product) {
    if (!product) return;

    openWhatsApp(
      [
        "🛍️ Ladies First",
        "",
        product.name ||
          "منتج",
        `السعر: ${money(productPrice(product))}`,
        "",
        "شوفي المنتج على متجر Ladies First."
      ].join("\n")
    );
  }

  /* =========================================================
     COMPLEMENTARY PRODUCTS
     ========================================================= */

  function getComplementaryProducts(
    product
  ) {
    if (!product) return [];

    const explicit =
      product.complementary_products ||
      product.recommended_products ||
      product.recommendations;

    if (
      Array.isArray(explicit) &&
      explicit.length
    ) {
      return explicit;
    }

    const categoryId =
      product.category_id;

    const brandId =
      product.brand_id;

    return state.products
      .filter((item) => {
        if (
          String(item.id) ===
          String(product.id)
        ) {
          return false;
        }

        return (
          (categoryId &&
            String(
              item.category_id
            ) ===
              String(categoryId)) ||
          (brandId &&
            String(
              item.brand_id
            ) ===
              String(brandId))
        );
      })
      .slice(0, 6);
  }

  function renderComplementaryProducts(
    product
  ) {
    const container =
      $("#complementaryProducts");

    if (!container) return;

    const products =
      getComplementaryProducts(
        product
      );

    container.innerHTML =
      products.length
        ? `
          <div class="section-heading">
            <div>
              <span class="section-kicker">يكمل اللوك</span>
              <h2>بيلبق معه ✨</h2>
            </div>
          </div>

          <div class="mini-slider-track">
            ${products.map(renderProductCard).join("")}
          </div>
        `
        : "";
  }

  /* =========================================================
     SETTINGS / STORE
     ========================================================= */

  async function loadSettings() {
    const result =
      await api("/settings");

    if (result) {
      state.settings =
        result.settings ||
        result ||
        {};
    }
  }

  async function loadStore() {
    const result =
      await api("/store/home");

    if (!result) {
      showToast(
        "تعذر تحميل المتجر حالياً"
      );
      return;
    }

    state.products =
      Array.isArray(
        result.products
      )
        ? result.products
        : [];

    state.categories =
      Array.isArray(
        result.categories
      )
        ? result.categories
        : [];

    state.brands =
      Array.isArray(
        result.brands
      )
        ? result.brands
        : [];

    state.offers =
      Array.isArray(
        result.offers
      )
        ? result.offers
        : [];

    state.topFive =
      Array.isArray(
        result.topFive
      )
        ? result.topFive
        : [];

    state.bestSellers =
      Array.isArray(
        result.bestSellers
      )
        ? result.bestSellers
        : [];

    state.heroSlides =
      Array.isArray(
        result.heroSlides
      )
        ? result.heroSlides
        : Array.isArray(
            result.hero
          )
          ? result.hero
          : [];

    renderAllStoreSections();
  }

  function renderAllStoreSections() {
    renderHero();
    renderProducts();
    renderFavorites();
    renderCart();
    renderCheckout();
    renderCategories();
    renderBrands();
    renderOffers();
    renderTopFive();
    renderBestSellers();
    updateCounters();

    if (
      state.currentProduct
    ) {
      renderComplementaryProducts(
        state.currentProduct
      );
    }
  }

  /* =========================================================
     EVENT DELEGATION
     ========================================================= */

  function handleAction(event) {
    const element =
      event.target.closest(
        "[data-action]"
      );

    if (!element) return;

    const action =
      element.dataset.action;

    switch (action) {
      case "favorite": {
        const id =
          element.dataset.productId;

        if (id) {
          toggleFavorite(id);
        }
        break;
      }

      case "open-product": {
        const id =
          element.dataset.productId;

        if (id) {
          openProduct(id);
        }
        break;
      }

      case "add-cart": {
        const id =
          element.dataset.productId;

        const product =
          state.products.find(
            (item) =>
              String(item.id) ===
              String(id)
          );

        if (product) {
          addToCart(
            product
          );
        }
        break;
      }

      case "category": {
        const id =
          element.dataset.categoryId;

        if (id) {
          openCategory(id);
        }
        break;
      }

      case "brand": {
        const id =
          element.dataset.brandId;

        if (id) {
          openBrand(id);
        }
        break;
      }

      case "cart-plus": {
        const key =
          element.dataset.cartKey;

        if (key) {
          changeCartQuantity(
            key,
            1
          );
        }
        break;
      }

      case "cart-minus": {
        const key =
          element.dataset.cartKey;

        if (key) {
          changeCartQuantity(
            key,
            -1
          );
        }
        break;
      }

      case "cart-remove": {
        const key =
          element.dataset.cartKey;

        if (key) {
          removeFromCart(key);
        }
        break;
      }

      case "go-products":
        navigate("products");
        break;

      case "hero-action": {
        const actionName =
          element.dataset.heroAction;

        if (
          actionName &&
          pageMap[actionName]
        ) {
          navigate(
            actionName
          );
        } else {
          navigate(
            "products"
          );
        }
        break;
      }

      case "hero-dot": {
        const index =
          Number(
            element.dataset.index
          );

        if (
          Number.isFinite(index)
        ) {
          setHero(index);
        }
        break;
      }
    }
  }

  /* =========================================================
     GLOBAL EVENTS
     ========================================================= */

  function bindGlobalEvents() {
    document.addEventListener(
      "click",
      handleAction
    );

    $$(".main-nav button[data-page]")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            if (
              button.dataset.page
            ) {
              navigate(
                button.dataset.page
              );
            }
          }
        );
      });

    $(".brand")?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        navigate("home");
      }
    );

    $("#mobileMenuButton")
      ?.addEventListener(
        "click",
        toggleMobileMenu
      );

    $("#searchButton")
      ?.addEventListener(
        "click",
        openSearch
      );

    $("#favoritesButton")
      ?.addEventListener(
        "click",
        () =>
          navigate(
            "favorites"
          )
      );

    $("#cartButton")
      ?.addEventListener(
        "click",
        () => {
          renderCart();
          navigate("cart");
        }
      );

    $("#accountButton")
      ?.addEventListener(
        "click",
        () => {
          renderAccount();
          navigate("account");
        }
      );

    $("#closeSearchButton")
      ?.addEventListener(
        "click",
        closeSearch
      );

    $("#searchSubmitButton")
      ?.addEventListener(
        "click",
        () => {
          const value =
            $("#searchInput")
              ?.value || "";

          if (value.trim()) {
            performSearch(
              value
            );
            closeSearch();
          }
        }
      );

    $("#searchInput")
      ?.addEventListener(
        "keydown",
        (event) => {
          if (
            event.key ===
            "Enter"
          ) {
            const value =
              event.currentTarget
                .value;

            if (value.trim()) {
              performSearch(
                value
              );
              closeSearch();
            }
          }
        }
      );

    $("#loginButton")
      ?.addEventListener(
        "click",
        loginUser
      );

    $("#registerButton")
      ?.addEventListener(
        "click",
        registerUser
      );

    $("#saveProfileButton")
      ?.addEventListener(
        "click",
        saveProfile
      );

    $("#logoutButton")
      ?.addEventListener(
        "click",
        logoutUser
      );

    $("#showRegisterButton")
      ?.addEventListener(
        "click",
        () => {
          $("#loginForm")
            ?.classList.add(
              "hidden"
            );

          $("#registerForm")
            ?.classList.remove(
              "hidden"
            );
        }
      );

    $("#showLoginButton")
      ?.addEventListener(
        "click",
        () => {
          $("#registerForm")
            ?.classList.add(
              "hidden"
            );

          $("#loginForm")
            ?.classList.remove(
              "hidden"
            );
        }
      );

    $("#submitOrderButton")
      ?.addEventListener(
        "click",
        submitOrder
      );

    $("#checkoutButton")
      ?.addEventListener(
        "click",
        submitOrder
      );

    $("#clearCartButton")
      ?.addEventListener(
        "click",
        clearCart
      );

    $("#heroNext")
      ?.addEventListener(
        "click",
        nextHero
      );

    $("#heroPrevious")
      ?.addEventListener(
        "click",
        previousHero
      );

    window.addEventListener(
      "hashchange",
      handleHash
    );

    window.addEventListener(
      "popstate",
      handleHash
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
          "Escape"
        ) {
          closeMobileMenu();
          closeSearch();
        }
      }
    );

    bindCheckoutPaymentOptions();
  }

  /* =========================================================
     INIT
     ========================================================= */

  async function init() {
    bindGlobalEvents();

    updateCounters();
    updateGreeting();
    renderAccount();
    handleHash();

    await Promise.allSettled([
      loadCurrentUser(),
      loadSettings(),
      loadStore()
    ]);

    renderAllStoreSections();
    renderAccount();
    updateCounters();
    updateCheckoutPaymentUI();

    startHeroAutoPlay();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
