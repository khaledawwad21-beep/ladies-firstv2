/* =========================================================
   LADIES FIRST - FRONTEND APP
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
    favorites: JSON.parse(localStorage.getItem("lf_favorites") || "[]"),
    cart: JSON.parse(localStorage.getItem("lf_cart") || "[]"),
    user: JSON.parse(localStorage.getItem("lf_user") || "null"),
    currentProduct: null,
    currentFilter: {},
    heroIndex: 0
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const escapeHTML = (value = "") =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const money = (value) => {
    const number = Number(value || 0);
    return `${number.toFixed(2)} ₪`;
  };

  const saveState = () => {
    localStorage.setItem("lf_favorites", JSON.stringify(state.favorites));
    localStorage.setItem("lf_cart", JSON.stringify(state.cart));

    if (state.user) {
      localStorage.setItem("lf_user", JSON.stringify(state.user));
    } else {
      localStorage.removeItem("lf_user");
    }
  };

  /* =========================================================
     API
     ========================================================= */

  async function api(path, options = {}) {
    try {
      const token = localStorage.getItem("lf_token");

      const response = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {})
        },
        ...options
      });

      const text = await response.text();

      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
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
     USER / GREETING
     ========================================================= */

  function updateGreeting() {
    const greeting = $("#accountGreeting");

    if (!greeting) return;

    if (!state.user) {
      greeting.textContent = "حسابي";
      return;
    }

    const gender = String(state.user.gender || "").toLowerCase();

    if (
      gender === "male" ||
      gender === "ذكر" ||
      gender === "m"
    ) {
      greeting.textContent = "نورتنا";
      return;
    }

    if (
      gender === "female" ||
      gender === "أنثى" ||
      gender === "انثى" ||
      gender === "f"
    ) {
      greeting.textContent = "نورتينا";
      return;
    }

    greeting.textContent = state.user.name || "حسابي";
  }

  async function loadCurrentUser() {
    const result = await api("/auth/me");

    if (result?.user) {
      state.user = result.user;
      saveState();
    }

    updateGreeting();
  }

  /* =========================================================
     ACCOUNT / AUTH
     ========================================================= */

  function setToken(token) {
    if (token) {
      localStorage.setItem("lf_token", token);
    } else {
      localStorage.removeItem("lf_token");
    }
  }

  function fillAccountProfile() {
    const user = state.user || {};

    const fields = {
      "#profileName": user.name || "",
      "#profileEmail": user.email || "",
      "#profilePhone": user.phone || user.whatsapp || "",
      "#profileGender": user.gender || "",
      "#profileAge": user.age ?? ""
    };

    Object.entries(fields).forEach(([selector, value]) => {
      const el = $(selector);
      if (el) el.value = value;
    });

    const points = $("#loyaltyPoints");

    if (points) {
      points.textContent = Number(
        user.loyaltyPoints ?? user.points ?? 0
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
    const contact = $("#loginContact")?.value.trim();
    const password = $("#loginPassword")?.value || "";

    if (!contact || !password) {
      showToast("اكتبي رقم الهاتف أو البريد وكلمة المرور");
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

      showToast("تم تسجيل الدخول بنجاح");
      return;
    }

    showToast(result.message || "تعذر تسجيل الدخول");
  }

  async function registerUser() {
    const name = $("#registerName")?.value.trim();
    const email = $("#registerEmail")?.value.trim();
    const phone = $("#registerPhone")?.value.trim();
    const gender = $("#registerGender")?.value || "";
    const ageValue = $("#registerAge")?.value;
    const password = $("#registerPassword")?.value || "";

    if (!name || !password || (!email && !phone)) {
      showToast("الاسم ووسيلة التواصل وكلمة المرور مطلوبة");
      return;
    }

    const age =
      ageValue === "" || ageValue == null
        ? null
        : Number(ageValue);

    const result = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        email: email || null,
        phone: phone || null,
        gender: gender || null,
        age,
        password
      })
    });

    if (!result) {
      showToast("تعذر إنشاء الحساب حالياً");
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

      showToast("تم إنشاء الحساب بنجاح");
      return;
    }

    showToast(result.message || "تعذر إنشاء الحساب");
  }
     async function saveProfile() {
    if (!state.user) {
      showToast("سجلي الدخول أولاً");
      return;
    }

    const name = $("#profileName")?.value.trim();
    const email = $("#profileEmail")?.value.trim();
    const phone = $("#profilePhone")?.value.trim();
    const gender = $("#profileGender")?.value || "";
    const ageValue = $("#profileAge")?.value;

    const age =
      ageValue === "" || ageValue == null
        ? null
        : Number(ageValue);

    if (!name) {
      showToast("الاسم مطلوب");
      return;
    }

    const userId = state.user.id;

    if (!userId) {
      showToast("تعذر تحديد الحساب");
      return;
    }

    const result = await api(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({
        name,
        email: email || null,
        phone: phone || null,
        gender: gender || null,
        age
      })
    });

    if (!result) {
      showToast("تعذر حفظ البيانات حالياً");
      return;
    }

    if (result.user) {
      state.user = result.user;
    } else {
      state.user = {
        ...state.user,
        name,
        email,
        phone,
        gender,
        age
      };
    }

    saveState();
    updateGreeting();
    fillAccountProfile();

    showToast("تم حفظ بياناتك بنجاح");
  }

  function logoutUser() {
    state.user = null;

    setToken(null);
    localStorage.removeItem("lf_user");

    renderAccount();
    updateGreeting();

    showToast("تم تسجيل الخروج");
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

  function showPage(page) {
    const pageId = pageMap[page];

    if (!pageId) {
      page = "home";
    }

    state.page = page;

    $$(".page-section").forEach((section) => {
      section.classList.remove("active");
      section.hidden = true;
    });

    const target = $(`#${pageMap[page]}`);

    if (target) {
      target.hidden = false;
      target.classList.add("active");
    }

    $$(".main-nav button[data-page]").forEach((button) => {
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
    } catch {
      // تجاهل مشاكل history في بعض البيئات
    }
  }

  function handleHash() {
    const hash = window.location.hash.replace("#", "");

    if (hash && pageMap[hash]) {
      showPage(hash);
    } else {
      showPage("home");
    }
  }

  /* =========================================================
     MOBILE MENU
     ========================================================= */

  function openMobileMenu() {
    $("#mainNav")?.classList.add("open");
    $("#mobileMenuButton")?.classList.add("active");
    document.body.classList.add("menu-open");
  }

  function closeMobileMenu() {
    $("#mainNav")?.classList.remove("open");
    $("#mobileMenuButton")?.classList.remove("active");
    document.body.classList.remove("menu-open");
  }

  function toggleMobileMenu() {
    const nav = $("#mainNav");

    if (!nav) return;

    if (nav.classList.contains("open")) {
      closeMobileMenu();
    } else {
      openMobileMenu();
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
     COUNTERS
     ========================================================= */

  function updateCounters() {
    const cartCount = $("#cartCount");
    const favoritesCount = $("#favoritesCount");

    const cartTotal = state.cart.reduce(
      (sum, item) => sum + Number(item.quantity || 1),
      0
    );

    const favoritesTotal = state.favorites.length;

    if (cartCount) {
      cartCount.textContent = cartTotal;
      cartCount.classList.toggle(
        "has-items",
        cartTotal > 0
      );
    }

    if (favoritesCount) {
      favoritesCount.textContent = favoritesTotal;
      favoritesCount.classList.toggle(
        "has-items",
        favoritesTotal > 0
      );
    }
  }

  /* =========================================================
     FAVORITES
     ========================================================= */

  function isFavorite(productId) {
    return state.favorites.some(
      (id) => String(id) === String(productId)
    );
  }

  function toggleFavorite(productId) {
    const id = String(productId);

    if (isFavorite(id)) {
      state.favorites = state.favorites.filter(
        (favoriteId) =>
          String(favoriteId) !== id
      );

      showToast("تمت إزالة المنتج من المفضلة");
    } else {
      state.favorites.push(id);

      showToast("تمت إضافة المنتج للمفضلة");
    }

    saveState();
    updateCounters();

    renderProducts();
    renderFavorites();
  }

  function getFavoriteProducts() {
    return state.products.filter((product) =>
      isFavorite(product.id)
    );
  }

  /* =========================================================
     CART
     ========================================================= */

  function getCartKey(productId, variantId = "") {
    return `${productId}::${variantId || ""}`;
  }

  function addToCart(product, quantity = 1, variant = null) {
    if (!product) return;

    const productId = product.id;
    const variantId =
      variant?.id ||
      product.variant_id ||
      product.selectedVariantId ||
      "";

    const stock = Number(
      variant?.stock ??
      product.stock ??
      product.inventory ??
      999999
    );

    const key = getCartKey(
      productId,
      variantId
    );

    const existing = state.cart.find(
      (item) => item.key === key
    );

    const currentQuantity = existing
      ? Number(existing.quantity || 0)
      : 0;

    const requested =
      currentQuantity + Number(quantity || 1);

    if (Number.isFinite(stock) && requested > stock) {
      showToast("الكمية خلصت، حقك علينا");
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
      Object.assign(existing, item);
    } else {
      state.cart.push(item);
    }

    saveState();
    updateCounters();
    renderCart();

    showToast("تمت إضافة المنتج للسلة 🛒");
  }

  function changeCartQuantity(key, delta) {
    const item = state.cart.find(
      (cartItem) => cartItem.key === key
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
  }

  function removeFromCart(key) {
    state.cart = state.cart.filter(
      (item) => item.key !== key
    );

    saveState();
    updateCounters();
    renderCart();

    showToast("تم حذف المنتج من السلة");
  }

  function clearCart() {
    state.cart = [];

    saveState();
    updateCounters();
    renderCart();
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
     PRODUCTS HELPERS
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
    const stock = productStock(product);

    return stock !== null && stock <= 0;
  }
     /* =========================================================
     PRODUCT CARD
     ========================================================= */

  function renderProductCard(product, options = {}) {
    if (!product) return "";

    const favorite = isFavorite(product.id);
    const soldOut = isSoldOut(product);

    const price = productPrice(product);
    const oldPrice = productOldPrice(product);

    const hasDiscount =
      oldPrice > price && price > 0;

    const category =
      product.category_name ||
      product.category ||
      "";

    const brand =
      product.brand_name ||
      product.brand ||
      "";

    const image = productImage(product);

    return `
      <article
        class="product-card"
        data-product-id="${escapeHTML(product.id)}"
      >
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
              ? `
                <span class="product-badge discount-badge">
                  خصم
                </span>
              `
              : ""
          }

          ${
            soldOut
              ? `
                <span class="product-badge sold-out-badge">
                  SOLD OUT
                </span>
              `
              : ""
          }

          <button
            class="product-image-button"
            type="button"
            data-action="open-product"
            data-product-id="${escapeHTML(product.id)}"
          >
            <img
              src="${escapeHTML(image)}"
              alt="${escapeHTML(product.name || "منتج")}"
              loading="lazy"
              onerror="this.src='https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=800&q=80'"
            >
          </button>
        </div>

        <div class="product-card-body">

          ${
            brand
              ? `
                <div class="product-brand">
                  ${escapeHTML(brand)}
                </div>
              `
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
            category
              ? `
                <div class="product-category">
                  ${escapeHTML(category)}
                </div>
              `
              : ""
          }

          <div class="product-price-row">

            <strong class="product-price">
              ${money(price)}
            </strong>

            ${
              hasDiscount
                ? `
                  <span class="product-old-price">
                    ${money(oldPrice)}
                  </span>
                `
                : ""
            }

          </div>

          ${
            soldOut
              ? `
                <button
                  class="add-to-cart-button disabled"
                  type="button"
                  disabled
                >
                  الكمية خلصت
                </button>
              `
              : `
                <button
                  class="add-to-cart-button"
                  type="button"
                  data-action="add-cart"
                  data-product-id="${escapeHTML(product.id)}"
                >
                  أضيفي للسلة 🛒
                </button>
              `
          }

        </div>
      </article>
    `;
  }

  /* =========================================================
     PRODUCTS FILTER
     ========================================================= */

  function getFilteredProducts() {
    let products = [...state.products];

    const filter = state.currentFilter || {};

    if (filter.category) {
      const categoryValue =
        String(filter.category).toLowerCase();

      products = products.filter((product) => {
        const value = String(
          product.category_id ??
          product.category ??
          product.category_name ??
          ""
        ).toLowerCase();

        return value === categoryValue;
      });
    }

    if (filter.brand) {
      const brandValue =
        String(filter.brand).toLowerCase();

      products = products.filter((product) => {
        const value = String(
          product.brand_id ??
          product.brand ??
          product.brand_name ??
          ""
        ).toLowerCase();

        return value === brandValue;
      });
    }

    if (filter.search) {
      const search =
        String(filter.search)
          .trim()
          .toLowerCase();

      if (search) {
        products = products.filter((product) => {
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
        });
      }
    }

    if (filter.offer) {
      products = products.filter((product) => {
        const price = productPrice(product);
        const oldPrice = productOldPrice(product);

        return (
          oldPrice > price &&
          price > 0
        );
      });
    }

    if (filter.sort) {
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
          products.sort((a, b) =>
            String(a.name || "").localeCompare(
              String(b.name || ""),
              "ar"
            )
          );
          break;

        case "newest":
          products.sort((a, b) =>
            String(
              b.created_at || ""
            ).localeCompare(
              String(a.created_at || "")
            )
          );
          break;
      }
    }

    return products;
  }

  /* =========================================================
     RENDER PRODUCTS
     ========================================================= */

  function renderProducts() {
    const container = $("#productsGrid");

    if (!container) return;

    const products = getFilteredProducts();

    if (!products.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛍️</div>
          <h3>ما لقينا منتجات</h3>
          <p>جربي تغيير البحث أو التصنيف.</p>
        </div>
      `;

      return;
    }

    container.innerHTML = products
      .map((product) =>
        renderProductCard(product)
      )
      .join("");
  }

  /* =========================================================
     FAVORITES RENDER
     ========================================================= */

  function renderFavorites() {
    const container = $("#favoritesGrid");

    if (!container) return;

    const products = getFavoriteProducts();

    if (!products.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">♡</div>
          <h3>المفضلة فاضية</h3>
          <p>
            أضيفي المنتجات اللي بتحبيها للمفضلة
            عشان تلاقيها بسرعة.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML = products
      .map((product) =>
        renderProductCard(product)
      )
      .join("");
  }

  /* =========================================================
     CART RENDER
     ========================================================= */

  function renderCart() {
    const container = $("#cartItems");
    const subtotalElement = $("#cartSubtotal");
    const totalElement = $("#cartTotal");

    if (!container) return;

    if (!state.cart.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛒</div>
          <h3>السلة فاضية</h3>
          <p>اختاري المنتجات اللي بتحبيها وابدئي التسوق.</p>
        </div>
      `;

      if (subtotalElement) {
        subtotalElement.textContent = money(0);
      }

      if (totalElement) {
        totalElement.textContent = money(0);
      }

      return;
    }

    container.innerHTML = state.cart
      .map((item) => {
        const total =
          Number(item.price || 0) *
          Number(item.quantity || 0);

        return `
          <div
            class="cart-item"
            data-cart-key="${escapeHTML(item.key)}"
          >

            <div class="cart-item-image">
              <img
                src="${escapeHTML(
                  item.image || productImage({})
                )}"
                alt="${escapeHTML(item.name)}"
                loading="lazy"
              >
            </div>

            <div class="cart-item-info">

              <h3>
                ${escapeHTML(item.name)}
              </h3>

              ${
                item.variantName
                  ? `
                    <div class="cart-item-variant">
                      ${escapeHTML(item.variantName)}
                    </div>
                  `
                  : ""
              }

              ${
                item.sku
                  ? `
                    <div class="cart-item-sku">
                      SKU: ${escapeHTML(item.sku)}
                    </div>
                  `
                  : ""
              }

              <strong>
                ${money(item.price)}
              </strong>

            </div>

            <div class="cart-item-controls">

              <button
                type="button"
                data-action="cart-minus"
                data-cart-key="${escapeHTML(item.key)}"
              >
                −
              </button>

              <span>
                ${Number(item.quantity || 0)}
              </span>

              <button
                type="button"
                data-action="cart-plus"
                data-cart-key="${escapeHTML(item.key)}"
              >
                +
              </button>

            </div>

            <div class="cart-item-total">
              ${money(total)}
            </div>

            <button
              class="cart-remove-button"
              type="button"
              data-action="cart-remove"
              data-cart-key="${escapeHTML(item.key)}"
              aria-label="حذف"
            >
              ×
            </button>

          </div>
        `;
      })
      .join("");

    const subtotal = getCartSubtotal();

    if (subtotalElement) {
      subtotalElement.textContent =
        money(subtotal);
    }

    if (totalElement) {
      totalElement.textContent =
        money(subtotal);
    }
  }

  /* =========================================================
     PRODUCT DETAILS
     ========================================================= */

  async function openProduct(productId) {
    const product = state.products.find(
      (item) =>
        String(item.id) ===
        String(productId)
    );

    if (!product) {
      const result = await api(
        `/products/${encodeURIComponent(productId)}`
      );

      if (result?.product) {
        state.currentProduct =
          result.product;
      } else {
        showToast("تعذر فتح المنتج");
        return;
      }
    } else {
      state.currentProduct = product;
    }

    renderProductDetails();

    navigate("product");
  }

  function renderProductDetails() {
    const product =
      state.currentProduct;

    const container =
      $("#productDetails");

    if (!product || !container) return;

    const image = productImage(product);
    const price = productPrice(product);
    const oldPrice = productOldPrice(product);
    const soldOut = isSoldOut(product);

    const variants =
      product.variants ||
      product.product_variants ||
      [];

    container.innerHTML = `
      <div class="product-details-layout">

        <div class="product-details-gallery">

          <div class="product-main-image">
            <img
              src="${escapeHTML(image)}"
              alt="${escapeHTML(product.name || "")}"
            >
          </div>

        </div>

        <div class="product-details-info">

          ${
            product.brand_name ||
            product.brand
              ? `
                <div class="product-brand">
                  ${escapeHTML(
                    product.brand_name ||
                    product.brand
                  )}
                </div>
              `
              : ""
          }

          <h1>
            ${escapeHTML(product.name || "منتج")}
          </h1>

          ${
            product.description
              ? `
                <div class="product-description">
                  ${escapeHTML(product.description)}
                </div>
              `
              : ""
          }

          <div class="product-details-price">

            <strong>
              ${money(price)}
            </strong>

            ${
              oldPrice > price
                ? `
                  <del>
                    ${money(oldPrice)}
                  </del>
                `
                : ""
            }

          </div>

          ${
            variants.length
              ? `
                <div class="variant-selector">
                  <label>
                    اختاري الخيار
                  </label>

                  <div class="variant-options">
                    ${variants
                      .map(
                        (variant, index) => `
                          <button
                            type="button"
                            class="variant-option ${
                              index === 0
                                ? "active"
                                : ""
                            }"
                            data-variant-id="${escapeHTML(
                              variant.id
                            )}"
                          >
                            ${escapeHTML(
                              variant.name ||
                              variant.color ||
                              variant.size ||
                              `الخيار ${index + 1}`
                            )}
                          </button>
                        `
                      )
                      .join("")}
                  </div>
                </div>
              `
              : ""
          }

          <div class="product-quantity">

            <button
              type="button"
              id="productQuantityMinus"
            >
              −
            </button>

            <input
              id="productQuantity"
              type="number"
              min="1"
              value="1"
            >

            <button
              type="button"
              id="productQuantityPlus"
            >
              +
            </button>

          </div>

          ${
            soldOut
              ? `
                <button
                  class="primary-button disabled"
                  disabled
                >
                  الكمية خلصت، حقك علينا
                </button>
              `
              : `
                <button
                  class="primary-button"
                  id="productAddToCart"
                  type="button"
                >
                  أضيفي للسلة 🛒
                </button>
              `
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
    const product = state.currentProduct;

    if (!product) return;

    const quantityInput =
      $("#productQuantity");

    const minus =
      $("#productQuantityMinus");

    const plus =
      $("#productQuantityPlus");

    const addButton =
      $("#productAddToCart");

    const favoriteButton =
      $("#productFavoriteButton");

    let selectedVariant = null;

    const variants =
      product.variants ||
      product.product_variants ||
      [];

    if (variants.length) {
      selectedVariant = variants[0];
    }

    $$(".variant-option").forEach((button) => {
      button.addEventListener("click", () => {
        $$(".variant-option").forEach((item) =>
          item.classList.remove("active")
        );

        button.classList.add("active");

        const variantId =
          button.dataset.variantId;

        selectedVariant =
          variants.find(
            (variant) =>
              String(variant.id) ===
              String(variantId)
          ) || null;
      });
    });

    minus?.addEventListener("click", () => {
      if (!quantityInput) return;

      const current =
        Number(quantityInput.value || 1);

      quantityInput.value =
        Math.max(1, current - 1);
    });

    plus?.addEventListener("click", () => {
      if (!quantityInput) return;

      const current =
        Number(quantityInput.value || 1);

      quantityInput.value =
        current + 1;
    });

    addButton?.addEventListener("click", () => {
      const quantity =
        Math.max(
          1,
          Number(quantityInput?.value || 1)
        );

      addToCart(
        product,
        quantity,
        selectedVariant
      );
    });

    favoriteButton?.addEventListener(
      "click",
      () => {
        toggleFavorite(product.id);

        if (favoriteButton) {
          favoriteButton.textContent =
            isFavorite(product.id)
              ? "♥ إزالة من المفضلة"
              : "♡ أضيفي للمفضلة";
        }
      }
    );
  }

  /* =========================================================
     CATEGORIES
     ========================================================= */

  function renderCategories() {
    const container =
      $("#categoriesGrid");

    if (!container) return;

    if (!state.categories.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛍️</div>
          <h3>التصنيفات قيد التجهيز</h3>
          <p>رح تظهر التصنيفات هون قريباً.</p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      state.categories
        .map((category) => {
          const image =
            category.image_url ||
            category.image ||
            "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=800&q=80";

          return `
            <button
              type="button"
              class="category-card"
              data-action="category"
              data-category-id="${escapeHTML(
                category.id
              )}"
            >

              <div class="category-image">
                <img
                  src="${escapeHTML(image)}"
                  alt="${escapeHTML(
                    category.name || ""
                  )}"
                  loading="lazy"
                >
              </div>

              <div class="category-card-content">
                <strong>
                  ${escapeHTML(
                    category.name || "تصنيف"
                  )}
                </strong>
              </div>

            </button>
          `;
        })
        .join("");
  }

  function openCategory(categoryId) {
    state.currentFilter = {
      category: categoryId
    };

    renderProducts();
    navigate("products");
  }

  /* =========================================================
     BRANDS
     ========================================================= */

  function renderBrands() {
    const container =
      $("#brandsGrid");

    if (!container) return;

    if (!state.brands.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✨</div>
          <h3>الماركات قيد التجهيز</h3>
          <p>رح تظهر الماركات هون قريباً.</p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      state.brands
        .map((brand) => {
          const image =
            brand.image_url ||
            brand.logo_url ||
            brand.image ||
            "";

          return `
            <button
              type="button"
              class="brand-card"
              data-action="brand"
              data-brand-id="${escapeHTML(
                brand.id
              )}"
            >

              ${
                image
                  ? `
                    <div class="brand-image">
                      <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(
                          brand.name || ""
                        )}"
                        loading="lazy"
                      >
                    </div>
                  `
                  : `
                    <div class="brand-placeholder">
                      ✦
                    </div>
                  `
              }

              <strong>
                ${escapeHTML(
                  brand.name || "ماركة"
                )}
              </strong>

            </button>
          `;
        })
        .join("");
  }

  function openBrand(brandId) {
    state.currentFilter = {
      brand: brandId
    };

    renderProducts();
    navigate("products");
  }

  /* =========================================================
     OFFERS
     ========================================================= */

  function renderOffers() {
    const container =
      $("#offersGrid");

    if (!container) return;

    const offers =
      state.offers.length
        ? state.offers
        : state.products.filter((product) => {
            const price = productPrice(product);
            const oldPrice =
              productOldPrice(product);

            return (
              oldPrice > price &&
              price > 0
            );
          });

    if (!offers.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎁</div>
          <h3>ما في عروض حالياً</h3>
          <p>تابعي الصفحة للعروض الجديدة.</p>
        </div>
      `;

      return;
    }

    container.innerHTML = offers
      .map((product) =>
        renderProductCard(product)
      )
      .join("");
  }

  /* =========================================================
     TOP FIVE / BEST SELLERS
     ========================================================= */

  function renderMiniSlider(
    container,
    products
  ) {
    if (!container) return;

    if (!products?.length) {
      container.innerHTML = `
        <div class="empty-state compact">
          <p>لسه ما في منتجات بهالقائمة.</p>
        </div>
      `;

      return;
    }

    container.innerHTML = `
      <div class="mini-slider-track">
        ${products
          .map((product) =>
            renderProductCard(product, {
              mini: true
            })
          )
          .join("")}
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
    const slides =
      state.heroSlides ||
      [];

    const container =
      $("#heroSlider");

    if (!container) return;

    if (!slides.length) {
      container.innerHTML = `
        <div class="hero-slide active">
          <div class="hero-slide-content">
            <span class="hero-kicker">
              Ladies First
            </span>

            <h1>
              لأنك أولاً
            </h1>

            <p>
              اكتشفي اختياراتنا من الأزياء
              والجمال والإكسسوارات.
            </p>

            <button
              type="button"
              class="primary-button"
              data-action="go-products"
            >
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
          state.heroIndex || 0,
          slides.length - 1
        )
      );

    container.innerHTML =
      slides
        .map((slide, slideIndex) => {
          const image =
            slide.image_url ||
            slide.image ||
            "";

          return `
            <div
              class="hero-slide ${
                slideIndex === index
                  ? "active"
                  : ""
              }"
              data-hero-index="${slideIndex}"
              style="${
                image
                  ? `background-image:url('${escapeHTML(
                      image
                    )}')`
                  : ""
              }"
            >

              <div class="hero-slide-overlay"></div>

              <div class="hero-slide-content">

                ${
                  slide.kicker
                    ? `
                      <span class="hero-kicker">
                        ${escapeHTML(
                          slide.kicker
                        )}
                      </span>
                    `
                    : ""
                }

                <h1>
                  ${escapeHTML(
                    slide.title ||
                    "لأنك أولاً"
                  )}
                </h1>

                ${
                  slide.subtitle
                    ? `
                      <p>
                        ${escapeHTML(
                          slide.subtitle
                        )}
                      </p>
                    `
                    : ""
                }

                <button
                  type="button"
                  class="primary-button"
                  data-action="hero-action"
                  data-hero-action="${
                    escapeHTML(
                      slide.action ||
                      "products"
                    )
                  }"
                >
                  ${escapeHTML(
                    slide.button_text ||
                    "تسوقي الآن"
                  )}
                </button>

              </div>
            </div>
          `;
        })
        .join("");

    renderHeroDots(slides.length);
  }

  function renderHeroDots(count) {
    const dots =
      $("#heroDots");

    if (!dots) return;

    if (count <= 1) {
      dots.innerHTML = "";
      return;
    }

    dots.innerHTML =
      Array.from(
        { length: count },
        (_, index) => `
          <button
            type="button"
            class="hero-dot ${
              index === state.heroIndex
                ? "active"
                : ""
            }"
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
      Number(state.heroIndex || 0) + 1
    );
  }

  function previousHero() {
    setHero(
      Number(state.heroIndex || 0) - 1
    );
  }

  function startHeroAutoPlay() {
    clearInterval(
      state.heroTimer
    );

    const slides =
      state.heroSlides || [];

    if (slides.length <= 1) return;

    state.heroTimer =
      setInterval(() => {
        nextHero();
      }, 6000);
  }

  /* =========================================================
     SEARCH
     ========================================================= */

  function performSearch(value) {
    state.currentFilter = {
      search: String(value || "").trim()
    };

    renderProducts();

    navigate("products");
  }

  function openSearch() {
    const search =
      $("#searchPanel");

    if (!search) {
      const value =
        window.prompt(
          "عن شو بدك تدوري؟"
        );

      if (value?.trim()) {
        performSearch(value);
      }

      return;
    }

    search.classList.add("open");

    const input =
      $("#searchInput");

    input?.focus();
  }

  function closeSearch() {
    $("#searchPanel")?.classList.remove(
      "open"
    );
  }

  /* =========================================================
     CHECKOUT
     ========================================================= */

  function renderCheckout() {
    const subtotal =
      getCartSubtotal();

    const subtotalElement =
      $("#checkoutSubtotal");

    const totalElement =
      $("#checkoutTotal");

    if (subtotalElement) {
      subtotalElement.textContent =
        money(subtotal);
    }

    if (totalElement) {
      totalElement.textContent =
        money(subtotal);
    }
  }
     /* =========================================================
     STORE / HOME DATA
     ========================================================= */

  async function loadStore() {
    const result = await api("/store/home");

    if (!result) {
      showToast("تعذر تحميل المتجر حالياً");
      return;
    }

    state.products =
      Array.isArray(result.products)
        ? result.products
        : [];

    state.categories =
      Array.isArray(result.categories)
        ? result.categories
        : [];

    state.brands =
      Array.isArray(result.brands)
        ? result.brands
        : [];

    state.offers =
      Array.isArray(result.offers)
        ? result.offers
        : [];

    state.topFive =
      Array.isArray(result.topFive)
        ? result.topFive
        : [];

    state.bestSellers =
      Array.isArray(result.bestSellers)
        ? result.bestSellers
        : [];

    state.heroSlides =
      Array.isArray(result.heroSlides)
        ? result.heroSlides
        : Array.isArray(result.hero)
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
  }

  /* =========================================================
     COMPLEMENTARY PRODUCTS
     ========================================================= */

  function getComplementaryProducts(product) {
    if (!product) return [];

    const explicit =
      product.complementary_products ||
      product.recommended_products ||
      product.recommendations;

    if (Array.isArray(explicit) && explicit.length) {
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

        if (
          categoryId &&
          String(item.category_id) ===
          String(categoryId)
        ) {
          return true;
        }

        if (
          brandId &&
          String(item.brand_id) ===
          String(brandId)
        ) {
          return true;
        }

        return false;
      })
      .slice(0, 6);
  }

  function renderComplementaryProducts(product) {
    const container =
      $("#complementaryProducts");

    if (!container) return;

    const products =
      getComplementaryProducts(product);

    if (!products.length) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
      <div class="section-heading">
        <div>
          <span class="section-kicker">
            يكمل اللوك
          </span>

          <h2>
            بيلبق معه ✨
          </h2>
        </div>
      </div>

      <div class="mini-slider-track">
        ${products
          .map((item) =>
            renderProductCard(item, {
              mini: true
            })
          )
          .join("")}
      </div>
    `;
  }

  /* =========================================================
     WHATSAPP
     ========================================================= */

  function getWhatsAppNumber() {
    return (
      state.settings?.whatsapp ||
      state.settings?.whatsapp_number ||
      ""
    );
  }

  function openWhatsApp(message = "") {
    const number =
      getWhatsAppNumber();

    const encoded =
      encodeURIComponent(message);

    const cleanNumber =
      String(number)
        .replace(/[^\d+]/g, "");

    const url = cleanNumber
      ? `https://wa.me/${cleanNumber.replace(
          /^\+/,
          ""
        )}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function shareProductWhatsApp(product) {
    if (!product) return;

    const price =
      money(productPrice(product));

    const message = [
      "🛍️ Ladies First",
      "",
      product.name || "منتج",
      `السعر: ${price}`,
      "",
      "شوفي المنتج على متجر Ladies First."
    ].join("\n");

    openWhatsApp(message);
  }

  function shareOfferWhatsApp(product) {
    if (!product) return;

    const price =
      money(productPrice(product));

    const oldPrice =
      productOldPrice(product);

    const message = [
      "🎁 عرض من Ladies First",
      "",
      product.name || "منتج",
      `السعر الحالي: ${price}`,
      oldPrice > productPrice(product)
        ? `السعر السابق: ${money(oldPrice)}`
        : "",
      "",
      "✨ لا تفوتي العرض!"
    ]
      .filter(Boolean)
      .join("\n");

    openWhatsApp(message);
  }

  /* =========================================================
     ORDER
     ========================================================= */

  async function submitOrder() {
    if (!state.cart.length) {
      showToast("السلة فاضية");
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

    if (!name || !phone) {
      showToast(
        "الاسم ورقم الهاتف مطلوبان"
      );
      return;
    }

    const subtotal =
      getCartSubtotal();

    const orderItems =
      state.cart.map((item) => ({
        product_id: item.productId,
        variant_id:
          item.variantId || null,
        quantity: Number(
          item.quantity || 1
        ),
        unit_price: Number(
          item.price || 0
        )
      }));

    const payload = {
      customer_name: name,
      customer_phone: phone,
      shipping_address:
        address || "",
      notes: notes || "",
      items: orderItems,
      subtotal,
      total: subtotal
    };

    const result =
      await api("/orders", {
        method: "POST",
        body: JSON.stringify(payload)
      });

    if (!result) {
      showToast(
        "تعذر إرسال الطلب حالياً"
      );
      return;
    }

    if (
      result.error === "OUT_OF_STOCK" ||
      result.code === "OUT_OF_STOCK"
    ) {
      showToast(
        "الكمية خلصت، حقك علينا"
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

    state.cart = [];

    saveState();
    updateCounters();
    renderCart();

    showToast(
      "تم إرسال طلبك بنجاح ❤️"
    );

    if (orderNumber) {
      const message = [
        "🛍️ طلب جديد من Ladies First",
        "",
        `رقم الطلب: ${orderNumber}`,
        `الاسم: ${name}`,
        `الهاتف: ${phone}`,
        `الإجمالي: ${money(subtotal)}`
      ].join("\n");

      openWhatsApp(message);
    }

    navigate("home");
  }

  /* =========================================================
     SETTINGS
     ========================================================= */

  async function loadSettings() {
    const result =
      await api("/settings");

    if (result) {
      state.settings =
        result.settings ||
        result;
    }
  }

  /* =========================================================
     ACCOUNT UI
     ========================================================= */

  function openAccount() {
    renderAccount();
    navigate("account");
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
          addToCart(product);
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
          navigate(actionName);
        } else {
          navigate("products");
        }

        break;
      }

      case "hero-dot": {
        const index =
          Number(element.dataset.index);

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
     INIT EVENTS
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
            const page =
              button.dataset.page;

            if (page) {
              navigate(page);
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
        () => navigate("favorites")
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
        openAccount
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
            $("#searchInput")?.value || "";

          if (value.trim()) {
            performSearch(value);
            closeSearch();
          }
        }
      );

    $("#searchInput")
      ?.addEventListener(
        "keydown",
        (event) => {
          if (
            event.key === "Enter"
          ) {
            const value =
              event.currentTarget.value;

            if (value.trim()) {
              performSearch(value);
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
            ?.classList.add("hidden");

          $("#registerForm")
            ?.classList.remove("hidden");
        }
      );

    $("#showLoginButton")
      ?.addEventListener(
        "click",
        () => {
          $("#registerForm")
            ?.classList.add("hidden");

          $("#loginForm")
            ?.classList.remove("hidden");
        }
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
          event.key === "Escape"
        ) {
          closeMobileMenu();
          closeSearch();
        }
      }
    );
  }

  /* =========================================================
     START APPLICATION
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
