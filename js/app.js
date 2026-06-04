/**
 * Charly Santa Milanga Club — Menú digital con carrito → WhatsApp
 */

const BADGE_LABELS = {
  promo: { class: "badge-promo", text: "Promo" },
  nuevo: { class: "badge-nuevo", text: "Nuevo" },
  "mas-pedido": { class: "badge-mas-pedido", text: "Más pedido" },
};

function resolveBasePath() {
  const { hostname, pathname } = window.location;
  if (hostname.endsWith("github.io")) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && !segments[0].includes(".")) {
      return `/${segments[0]}/`;
    }
  }
  const repo = document.querySelector('meta[name="github-pages-repo"]')?.content;
  if (repo && pathname.startsWith(`/${repo}`)) {
    return `/${repo}/`;
  }
  return "./";
}

const BASE = resolveBasePath();

function assetUrl(relativePath) {
  const clean = relativePath.replace(/^\.\//, "");
  return `${BASE}${clean}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(amount) {
  if (amount == null || amount === "") return "Consultar";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPriceForWhatsApp(item) {
  return item.price != null && item.price !== "" ? formatPrice(item.price) : "consultar precio";
}

function renderBadge(badgeKey) {
  if (!badgeKey || !BADGE_LABELS[badgeKey]) return "";
  const { class: cls, text } = BADGE_LABELS[badgeKey];
  return `<span class="badge ${cls}">${text}</span>`;
}

function renderStars(rating) {
  const full = Math.round(Math.min(5, Math.max(0, rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

async function loadJson(path) {
  const res = await fetch(assetUrl(path));
  if (!res.ok) throw new Error(`No se pudo cargar ${path}`);
  return res.json();
}

const CART_STORAGE_KEY = "csmc-cart-v1";

let state = {
  config: null,
  menuData: null,
  flatItems: [],
  categories: [],
};

/** @type {Map<string, { item: object, qty: number }>} */
const cart = new Map();

function flattenMenu(categories) {
  return categories.flatMap((cat) =>
    cat.items.map((item) => ({
      ...item,
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
    }))
  );
}

function getWhatsAppNumber() {
  return state.config?.whatsapp?.replace(/\D/g, "") || "";
}

function buildWhatsAppUrl(message) {
  const wa = getWhatsAppNumber();
  return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
}

function generalOrderMessage() {
  const name = state.config?.businessName || "Charly Santa Milanga Club";
  return `Hola! Quiero hacer un pedido desde el menú digital de *${name}*.`;
}

function applyConfig(config) {
  state.config = config;
  updateWhatsAppLinks();

  document.querySelectorAll("[data-phone]").forEach((el) => {
    el.href = `tel:${config.phone.replace(/\s/g, "")}`;
  });

  const map = {
    address: config.address,
    tagline: config.tagline,
    "hours-weekdays": config.hours.weekdays,
    "hours-weekend": config.hours.weekend,
    "phone-display": config.phone,
  };

  document.querySelectorAll("[data-config]").forEach((el) => {
    const key = el.getAttribute("data-config");
    if (map[key]) {
      el.textContent = map[key];
    } else {
      el.hidden = true;
    }
  });

  const storeMeta = document.querySelector(".store-meta");
  if (storeMeta && config.notes?.length) {
    config.notes.forEach((note) => {
      const li = document.createElement("li");
      li.className = "store-meta-note";
      li.textContent = note;
      storeMeta.appendChild(li);
    });
  }

  const mapsEl = document.querySelector("[data-maps]");
  if (mapsEl) mapsEl.src = config.mapsEmbed;

  const social = document.querySelector("[data-social]");
  if (social) {
    social.innerHTML = `
      <a href="${config.social.instagram}" target="_blank" rel="noopener noreferrer">Instagram</a>
      <a href="${config.social.facebook}" target="_blank" rel="noopener noreferrer">Facebook</a>
    `;
  }

  document.querySelector("[data-year]").textContent = new Date().getFullYear();

  const canonical = document.createElement("link");
  canonical.rel = "canonical";
  canonical.href = `https://${config.githubPages.owner}.github.io${config.githubPages.basePath}`;
  document.head.appendChild(canonical);

  const ogUrl = document.createElement("meta");
  ogUrl.setAttribute("property", "og:url");
  ogUrl.content = canonical.href;
  document.head.appendChild(ogUrl);
}

function renderBanner(banner) {
  const el = document.getElementById("promo-banner");
  if (!banner?.active) return;
  el.classList.remove("hidden");
  el.querySelector("[data-banner=title]").textContent = banner.title;
  el.querySelector("[data-banner=subtitle]").textContent = banner.subtitle;
}

function renderPromotions(promotions) {
  const section = document.querySelector("[data-promo-section]");
  const list = document.querySelector("[data-promo-list]");
  if (!section || !list || !promotions?.length) return;

  section.hidden = false;
  list.innerHTML = promotions
    .map(
      (p) => `
    <article class="promo-card">
      <img src="${escapeHtml(p.image)}" alt="" loading="lazy" width="88" height="66">
      <div>
        ${renderBadge(p.badge)}
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.description)}</p>
      </div>
    </article>
  `
    )
    .join("");
}

function renderAbout(about) {
  document.querySelector("[data-about=history]").textContent = about.history;
  document.querySelector("[data-about=mission]").textContent = about.mission;
  const gallery = document.querySelector("[data-about-gallery]");
  gallery.innerHTML = about.photos
    .map((src) => `<img src="${escapeHtml(src)}" alt="Foto del local" loading="lazy" width="400" height="400">`)
    .join("");
}

function renderReviews(reviews) {
  const container = document.querySelector("[data-reviews]");
  container.innerHTML = reviews
    .map(
      (r) => `
    <blockquote class="review-card">
      <div class="stars" aria-label="${r.rating} de 5 estrellas">${renderStars(r.rating)}</div>
      <p>"${escapeHtml(r.text)}"</p>
      <cite>— ${escapeHtml(r.name)}</cite>
    </blockquote>
  `
    )
    .join("");
}

const ORDER_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;

function getCartLineCount() {
  let n = 0;
  for (const { qty } of cart.values()) n += qty;
  return n;
}

function getCartSubtotal() {
  let total = 0;
  let hasPriced = false;
  for (const { item, qty } of cart.values()) {
    if (item.price != null) {
      total += item.price * qty;
      hasPriced = true;
    }
  }
  return hasPriced ? total : null;
}

function buildCartMessage() {
  const name = state.config?.businessName || "Charly Santa Milanga Club";
  const lines = [`Hola! Quiero hacer un pedido desde el menú digital de *${name}*:\n`];
  let hasConsult = false;

  for (const { item, qty } of cart.values()) {
    const unit = formatPriceForWhatsApp(item);
    const unitNote = item.price != null ? " c/u" : "";
    lines.push(`• ${qty}x *${item.name}* — ${unit}${unitNote}`);
    if (item.price == null) hasConsult = true;
  }

  const subtotal = getCartSubtotal();
  if (subtotal != null) lines.push(`\n*Total estimado:* ${formatPrice(subtotal)}`);
  if (hasConsult) lines.push("\n_Incluye productos a consultar precio._");
  lines.push("\n¡Gracias!");
  return lines.join("\n");
}

function saveCart() {
  try {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([...cart.entries()].map(([id, { qty }]) => ({ id, qty })))
    );
  } catch {
    /* ignore */
  }
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return;
    cart.clear();
    for (const { id, qty } of data) {
      const item = state.flatItems.find((i) => i.id === id);
      if (item && qty > 0) cart.set(id, { item, qty });
    }
  } catch {
    cart.clear();
  }
}

