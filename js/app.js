/**
 * Charly Santa Milanga Club — Menú digital
 * Datos desde JSON (listo para panel admin futuro)
 * Compatible con GitHub Pages: https://nazarenomiguel73.github.io/charly-santa-milanga-club/
 */

const BADGE_LABELS = {
  promo: { class: "badge-promo", text: "Promo" },
  nuevo: { class: "badge-nuevo", text: "Nuevo" },
  "mas-pedido": { class: "badge-mas-pedido", text: "Más pedido" },
};

/** Base path para GitHub Pages (proyecto) o vacío en local / dominio raíz */
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

function formatPrice(amount) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
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

function applyConfig(config) {
  state.config = config;
  const wa = config.whatsapp.replace(/\D/g, "");
  const waMsg = encodeURIComponent("Hola! Vi el menú digital de Charly Santa Milanga Club.");
  const waUrl = `https://wa.me/${wa}?text=${waMsg}`;

  document.querySelectorAll("[data-whatsapp]").forEach((el) => {
    el.href = waUrl;
  });

  document.querySelectorAll("[data-phone]").forEach((el) => {
    el.href = `tel:${config.phone.replace(/\s/g, "")}`;
  });

  const map = {
    address: config.address,
    "hours-weekdays": config.hours.weekdays,
    "hours-weekend": config.hours.weekend,
    phone: "WhatsApp disponible",
    "phone-display": config.phone,
  };

  document.querySelectorAll("[data-config]").forEach((el) => {
    const key = el.getAttribute("data-config");
    if (map[key]) el.textContent = map[key];
  });

  const mapsEl = document.querySelector("[data-maps]");
  if (mapsEl) mapsEl.src = config.mapsEmbed;

  const social = document.querySelector("[data-social]");
  if (social) {
    social.innerHTML = `
      <a href="${config.social.instagram}" target="_blank" rel="noopener noreferrer">Instagram</a>
      <a href="${config.social.facebook}" target="_blank" rel="noopener noreferrer">Facebook</a>
      <a href="https://github.com/${config.githubPages.owner}/${config.githubPages.repo}" target="_blank" rel="noopener noreferrer">GitHub</a>
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

function renderCarousel(promotions) {
  const track = document.querySelector("[data-carousel-track]");
  const dots = document.querySelector("[data-carousel-dots]");
  if (!track || !promotions?.length) return;

  track.innerHTML = promotions
    .map(
      (p) => `
    <article class="promo-slide">
      <img src="${p.image}" alt="" loading="lazy" width="800" height="450">
      <div class="promo-slide-body">
        ${renderBadge(p.badge)}
        <h3>${p.title}</h3>
        <p>${p.description}</p>
      </div>
    </article>
  `
    )
    .join("");

  dots.innerHTML = promotions
    .map((_, i) => `<button type="button" class="carousel-dot${i === 0 ? " active" : ""}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`)
    .join("");

  initCarousel(track, dots);
}

function initCarousel(track, dotsContainer) {
  const slides = [...track.querySelectorAll(".promo-slide")];
  let index = 0;
  let timer;

  const goTo = (i) => {
    index = (i + slides.length) % slides.length;
    const slide = slides[index];
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: "smooth" });
    dotsContainer.querySelectorAll(".carousel-dot").forEach((d, j) => {
      d.classList.toggle("active", j === index);
    });
  };

  const startAuto = () => {
    clearInterval(timer);
    timer = setInterval(() => goTo(index + 1), 5000);
  };

  dotsContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".carousel-dot");
    if (!btn) return;
    goTo(Number(btn.dataset.index));
    startAuto();
  });

  document.querySelector(".carousel-prev")?.addEventListener("click", () => {
    goTo(index - 1);
    startAuto();
  });
  document.querySelector(".carousel-next")?.addEventListener("click", () => {
    goTo(index + 1);
    startAuto();
  });

  startAuto();
}

function renderAbout(about) {
  document.querySelector("[data-about=history]").textContent = about.history;
  document.querySelector("[data-about=mission]").textContent = about.mission;
  const gallery = document.querySelector("[data-about-gallery]");
  gallery.innerHTML = about.photos
    .map((src) => `<img src="${src}" alt="Foto del local" loading="lazy" width="400" height="400">`)
    .join("");
}

function renderReviews(reviews) {
  const container = document.querySelector("[data-reviews]");
  container.innerHTML = reviews
    .map(
      (r) => `
    <blockquote class="review-card">
      <div class="stars" aria-label="${r.rating} de 5 estrellas">${renderStars(r.rating)}</div>
      <p>"${r.text}"</p>
      <cite>— ${r.name}</cite>
    </blockquote>
  `
    )
    .join("");
}

