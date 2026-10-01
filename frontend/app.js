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
      const response = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
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
    favorites: "productsPage",
    orders: "ordersPage",
    account: "accountPage"
  };

  function showPage(page, options = {}) {
    const targetId = pageMap[page] || pageMap.home;

    $$(".page").forEach((section) => {
      section.classList.add("hidden");
      section.classList.remove("active");
    });

    const target = document.getElementById(targetId);

    if (target) {
      target.classList.remove("hidden");
      target.classList.add("active");
    }

    state.page = page;

    closeMobileMenu();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    if (page === "products") {
      renderProducts();
    }

    if (page === "categories") {
      renderCategories();
    }

    if (page === "brands") {
      renderBrands();
    }

    if (page === "offers") {
      renderOffers();
    }

    if (page === "bestsellers") {
      renderBestSellersPage();
    }

    if (page === "favorites") {
      renderFavorites();
    }

    if (options.productId) {
      openProduct(options.productId);
    }
  }

  function handleNavigationClick(event) {
    const button = event.target.closest("[data-page]");

    if (!button) return;

    event.preventDefault();

    const page = button.dataset.page;

    if (!page) return;

    const filter = button.dataset.filter;

    if (filter) {
      state.currentFilter = {
        type: filter
      };
    } else {
      state.currentFilter = {};
    }

    showPage(page);
  }

  /* =========================================================
     MOBILE MENU
     ========================================================= */

  function openMobileMenu() {
    const menu = $("#mobileMenu");
    const overlay = $("#pageOverlay");

    if (menu) menu.classList.remove("hidden");
    if (overlay) overlay.classList.remove("hidden");
  }

  function closeMobileMenu() {
    const menu = $("#mobileMenu");
    const overlay = $("#pageOverlay");

    if (menu) menu.classList.add("hidden");
    if (overlay) overlay.classList.add("hidden");
  }

  /* =========================================================
     SEARCH
     ========================================================= */

  function toggleSearch() {
    const panel = $("#searchPanel");

    if (!panel) return;

    panel.classList.toggle("hidden");

    if (!panel.classList.contains("hidden")) {
      const input = $("#globalSearch");

      if (input) {
        setTimeout(() => input.focus(), 100);
      }
    }
  }

  function performSearch() {
    const input = $("#globalSearch");

    if (!input) return;

    const query = input.value.trim();

    if (!query) {
      state.currentFilter = {};
      showPage("products");
      return;
    }

    state.currentFilter = {
      search: query
    };

    showPage("products");

    renderProducts();
  }

  /* =========================================================
     PRODUCTS
     ========================================================= */

  async function loadProducts() {
    const result = await api("/products");

    if (Array.isArray(result)) {
      state.products = result;
      return;
    }

    if (Array.isArray(result?.products)) {
      state.products = result.products;
      return;
    }

    state.products = [];
  }

  async function loadHomeData() {
    const result = await api("/store/home");

    if (!result) return;

    if (Array.isArray(result.products)) {
      state.products = result.products;
    }

    if (Array.isArray(result.topFive)) {
      state.topFive = result.topFive;
    }

    if (Array.isArray(result.bestSellers)) {
      state.bestSellers = result.bestSellers;
    }

    if (Array.isArray(result.offers)) {
      state.offers = result.offers;
    }

    if (Array.isArray(result.categories)) {
      state.categories = result.categories;
    }

    if (Array.isArray(result.brands)) {
      state.brands = result.brands;
    }

    if (Array.isArray(result.hero)) {
      renderHero(result.hero);
    }
  }

  function getProductId(product) {
    return (
      product.id ||
      product._id ||
      product.productId ||
      product.slug
    );
  }

  function getProductImage(product) {
    return (
      product.image ||
      product.imageUrl ||
      product.mainImage ||
      product.images?.[0] ||
      ""
    );
  }

  function getProductName(product) {
    return (
      product.name ||
      product.title ||
      "منتج"
    );
  }

  function getProductPrice(product) {
    return Number(
      product.salePrice ??
      product.price ??
      0
    );
  }

  function productCard(product) {
    const id = getProductId(product);
    const image = getProductImage(product);
    const name = getProductName(product);
    const price = getProductPrice(product);

    const oldPrice =
      product.oldPrice &&
      Number(product.oldPrice) > price
        ? Number(product.oldPrice)
        : null;

    const isFavorite = state.favorites.includes(String(id));

    const soldOut =
      product.soldOut === true ||
      product.stock === 0 ||
      product.available === false;

    return `
      <article class="product-card" data-product-id="${escapeHTML(id)}">

        <div class="product-image-wrap">

          ${
            image
              ? `<img
                  class="product-image"
                  src="${escapeHTML(image)}"
                  alt="${escapeHTML(name)}"
                  loading="lazy"
                >`
              : `<div class="product-image-placeholder">
                  Ladies First
                </div>`
          }

          <button
            type="button"
            class="favorite-button ${isFavorite ? "active" : ""}"
            data-favorite="${escapeHTML(id)}"
            aria-label="المفضلة"
          >
            ${isFavorite ? "♥" : "♡"}
          </button>

          ${
            soldOut
              ? `<span class="sold-out-badge">SOLD OUT</span>`
              : ""
          }

        </div>

        <div class="product-card-body">

          ${
            product.brand
              ? `<span class="product-brand">
                  ${escapeHTML(
                    typeof product.brand === "object"
                      ? product.brand.name
                      : product.brand
                  )}
                </span>`
              : ""
          }

          <h3 class="product-name">
            ${escapeHTML(name)}
          </h3>

          <div class="product-price">

            ${
              oldPrice
                ? `<span class="old-price">
                    ${money(oldPrice)}
                  </span>`
                : ""
            }

            <strong>
              ${money(price)}
            </strong>

          </div>

          <button
            type="button"
            class="product-open-button"
            data-product-open="${escapeHTML(id)}"
          >
            عرض المنتج
          </button>

        </div>

      </article>
    `;
  }

  function renderProductList(container, products) {
    if (!container) return;

    if (!products.length) {
      container.innerHTML = `
        <div class="empty-state">
          لا توجد منتجات حالياً
        </div>
      `;
      return;
    }

    container.innerHTML = products
      .map(productCard)
      .join("");
  }

  function renderProducts() {
    const grid = $("#productsGrid");

    if (!grid) return;

    let products = [...state.products];

    const filter = state.currentFilter || {};

    if (filter.type === "top5") {
      products = state.topFive.length
        ? [...state.topFive]
        : products.slice(0, 5);
    }

    if (filter.type === "bestsellers") {
      products = state.bestSellers.length
        ? [...state.bestSellers]
        : products;
    }

    if (filter.search) {
      const query = filter.search.toLowerCase();

      products = products.filter((product) => {
        const name = getProductName(product).toLowerCase();

        const brand =
          typeof product.brand === "object"
            ? product.brand?.name || ""
            : product.brand || "";

        const category =
          typeof product.category === "object"
            ? product.category?.name || ""
            : product.category || "";

        return (
          name.includes(query) ||
          String(brand).toLowerCase().includes(query) ||
          String(category).toLowerCase().includes(query)
        );
      });
    }

    const category = $("#filterCategory")?.value;

    if (category) {
      products = products.filter((product) => {
        const value =
          typeof product.category === "object"
            ? product.category?.id ||
              product.category?.name
            : product.category;

        return String(value) === String(category);
      });
    }

    const brand = $("#filterBrand")?.value;

    if (brand) {
      products = products.filter((product) => {
        const value =
          typeof product.brand === "object"
            ? product.brand?.id ||
              product.brand?.name
            : product.brand;

        return String(value) === String(brand);
      });
    }

    const minPrice = Number(
      $("#filterMinPrice")?.value || 0
    );

    const maxPrice = Number(
      $("#filterMaxPrice")?.value || 0
    );

    if (minPrice > 0) {
      products = products.filter(
        (product) => getProductPrice(product) >= minPrice
      );
    }

    if (maxPrice > 0) {
      products = products.filter(
        (product) => getProductPrice(product) <= maxPrice
      );
    }

    const sort = $("#sortProducts")?.value;

    if (sort === "price-low") {
      products.sort(
        (a, b) =>
          getProductPrice(a) - getProductPrice(b)
      );
    }

    if (sort === "price-high") {
      products.sort(
        (a, b) =>
          getProductPrice(b) - getProductPrice(a)
      );
    }

    if (sort === "newest") {
      products.sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      );
    }

    renderProductList(grid, products);
  }

  /* =========================================================
     HOME SLIDERS
     ========================================================= */

  function renderHomeSlider(id, products) {
    const container = document.getElementById(id);

    if (!container) return;

    renderProductList(container, products);
    enableHorizontalSlider(container);
  }

  function enableHorizontalSlider(container) {
    if (!container) return;

    container.style.overflowX = "auto";

    let startX = 0;
    let scrollStart = 0;

    container.addEventListener(
      "touchstart",
      (event) => {
        startX = event.touches[0].clientX;
        scrollStart = container.scrollLeft;
      },
      { passive: true }
    );

    container.addEventListener(
      "touchmove",
      (event) => {
        const currentX = event.touches[0].clientX;
        const difference = startX - currentX;

        container.scrollLeft = scrollStart + difference;
      },
      { passive: true }
    );
  }

  function renderHero(slides = []) {
    const slider = $("#heroSlider");
    const dots = $("#heroDots");

    if (!slider) return;

    if (!slides.length) {
      slider.innerHTML = `
        <div class="hero-slide hero-fallback">
          <div class="hero-content">
            <span>Ladies First</span>
            <h1>لأنك أولاً</h1>
            <p>اختاري ما يليق بك</p>
          </div>
        </div>
      `;

      if (dots) dots.innerHTML = "";
      return;
    }

    slider.innerHTML = slides
      .map((slide, index) => {
        const image =
          slide.image ||
          slide.imageUrl ||
          "";

        return `
          <article
            class="hero-slide ${index === 0 ? "active" : ""}"
            data-hero-index="${index}"
            style="${
              image
                ? `background-image:url('${escapeHTML(image)}')`
                : ""
            }"
          >
            <div class="hero-content">
              ${
                slide.eyebrow
                  ? `<span>${escapeHTML(slide.eyebrow)}</span>`
                  : ""
              }

              <h1>
                ${escapeHTML(
                  slide.title || "لأنك أولاً"
                )}
              </h1>

              ${
                slide.text
                  ? `<p>${escapeHTML(slide.text)}</p>`
                  : ""
              }

              ${
                slide.buttonText
                  ? `<button
                      type="button"
                      data-page="products"
                    >
                      ${escapeHTML(slide.buttonText)}
                    </button>`
                  : ""
              }
            </div>
          </article>
        `;
      })
      .join("");

    if (dots) {
      dots.innerHTML = slides
        .map(
          (_, index) => `
            <button
              type="button"
              class="${index === 0 ? "active" : ""}"
              data-hero-dot="${index}"
              aria-label="الشريحة ${index + 1}"
            ></button>
          `
        )
        .join("");
    }

    state.heroIndex = 0;
  }

  function changeHero(direction) {
    const slides = $$(".hero-slide", $("#heroSlider"));

    if (!slides.length) return;

    state.heroIndex += direction;

    if (state.heroIndex < 0) {
      state.heroIndex = slides.length - 1;
    }

    if (state.heroIndex >= slides.length) {
      state.heroIndex = 0;
    }

    slides.forEach((slide, index) => {
      slide.classList.toggle(
        "active",
        index === state.heroIndex
      );
    });

    $$("[data-hero-dot]").forEach((dot, index) => {
      dot.classList.toggle(
        "active",
        index === state.heroIndex
      );
    });
  }

  /* =========================================================
     CATEGORIES
     ========================================================= */

  async function loadCategories() {
    const result = await api("/categories");

    if (Array.isArray(result)) {
      state.categories = result;
    } else if (Array.isArray(result?.categories)) {
      state.categories = result.categories;
    }
  }

  function categoryCard(category) {
    const id =
      category.id ||
      category._id ||
      category.slug;

    const image =
      category.image ||
      category.imageUrl ||
      "";

    const name =
      category.name ||
      category.title ||
      "تصنيف";

    return `
      <button
        type="button"
        class="category-card"
        data-category-id="${escapeHTML(id)}"
      >
        ${
          image
            ? `<img
                src="${escapeHTML(image)}"
                alt="${escapeHTML(name)}"
                loading="lazy"
              >`
            : ""
        }

        <span>
          ${escapeHTML(name)}
        </span>
      </button>
    `;
  }

  function renderCategories() {
    const grids = [
      $("#homeCategories"),
      $("#categoriesGrid")
    ].filter(Boolean);

    grids.forEach((grid) => {
      if (!state.categories.length) {
        grid.innerHTML = `
          <div class="empty-state">
            لا توجد تصنيفات حالياً
          </div>
        `;
        return;
      }

      grid.innerHTML =
        state.categories
          .map(categoryCard)
          .join("");
    });
  }

  /* =========================================================
     BRANDS
     ========================================================= */

  async function loadBrands() {
    const result = await api("/brands");

    if (Array.isArray(result)) {
      state.brands = result;
    } else if (Array.isArray(result?.brands)) {
      state.brands = result.brands;
    }
  }

  function brandCard(brand) {
    const id =
      brand.id ||
      brand._id ||
      brand.slug;

    const image =
      brand.image ||
      brand.logo ||
      brand.imageUrl ||
      "";

    const name =
      brand.name ||
      brand.title ||
      "ماركة";

    return `
      <button
        type="button"
        class="brand-card"
        data-brand-id="${escapeHTML(id)}"
      >
        ${
          image
            ? `<img
                src="${escapeHTML(image)}"
                alt="${escapeHTML(name)}"
                loading="lazy"
              >`
            : `<span class="brand-placeholder">
                ${escapeHTML(name.charAt(0))}
              </span>`
        }

        <strong>
          ${escapeHTML(name)}
        </strong>
      </button>
    `;
  }

  function renderBrands() {
    const grids = [
      $("#homeBrands"),
      $("#brandsGrid")
    ].filter(Boolean);

    grids.forEach((grid) => {
      if (!state.brands.length) {
        grid.innerHTML = `
          <div class="empty-state">
            لا توجد ماركات حالياً
          </div>
        `;
        return;
      }

      grid.innerHTML =
        state.brands
          .map(brandCard)
          .join("");
    });
  }

  /* =========================================================
     OFFERS
     ========================================================= */

  function renderOffers() {
    const grid = $("#offersGrid");

    if (!grid) return;

    const products = state.offers.length
      ? state.offers
      : state.products.filter(
          (product) =>
            product.salePrice &&
            Number(product.salePrice) <
              Number(product.price || product.salePrice)
        );

    renderProductList(grid, products);
  }

  /* =========================================================
     BEST SELLERS
     ========================================================= */

  function renderBestSellersPage() {
    const products = state.bestSellers.length
      ? state.bestSellers
      : state.products;

    const grid = $("#productsGrid");

    if (!grid) return;

    renderProductList(grid, products);
  }

  /* =========================================================
     PRODUCT DETAILS
     ========================================================= */

  async function openProduct(id) {
    const details = $("#productDetails");

    if (!details) return;

    showPage("product");

    details.innerHTML = `
      <div class="loading">
        جاري تحميل المنتج...
      </div>
    `;

    const result = await api(
      `/products/${encodeURIComponent(id)}`
    );

    const product =
      result?.product ||
      result ||
      state.products.find(
        (item) =>
          String(getProductId(item)) === String(id)
      );

    if (!product) {
      details.innerHTML = `
        <div class="empty-state">
          المنتج غير موجود
        </div>
      `;
      return;
    }

    state.currentProduct = product;

     renderProductDetails(product);
  }

  /* =========================================================
     FAVORITES
     ========================================================= */

  function toggleFavorite(id) {
    const value = String(id);

    const index = state.favorites.indexOf(value);

    if (index >= 0) {
      state.favorites.splice(index, 1);
      showToast("تمت إزالة المنتج من المفضلة");
    } else {
      state.favorites.push(value);
      showToast("تمت إضافة المنتج إلى المفضلة");
    }

    saveState();
    updateCounters();

    renderProducts();
    renderHomeSliders();
  }

  function renderFavorites() {
    const grid = $("#productsGrid");

    if (!grid) return;

    const favorites = state.products.filter((product) =>
      state.favorites.includes(
        String(getProductId(product))
      )
    );

    renderProductList(grid, favorites);
  }

  /* =========================================================
     CART
     ========================================================= */

  function addToCart(product, quantity = 1, variantId = null) {
    const id = String(getProductId(product));

    const existing = state.cart.find(
      (item) =>
        String(item.productId) === id &&
        String(item.variantId || "") ===
          String(variantId || "")
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      state.cart.push({
        productId: id,
        variantId,
        quantity,
        name: getProductName(product),
        price: getProductPrice(product),
        image: getProductImage(product)
      });
    }

    saveState();
    updateCounters();

    showToast("تمت إضافة المنتج إلى السلة");
  }

  function removeFromCart(index) {
    state.cart.splice(index, 1);
    saveState();
    updateCounters();
    renderCartDrawer();
  }

  function updateCartQuantity(index, quantity) {
    const item = state.cart[index];

    if (!item) return;

    item.quantity = Math.max(
      1,
      Number(quantity || 1)
    );

    saveState();
    updateCounters();
    renderCartDrawer();
  }

  function getCartTotal() {
    return state.cart.reduce(
      (total, item) =>
        total +
        Number(item.price || 0) *
          Number(item.quantity || 0),
      0
    );
  }

  function openCart() {
    renderCartDrawer();

    const drawer = $("#cartDrawer");

    if (drawer) {
      drawer.classList.add("open");
    }
  }

  function closeCart() {
    const drawer = $("#cartDrawer");

    if (drawer) {
      drawer.classList.remove("open");
    }
  }

  function renderCartDrawer() {
    let drawer = $("#cartDrawer");

    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.id = "cartDrawer";
      drawer.className = "cart-drawer";

      document.body.appendChild(drawer);
    }

    if (!state.cart.length) {
      drawer.innerHTML = `
        <div class="cart-drawer-header">
          <h2>السلة</h2>
          <button type="button" data-close-cart>
            ×
          </button>
        </div>

        <div class="empty-state">
          السلة فارغة حالياً
        </div>
      `;

      return;
    }

    drawer.innerHTML = `
      <div class="cart-drawer-header">
        <h2>السلة</h2>

        <button type="button" data-close-cart>
          ×
        </button>
      </div>

      <div class="cart-items">

        ${state.cart
          .map(
            (item, index) => `
              <div class="cart-item">

                ${
                  item.image
                    ? `<img
                        src="${escapeHTML(item.image)}"
                        alt="${escapeHTML(item.name)}"
                      >`
                    : ""
                }

                <div class="cart-item-info">

                  <strong>
                    ${escapeHTML(item.name)}
                  </strong>

                  <span>
                    ${money(item.price)}
                  </span>

                  <div class="cart-item-actions">

                    <button
                      type="button"
                      data-cart-minus="${index}"
                    >
                      −
                    </button>

                    <span>
                      ${item.quantity}
                    </span>

                    <button
                      type="button"
                      data-cart-plus="${index}"
                    >
                      +
                    </button>

                    <button
                      type="button"
                      data-cart-remove="${index}"
                    >
                      حذف
                    </button>

                  </div>

                </div>

              </div>
            `
          )
          .join("")}

      </div>

      <div class="cart-total">
        <span>المجموع</span>
        <strong>${money(getCartTotal())}</strong>
      </div>

      <button
        type="button"
        class="primary-button"
        data-checkout
      >
        إتمام الطلب
      </button>
    `;
  }

  /* =========================================================
     COUNTERS
     ========================================================= */

  function updateCounters() {
    const cartCount = $("#cartCount");
    const favoritesCount = $("#favoritesCount");

    const cartItems = state.cart.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    );

    if (cartCount) {
      cartCount.textContent = cartItems;
    }

    if (favoritesCount) {
      favoritesCount.textContent =
        state.favorites.length;
    }
  }

  /* =========================================================
     TOAST
     ========================================================= */

  function showToast(message) {
    let container = $("#toastContainer");

    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";

      document.body.appendChild(container);
    }

    const toast = document.createElement("div");

    toast.className = "toast";
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");

      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  /* =========================================================
     CHECKOUT
     ========================================================= */

  async function checkout() {
    if (!state.cart.length) {
      showToast("السلة فارغة");
      return;
    }

    if (!state.user) {
      showToast("سجلي الدخول أولاً لإتمام الطلب");
      return;
    }

    const payload = {
      items: state.cart.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity
      }))
    };

    const result = await api("/orders", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!result) {
      showToast("تعذر إنشاء الطلب حالياً");
      return;
    }

    state.cart = [];
    saveState();
    updateCounters();
    closeCart();

    showToast("تم إنشاء طلبك بنجاح");

    if (result.order) {
      showPage("orders");
    }
  }

  /* =========================================================
     SOCIAL SHARE
     ========================================================= */

  function shareWhatsApp(product) {
    const id = getProductId(product);
    const name = getProductName(product);
    const price = getProductPrice(product);

    const url =
      `${location.origin}${location.pathname}` +
      `#product/${encodeURIComponent(id)}`;

    const text =
      `Ladies First\n` +
      `${name}\n` +
      `${money(price)}\n` +
      `${url}`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  /* =========================================================
     HOME RENDER
     ========================================================= */

  function renderHomeSliders() {
    renderHomeSlider(
      "topFiveSlider",
      state.topFive.length
        ? state.topFive
        : state.products.slice(0, 5)
    );

    renderHomeSlider(
      "bestSellersSlider",
      state.bestSellers.length
        ? state.bestSellers
        : state.products.slice(0, 5)
    );

    renderHomeSlider(
      "quickOffersSlider",
      state.offers.length
        ? state.offers
        : state.products.filter(
            (product) =>
              product.salePrice &&
              Number(product.salePrice) <
                Number(product.price || 0)
          )
    );

    renderHomeSlider(
      "completeLookSlider",
      []
    );
  }

  /* =========================================================
     FILTERS
     ========================================================= */

  function populateFilters() {
    const categorySelect = $("#filterCategory");
    const brandSelect = $("#filterBrand");

    if (categorySelect) {
      categorySelect.innerHTML =
        `<option value="">الكل</option>` +
        state.categories
          .map((category) => {
            const id =
              category.id ||
              category._id ||
              category.slug;

            return `
              <option value="${escapeHTML(id)}">
                ${escapeHTML(category.name || category.title || "")}
              </option>
            `;
          })
          .join("");
    }

    if (brandSelect) {
      brandSelect.innerHTML =
        `<option value="">الكل</option>` +
        state.brands
          .map((brand) => {
            const id =
              brand.id ||
              brand._id ||
              brand.slug;

            return `
              <option value="${escapeHTML(id)}">
                ${escapeHTML(brand.name || brand.title || "")}
              </option>
            `;
          })
          .join("");
    }
  }

  /* =========================================================
     EVENTS
     ========================================================= */

  function setupEvents() {
    document.addEventListener(
      "click",
      (event) => {
        const pageButton =
          event.target.closest("[data-page]");

        if (pageButton) {
          handleNavigationClick(event);
          return;
        }

        const favoriteButton =
          event.target.closest("[data-favorite]");

        if (favoriteButton) {
          event.preventDefault();

          toggleFavorite(
            favoriteButton.dataset.favorite
          );

          return;
        }

        const productButton =
          event.target.closest("[data-product-open]");

        if (productButton) {
          event.preventDefault();

          openProduct(
            productButton.dataset.productOpen
          );

          return;
        }

        const categoryButton =
          event.target.closest("[data-category-id]");

        if (categoryButton) {
          state.currentFilter = {
            category:
              categoryButton.dataset.categoryId
          };

          showPage("products");
          renderProducts();

          return;
        }

        const brandButton =
          event.target.closest("[data-brand-id]");

        if (brandButton) {
          state.currentFilter = {
            brand:
              brandButton.dataset.brandId
          };

          showPage("products");
          renderProducts();

          return;
        }

        const addButton =
          event.target.closest("[data-add-detail]");

        if (addButton) {
          const id =
            addButton.dataset.addDetail;

          const product =
            state.currentProduct ||
            state.products.find(
              (item) =>
                String(getProductId(item)) ===
                String(id)
            );

          if (!product) return;

          const quantity = Number(
            $("#productQuantity")?.value || 1
          );

          const variant =
            $(".variant-button.selected");

          const variantId =
            variant?.dataset.variantId ||
            null;

          addToCart(
            product,
            quantity,
            variantId
          );

          return;
        }

        const variantButton =
          event.target.closest(".variant-button");

        if (variantButton) {
          $$(".variant-button").forEach(
            (button) =>
              button.classList.remove("selected")
          );

          variantButton.classList.add("selected");

          return;
        }

        if (
          event.target.closest("[data-quantity-minus]")
        ) {
          const input = $("#productQuantity");

          if (input) {
            input.value = Math.max(
              1,
              Number(input.value || 1) - 1
            );
          }

          return;
        }

        if (
          event.target.closest("[data-quantity-plus]")
        ) {
          const input = $("#productQuantity");

          if (input) {
            input.value = Math.min(
              99,
              Number(input.value || 1) + 1
            );
          }

          return;
        }

        const removeButton =
          event.target.closest("[data-cart-remove]");

        if (removeButton) {
          removeFromCart(
            Number(removeButton.dataset.cartRemove)
          );

          return;
        }

        const minusButton =
          event.target.closest("[data-cart-minus]");

        if (minusButton) {
          const index =
            Number(minusButton.dataset.cartMinus);

          const item = state.cart[index];

          if (item) {
            updateCartQuantity(
              index,
              Number(item.quantity) - 1
            );
          }

          return;
        }

        const plusButton =
          event.target.closest("[data-cart-plus]");

        if (plusButton) {
          const index =
            Number(plusButton.dataset.cartPlus);

          const item = state.cart[index];

          if (item) {
            updateCartQuantity(
              index,
              Number(item.quantity) + 1
            );
          }

          return;
        }

        if (
          event.target.closest("[data-close-cart]")
        ) {
          closeCart();
          return;
        }

        if (
          event.target.closest("[data-checkout]")
        ) {
          checkout();
          return;
        }

        const heroDot =
          event.target.closest("[data-hero-dot]");

        if (heroDot) {
          state.heroIndex =
            Number(heroDot.dataset.heroDot);

          changeHero(0);
        }
      }
    );

    $("#mobileMenuButton")
      ?.addEventListener("click", openMobileMenu);

    $("#closeMobileMenu")
      ?.addEventListener("click", closeMobileMenu);

    $("#pageOverlay")
      ?.addEventListener("click", closeMobileMenu);

    $("#searchButton")
      ?.addEventListener("click", toggleSearch);

    $("#searchSubmit")
      ?.addEventListener("click", performSearch);

    $("#globalSearch")
      ?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          performSearch();
        }
      });

    $("#favoritesButton")
      ?.addEventListener("click", () => {
        showPage("favorites");
        renderFavorites();
      });

    $("#cartButton")
      ?.addEventListener("click", openCart);

    $("#accountButton")
      ?.addEventListener("click", () => {
        if (state.user) {
          showPage("account");
        } else {
          showToast("سجلي الدخول أو أنشئي حساباً");
        }
      });

    $("#heroPrev")
      ?.addEventListener("click", () =>
        changeHero(-1)
      );

    $("#heroNext")
      ?.addEventListener("click", () =>
        changeHero(1)
      );

    $("#filterButton")
      ?.addEventListener("click", () => {
        $("#filtersPanel")
          ?.classList.toggle("hidden");
      });

    $("#applyFilters")
      ?.addEventListener("click", () => {
        renderProducts();
      });

    $("#sortProducts")
      ?.addEventListener("change", () => {
        renderProducts();
      });
  }

  /* =========================================================
     HASH ROUTING
     ========================================================= */

  function handleHash() {
    const hash = location.hash.replace(/^#/, "");

    if (!hash) {
      showPage("home");
      return;
    }

    if (hash.startsWith("product/")) {
      const id = decodeURIComponent(
        hash.replace("product/", "")
      );

      openProduct(id);
      return;
    }

    const validPages = [
      "home",
      "products",
      "categories",
      "brands",
      "offers",
      "bestsellers",
      "favorites",
      "orders",
      "account"
    ];

    if (validPages.includes(hash)) {
      showPage(hash);
    }
  }

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  async function init() {
    setupEvents();

    updateCounters();
    updateGreeting();

    await Promise.allSettled([
      loadCurrentUser(),
      loadProducts(),
      loadCategories(),
      loadBrands(),
      loadHomeData()
    ]);

    populateFilters();
    renderCategories();
    renderBrands();
    renderHomeSliders();
    renderProducts();
    updateCounters();
    updateGreeting();

    handleHash();

    window.addEventListener(
      "hashchange",
      handleHash
    );

    setInterval(() => {
      if ($$(".hero-slide").length > 1) {
        changeHero(1);
      }
    }, 6000);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