function addToCart(id) {
  const item = state.flatItems.find((i) => i.id === id);
  if (!item) return;
  const line = cart.get(id) || { item, qty: 0 };
  line.qty += 1;
  cart.set(id, line);
  saveCart();
  updateCartUI();
}

function setCartQty(id, qty) {
  if (qty <= 0) cart.delete(id);
  else {
    const line = cart.get(id);
    if (line) line.qty = qty;
  }
  saveCart();
  updateCartUI();
}

function clearCart() {
  cart.clear();
  saveCart();
  updateCartUI();
}

function updateWhatsAppLinks() {
  const url =
    cart.size > 0 ? buildWhatsAppUrl(buildCartMessage()) : buildWhatsAppUrl(generalOrderMessage());
  const hasItems = cart.size > 0;

  document.querySelectorAll("[data-whatsapp]").forEach((el) => {
    el.href = url;
  });

  for (const id of ["cart-checkout", "cart-wa-send"]) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.href = hasItems ? url : "#";
    el.classList.toggle("is-disabled", !hasItems);
  }
}

function syncMenuAddButtons() {
  document.querySelectorAll("[data-cart-add]").forEach((btn) => {
    const id = btn.dataset.cartAdd;
    const qty = cart.get(id)?.qty || 0;
    const name = btn.dataset.itemName || "producto";
    btn.classList.toggle("is-in-cart", qty > 0);
    btn.setAttribute(
      "aria-label",
      qty > 0 ? `Agregar otra ${name} al pedido` : `Agregar ${name} al pedido`
    );
    btn.innerHTML = qty > 0 ? `<span class="menu-item-qty">${qty}</span>` : ORDER_ICON;
  });
}

