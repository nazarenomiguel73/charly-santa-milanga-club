/**
 * Charly Santa Milanga Club — Menú digital estilo carta online
 * Sin carrito: cada plato y el pedido general abren WhatsApp
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

let state = {
  config: null,
  menuData: null,
  flatItems: [],
  categories: [],
};

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

function itemOrderMessage(item) {
  const name = state.config?.businessName || "Charly Santa Milanga Club";
  return (
    `Hola! Vi el menú de *${name}* y me interesa:\n\n` +
    `• *${item.name}* — ${formatPriceForWhatsApp(item)}`
  );
}

function applyConfig(config) {
  state.config = config;
  const waUrl = buildWhatsAppUrl(generalOrderMessage());

  document.querySelectorAll("[data-whatsapp]").forEach((el) => {
    el.href = waUrl;
  });

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

function buildMenuItem(item) {
  const waUrl = buildWhatsAppUrl(itemOrderMessage(item));
  const label = escapeHtml(item.name);

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
      <a
        class="menu-item-order"
        href="${waUrl}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Pedir ${label} por WhatsApp"
      >${ORDER_ICON}</a>
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

    applyConfig(config);
    renderBanner(menuData.banner);
    renderPromotions(menuData.promotions);
    renderAbout(menuData.about);
    renderReviews(menuData.reviews);
    setupCategoryNav(menuData.categories);
    setupSearch();
    renderMenu();

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