function buildProductCard(item) {
  const imageBlock = item.image
    ? `<div class="product-card-image"><img src="${item.image}" alt="" loading="lazy"></div>`
    : `<div class="product-card-image placeholder" aria-hidden="true">${item.categoryIcon || "🍽️"}</div>`;

  return `
    <article class="product-card" data-id="${item.id}">
      ${imageBlock}
      <div class="product-card-body">
        <div class="card-badges">${renderBadge(item.badge)}</div>
        <div class="product-card-header">
          <h4>${item.name}</h4>
          <span class="price">${formatPrice(item.price)}</span>
        </div>
        <p class="description">${item.description}</p>
      </div>
    </article>
  `;
}

function getFilteredItems() {
  const search = document.getElementById("search").value.trim().toLowerCase();
  const category = document.getElementById("category-filter").value;
  const sort = document.getElementById("sort-price").value;

  let items = [...state.flatItems];

  if (category) {
    items = items.filter((i) => i.categoryId === category);
  }

  if (search) {
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(search) ||
        i.description.toLowerCase().includes(search) ||
        i.categoryName.toLowerCase().includes(search)
    );
  }

  if (sort === "asc") items.sort((a, b) => a.price - b.price);
  if (sort === "desc") items.sort((a, b) => b.price - a.price);

  return items;
}

function renderMenu() {
  const container = document.getElementById("menu-results");
  const empty = document.getElementById("menu-empty");
  const items = getFilteredItems();
  const sort = document.getElementById("sort-price").value;
  const categoryFilter = document.getElementById("category-filter").value;

  if (!items.length) {
    container.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  if (sort || categoryFilter) {
    container.innerHTML = `<div class="product-grid">${items.map(buildProductCard).join("")}</div>`;
    return;
  }

  const byCategory = new Map();
  for (const item of items) {
    if (!byCategory.has(item.categoryId)) {
      byCategory.set(item.categoryId, { name: item.categoryName, icon: item.categoryIcon, items: [] });
    }
    byCategory.get(item.categoryId).items.push(item);
  }

  container.innerHTML = [...byCategory.values()]
    .map(
      (cat) => `
      <section class="menu-category" id="cat-${cat.name.replace(/\s+/g, "-").toLowerCase()}">
        <h3>${cat.icon} ${cat.name}</h3>
        <div class="product-grid">${cat.items.map(buildProductCard).join("")}</div>
      </section>
    `
    )
    .join("");
}

function setupFilters(categories) {
  const select = document.getElementById("category-filter");
  const chips = document.getElementById("category-chips");

  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.name;
    select.appendChild(opt);

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = `${cat.icon} ${cat.name}`;
    chip.dataset.category = cat.id;
    chip.addEventListener("click", () => {
      const active = chip.classList.contains("active");
      chips.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      if (active) {
        select.value = "";
      } else {
        chip.classList.add("active");
        select.value = cat.id;
      }
      renderMenu();
      document.getElementById("menu").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    chips.appendChild(chip);
  });

  select.addEventListener("change", () => {
    const val = select.value;
    chips.querySelectorAll(".chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.category === val);
    });
    renderMenu();
  });

  document.getElementById("search").addEventListener("input", renderMenu);
  document.getElementById("sort-price").addEventListener("change", renderMenu);
}

function fixStaticAssetPaths() {
  document.querySelectorAll('link[href^="css/"], link[href^="assets/"]').forEach((el) => {
    const href = el.getAttribute("href");
    if (href && !href.startsWith("http")) el.href = assetUrl(href);
  });
  const logo = document.querySelector(".logo");
  if (logo?.src && logo.src.includes("/assets/")) {
    logo.src = assetUrl("assets/logo.svg");
  }
}

async function init() {
  try {
    fixStaticAssetPaths();

    const [config, menuData] = await Promise.all([
      loadJson("data/config.json"),
      loadJson("data/menu.json"),
    ]);

    state.menuData = menuData;
    state.flatItems = flattenMenu(menuData.categories);

    applyConfig(config);
    renderBanner(menuData.banner);
    renderCarousel(menuData.promotions);
    renderAbout(menuData.about);
    renderReviews(menuData.reviews);
    setupFilters(menuData.categories);
    renderMenu();

    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  } catch (err) {
    console.error(err);
    document.getElementById("menu-results").innerHTML =
      `<p class="menu-empty">Error al cargar el menú. Si abrís el archivo directamente, usá un servidor local o publicá en GitHub Pages.</p>`;
  }
}

init();