function renderCartDrawer() {
  const container = document.getElementById("cart-lines");
  if (!container) return;

  if (!cart.size) {
    container.innerHTML =
      `<p class="cart-empty">Tu pedido está vacío.<br> Tocá <strong>+</strong> en los platos para agregarlos.</p>`;
    return;
  }

  container.innerHTML = [...cart.values()]
    .map(({ item, qty }) => {
      const lineTotal = item.price != null ? formatPrice(item.price * qty) : "Consultar";
      return `
      <article class="cart-line" data-cart-line="${escapeHtml(item.id)}">
        <div class="cart-line-info">
          <h3>${escapeHtml(item.name)}</h3>
          <p class="cart-line-unit">${formatPrice(item.price)}${item.price != null ? " c/u" : ""}</p>
        </div>
        <div class="cart-line-actions">
          <div class="qty-control" role="group" aria-label="Cantidad">
            <button type="button" class="qty-btn" data-cart-qty="${escapeHtml(item.id)}" data-delta="-1" aria-label="Quitar uno">−</button>
            <span class="qty-value">${qty}</span>
            <button type="button" class="qty-btn" data-cart-qty="${escapeHtml(item.id)}" data-delta="1" aria-label="Agregar uno">+</button>
          </div>
          <p class="cart-line-total">${lineTotal}</p>
        </div>
      </article>`;
    })
    .join("");
}

function updateCartUI() {
  const count = getCartLineCount();
  const subtotal = getCartSubtotal();
  const hasItems = count > 0;

  const countEl = document.getElementById("cart-count");
  const labelEl = document.getElementById("cart-summary-label");
  const totalEl = document.getElementById("cart-summary-total");
  const checkoutLabel = document.getElementById("cart-checkout-label");
  const totalLine = document.getElementById("cart-total-line");
  const orderBar = document.getElementById("order-bar");

  if (countEl) {
    countEl.textContent = String(count);
    countEl.hidden = !hasItems;
  }
  if (labelEl) labelEl.textContent = hasItems ? `Ver pedido (${count})` : "Ver pedido";
  if (totalEl) {
    totalEl.textContent = subtotal != null ? formatPrice(subtotal) : hasItems ? "Consultar total" : "";
  }
  if (checkoutLabel) checkoutLabel.textContent = hasItems ? "Enviar" : "WhatsApp";
  if (totalLine) {
    totalLine.textContent = hasItems
      ? subtotal != null
        ? `Total estimado: ${formatPrice(subtotal)}`
        : "Algunos ítems requieren consultar precio"
      : "";
    totalLine.hidden = !hasItems;
  }
  if (orderBar) orderBar.classList.toggle("has-items", hasItems);

  renderCartDrawer();
  syncMenuAddButtons();
  updateWhatsAppLinks();
}

function openCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  if (!drawer) return;
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
  renderCartDrawer();
  drawer.querySelector(".cart-close")?.focus();
}

function closeCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  if (!drawer) return;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
}

function setupCart() {
  document.getElementById("cart-open")?.addEventListener("click", openCartDrawer);
  document.querySelectorAll("[data-cart-close]").forEach((el) => {
    el.addEventListener("click", closeCartDrawer);
  });
  document.getElementById("cart-clear")?.addEventListener("click", () => {
    if (cart.size && confirm("¿Vaciar todo el pedido?")) clearCart();
  });

  document.getElementById("cart-lines")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cart-qty]");
    if (!btn) return;
    const line = cart.get(btn.dataset.cartQty);
    if (line) setCartQty(btn.dataset.cartQty, line.qty + Number(btn.dataset.delta));
  });

  document.getElementById("cart-checkout")?.addEventListener("click", (e) => {
    if (!cart.size) {
      e.preventDefault();
      openCartDrawer();
    }
  });

  document.getElementById("cart-wa-send")?.addEventListener("click", (e) => {
    if (!cart.size) e.preventDefault();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCartDrawer();
  });

  const menuResults = document.getElementById("menu-results");
  if (menuResults && !menuResults.dataset.cartBound) {
    menuResults.dataset.cartBound = "true";
    menuResults.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cart-add]");
      if (!btn) return;
      addToCart(btn.dataset.cartAdd);
      btn.classList.add("just-added");
      setTimeout(() => btn.classList.remove("just-added"), 350);
    });
  }
}

function buildMenuItem(item) {
  const label = escapeHtml(item.name);
  const qty = cart.get(item.id)?.qty || 0;
  const btnContent = qty > 0 ? `<span class="menu-item-qty">${qty}</span>` : ORDER_ICON;

  const media = item.image
    ? `<div class="menu-item-media"><img src="${escapeHtml(item.image)}" alt="" loading="lazy"></div>`
    : `<div class="menu-item-media placeholder" aria-hidden="true">${item.categoryIcon || "🍽️"}</div>`;

  return `
    <article class="menu-item" data-id="${escapeHtml(item.id)}">
      ${media}
      <div class="menu-item-body">
        <div class="menu-item-top">
          <h4>${label}</h4>
          ${renderBadge(item.badge)}
        </div>
        <p class="menu-item-desc">${escapeHtml(item.description)}</p>
        <p class="menu-item-price${item.price == null ? " menu-item-price--consult" : ""}">${formatPrice(item.price)}</p>
      </div>
      <button
        type="button"
        class="menu-item-order${qty > 0 ? " is-in-cart" : ""}"
        data-cart-add="${escapeHtml(item.id)}"
        data-item-name="${label}"
        aria-label="${qty > 0 ? `Agregar otra ${label} al pedido` : `Agregar ${label} al pedido`}"
      >${btnContent}</button>
    </article>
  `;
}

function getFilteredItems() {
  const search = document.getElementById("search").value.trim().toLowerCase();
  let items = [...state.flatItems];

  if (search) {
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(search) ||
        i.description.toLowerCase().includes(search) ||
        i.categoryName.toLowerCase().includes(search)
    );
  }

  return items;
}

function renderMenu() {
  const container = document.getElementById("menu-results");
  const empty = document.getElementById("menu-empty");
  const nav = document.getElementById("category-nav");
  const items = getFilteredItems();
  const search = document.getElementById("search").value.trim();

  if (!items.length) {
    container.innerHTML = "";
    empty.classList.remove("hidden");
    if (nav) nav.classList.add("hidden");
    return;
  }

  empty.classList.add("hidden");
  if (nav) nav.classList.remove("hidden");

  if (search) {
    container.innerHTML = `
      <div class="menu-list">
        ${items.map(buildMenuItem).join("")}
      </div>
    `;
    syncMenuAddButtons();
    return;
  }

  const byCategory = new Map();
  for (const cat of state.categories) {
    const catItems = items.filter((i) => i.categoryId === cat.id);
    if (catItems.length) byCategory.set(cat.id, { ...cat, items: catItems });
  }

  container.innerHTML = [...byCategory.values()]
    .map(
      (cat) => `
      <section class="menu-category" id="cat-${escapeHtml(cat.id)}" data-category-id="${escapeHtml(cat.id)}">
        <h2 class="menu-category-title">${cat.icon} ${escapeHtml(cat.name)}</h2>
        <div class="menu-list">
          ${cat.items.map(buildMenuItem).join("")}
        </div>
      </section>
    `
    )
    .join("");

  syncMenuAddButtons();
}

function setupCategoryNav(categories) {
  const nav = document.getElementById("category-nav");
  if (!nav) return;

  nav.innerHTML = categories
    .map(
      (cat) => `
    <button type="button" class="category-nav-btn" data-category="${escapeHtml(cat.id)}">
      ${escapeHtml(cat.name)}
    </button>
  `
    )
    .join("");

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".category-nav-btn");
    if (!btn) return;
    const id = btn.dataset.category;
    const section = document.getElementById(`cat-${id}`);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveNavButton(id);
    }
  });

  setupCategoryScrollSpy(categories);
}

function setActiveNavButton(categoryId) {
  document.querySelectorAll(".category-nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === categoryId);
  });
}

function setupCategoryScrollSpy(categories) {
  const sections = categories
    .map((c) => document.getElementById(`cat-${c.id}`))
    .filter(Boolean);

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) {
        setActiveNavButton(visible.target.dataset.categoryId);
      }
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5] }
  );

  const observeSections = () => {
    document.querySelectorAll(".menu-category").forEach((el) => observer.observe(el));
  };

  observeSections();

  const menuResults = document.getElementById("menu-results");
  const mo = new MutationObserver(() => {
    observer.disconnect();
    observeSections();
  });
  mo.observe(menuResults, { childList: true });
}

function setupSearch() {
  document.getElementById("search").addEventListener("input", renderMenu);
}

function fixStaticAssetPaths() {
  document.querySelectorAll('link[href^="css/"], link[href^="assets/"]').forEach((el) => {
    const href = el.getAttribute("href");
    if (href && !href.startsWith("http")) el.href = assetUrl(href);
  });
  document.querySelectorAll(".store-logo, .footer-logo").forEach((logo) => {
    if (logo?.getAttribute("src")?.includes("assets/")) {
      logo.src = assetUrl("assets/logo.svg");
    }
  });
}

async function init() {
  try {
    fixStaticAssetPaths();

    const [config, menuData] = await Promise.all([
      loadJson("data/config.json"),
      loadJson("data/menu.json"),
    ]);

    state.menuData = menuData;
    state.categories = menuData.categories;
    state.flatItems = flattenMenu(menuData.categories);
    loadCart();

    applyConfig(config);
    setupCart();
    renderBanner(menuData.banner);
    renderPromotions(menuData.promotions);
    renderAbout(menuData.about);
    renderReviews(menuData.reviews);
    setupCategoryNav(menuData.categories);
    setupSearch();
    renderMenu();
    updateCartUI();

    if (menuData.categories[0]) {
      setActiveNavButton(menuData.categories[0].id);
    }

    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  } catch (err) {
    console.error(err);
    document.getElementById("menu-results").innerHTML =
      `<p class="menu-empty">Error al cargar el menú. Usá un servidor local o publicá en GitHub Pages.</p>`;
  }
}

init();
