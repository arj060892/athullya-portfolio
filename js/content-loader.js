const SITE_VERSION = window.__SITE_VERSION__ || "";

function withCacheBust(url) {
  if (!SITE_VERSION) return url;
  if (window.location && window.location.protocol === "file:") return url;
  if (!url || /^https?:\/\//i.test(url)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(SITE_VERSION)}`;
}

function normalizeItem(item) {
  if (!item) return { url: "" };
  return typeof item === "string" ? { url: item } : item;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clearById(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = "";
}

function renderAll(data) {
  clearById("dashboards-swiper-wrapper");
  clearById("images-swiper-wrapper");
  clearById("videos-swiper-wrapper");
  clearById("pdfs-swiper-wrapper");
  clearById("photo-gallery");

  renderDashboardsCarousel(data.dashboards || []);
  renderImagesCarousel(data.images || []);
  renderVideosCarousel(data.videos || []);
  renderPdfsCarousel(data.pdfs || []);
  renderPhotography(data.photos || []);
  initSwipers();
}

const INLINE_CONTENT = window.__CONTENT__ || null;

// When opened directly via `file://`, browsers often block fetch due to CORS.
if (window.location && window.location.protocol === "file:" && INLINE_CONTENT) {
  renderAll(INLINE_CONTENT);
} else {
  fetch(withCacheBust("data/content.json"), { cache: "no-store" })
    .then((res) => res.json())
    .then((data) => renderAll(data))
    .catch((err) => {
      if (INLINE_CONTENT) {
        console.warn("Fetch blocked; using inline content fallback.", err);
        renderAll(INLINE_CONTENT);
        return;
      }
      console.error("Content load error:", err);
    });
}

// ============================
// IMAGES CAROUSEL
// ============================
function renderImagesCarousel(items) {
  const wrapper = document.getElementById("images-swiper-wrapper");
  if (!wrapper) return;

  items.forEach((url) => {
    const src = withCacheBust(url);
    const slide = document.createElement("div");
    slide.className = "swiper-slide p-0";
    slide.innerHTML = `
      <div class="ratio ratio-4x3">
        <img src="${src}"
             loading="lazy"
             style="width:100%;height:100%;object-fit:cover;border-radius:14px;">
      </div>
    `;
    slide.onclick = () => openImageModal(src);
    wrapper.appendChild(slide);
  });
}

// ============================
// VIDEOS CAROUSEL
// ============================
function renderVideosCarousel(items) {
  const wrapper = document.getElementById("videos-swiper-wrapper");
  if (!wrapper) return;

  items.forEach((url) => {
    const slide = document.createElement("div");
    slide.className = "swiper-slide p-0";

    let inner = "";

    // YouTube
    if (url.includes("youtube") || url.includes("youtu.be")) {
      const id = getYouTubeId(url);
      inner = `
        <div class="ratio ratio-16x9">
          <iframe 
            src="https://www.youtube.com/embed/${id}" 
            allowfullscreen
            loading="lazy"
            style="border:none;width:100%;height:100%;border-radius:14px;">
          </iframe>
        </div>
      `;
    } else if (url.includes("instagram.com")) {
  inner = `
    <div class="ratio ratio-16x9">
      <div class="ig-simple-block"
           style="
             position:absolute;
             top:0;
             left:0;
             width:100%;
             height:100%;
             border-radius:18px;
             overflow:hidden;
             background: linear-gradient(135deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5);
             background-size: 300% 300%;
             animation: igGradient 6s ease infinite;
             display:flex;
             align-items:center;
             justify-content:center;
             cursor:pointer;
           ">
        
        <i class="bi bi-instagram" 
           style="
             font-size:72px;
             color:white;
             opacity:0.95;
             filter: drop-shadow(0 3px 10px rgba(0,0,0,0.5));
           ">
        </i>

      </div>
    </div>
  `;
}


    slide.innerHTML = inner;
    slide.addEventListener("click", () => {
      if (url.includes("instagram.com")) {
        window.open(url, "_blank");
      }
    });

    wrapper.appendChild(slide);
  });

  // Reprocess Instagram embeds
  if (window.instgrm && window.instgrm.Embeds) {
    window.instgrm.Embeds.process();
  }
}

function getInstagramThumbnail(url) {
  const match = url.match(/(?:reel|p)\/([^/?]+)/);
  if (!match) return null;

  const id = match[1];
  return `https://www.instagram.com/p/${id}/media/?size=l`;
}

// ============================
// DASHBOARDS CAROUSEL (PDF thumbnails via PDF.js)
// ============================
function renderDashboardsCarousel(items) {
  const wrapper = document.getElementById("dashboards-swiper-wrapper");
  if (!wrapper) return;

  items.forEach((raw) => {
    const item = normalizeItem(raw);
    const href = withCacheBust(item.url);

    const slide = document.createElement("div");
    slide.className = "swiper-slide p-0";

    const title = item.title ? escapeHtml(item.title) : "";
    const subtitle = item.subtitle ? escapeHtml(item.subtitle) : "";
    const tags = Array.isArray(item.tags) ? item.tags.map(escapeHtml) : [];

    slide.innerHTML = `
      <div class="work-thumb ratio ratio-4x3" role="button" aria-label="Open dashboard PDF">
        <object class="pdf-embed" data="${href}#page=1&zoom=page-width" type="application/pdf" aria-label="Dashboard preview">
          <div class="pdf-fallback">
            Preview not available. Click to open.
          </div>
        </object>
        <div class="work-meta">
          ${title ? `<div class="work-title">${title}</div>` : ""}
          ${subtitle ? `<div class="work-subtitle">${subtitle}</div>` : ""}
          ${
            tags.length
              ? `<div class="work-tags">${tags
                  .slice(0, 4)
                  .map((t) => `<span class="work-tag">${t}</span>`)
                  .join("")}</div>`
              : ""
          }
        </div>
      </div>
    `;

    wrapper.appendChild(slide);

    slide.onclick = () => openPdfModal(href);
  });
}

// ============================
// PDF CAROUSEL (thumbnail via PDF.js)
// ============================
function renderPdfsCarousel(items) {
  const wrapper = document.getElementById("pdfs-swiper-wrapper");
  if (!wrapper) return;

  items.forEach((raw) => {
    const item = normalizeItem(raw);
    const href = withCacheBust(item.url);
    const slide = document.createElement("div");
    slide.className = "swiper-slide p-0";

    const title = item.title ? escapeHtml(item.title) : "";
    const subtitle = item.subtitle ? escapeHtml(item.subtitle) : "";
    const tags = Array.isArray(item.tags) ? item.tags.map(escapeHtml) : [];
    const meta =
      title || subtitle || tags.length
        ? `
      <div class="work-meta">
        ${title ? `<div class="work-title">${title}</div>` : ""}
        ${subtitle ? `<div class="work-subtitle">${subtitle}</div>` : ""}
        ${
          tags.length
            ? `<div class="work-tags">${tags
                .slice(0, 4)
                .map((t) => `<span class="work-tag">${t}</span>`)
                .join("")}</div>`
            : ""
        }
      </div>
    `
        : "";

    slide.innerHTML = `
      <div class="work-thumb ratio ratio-4x3" role="button" aria-label="Open PDF">
        <canvas class="pdf-thumb" style="width:100%;border-radius:14px;"></canvas>
        ${meta}
      </div>
    `;

    wrapper.appendChild(slide);

    const canvas = slide.querySelector(".pdf-thumb");
    generatePdfThumbnail(href, canvas);

    slide.onclick = () => openPdfModal(href);
  });
}

// ============================
// PHOTOGRAPHY – Pinterest Grid
// ============================
function renderPhotography(items) {
  const gallery = document.getElementById("photo-gallery");
  if (!gallery) return;

  // Make sure it's not constrained by Bootstrap row
  gallery.classList.remove("row", "g-3");

  items.forEach((url) => {
    const src = withCacheBust(url);
    const img = document.createElement("img");
    img.src = src;
    img.loading = "lazy";
    img.style.width = "100%";
    img.style.marginBottom = "16px";
    img.style.borderRadius = "14px";
    img.style.cursor = "pointer";
    img.style.display = "inline-block";
    img.style.breakInside = "avoid";

    img.onclick = () => openImageModal(src);
    gallery.appendChild(img);
  });
}

// ============================
// SWIPER INIT
// ============================
function initSwipers() {
  const options = {
    spaceBetween: 20,
    slidesPerView: 1.15,
    loop: false,
    breakpoints: {
      640: { slidesPerView: 1.4 },
      768: { slidesPerView: 1.8 },
      1200: { slidesPerView: 2.3 },
    },
  };

  const init = (selector) => {
    const el = document.querySelector(selector);
    if (!el || el.swiper) return;

    const nextEl = el.querySelector(".swiper-button-next");
    const prevEl = el.querySelector(".swiper-button-prev");

    new Swiper(el, {
      ...options,
      navigation: nextEl && prevEl ? { nextEl, prevEl } : undefined,
    });
  };

  init("#dashboards-swiper");
  init("#images-swiper");
  init("#videos-swiper");
  init("#pdfs-swiper");
}

// ============================
// PDF.js Thumbnail + Modal
// ============================
function generatePdfThumbnail(pdfUrl, canvasEl) {
  if (!window.pdfjsLib || !canvasEl) {
    console.warn("pdfjsLib missing, skipping PDF thumbnail");
    return;
  }

  pdfjsLib
    .getDocument({
      url: pdfUrl,
      disableRange: window.location && window.location.protocol === "file:",
      disableStream: window.location && window.location.protocol === "file:",
    })
    .promise.then((pdf) => pdf.getPage(1))
    .then((page) => {
      const viewport = page.getViewport({ scale: 0.4 });
      const ctx = canvasEl.getContext("2d");
      canvasEl.width = viewport.width;
      canvasEl.height = viewport.height;
      return page.render({ canvasContext: ctx, viewport }).promise;
    })
    .catch((err) => console.error("PDF thumb error:", err));
}

function openPdfModal(url) {
  if (!window.pdfjsLib) {
    window.open(url, "_blank");
    return;
  }

  let modal = document.getElementById("pdfModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "pdfModal";
    modal.innerHTML = `
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content bg-dark">
          <button type="button" class="btn-close position-absolute end-0 m-3" data-bs-dismiss="modal"></button>
          <div class="modal-body p-2" style="max-height:80vh; overflow-y:auto;">
            <div id="pdfPagesContainer"
                 class="w-100 d-flex flex-column align-items-center">
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const pagesContainer = document.getElementById("pdfPagesContainer");
  pagesContainer.innerHTML = ""; // Clear previous pages

  pdfjsLib
    .getDocument({
      url,
      disableRange: window.location && window.location.protocol === "file:",
      disableStream: window.location && window.location.protocol === "file:",
    })
    .promise.then(async (pdf) => {
      console.log(`PDF loaded: ${pdf.numPages} pages`);

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.2 });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.marginBottom = "20px";
        canvas.style.borderRadius = "12px";

        const ctx = canvas.getContext("2d");

        await page.render({ canvasContext: ctx, viewport }).promise;

        pagesContainer.appendChild(canvas);
      }
    })
    .catch((err) => {
      console.error("Error loading multi-page PDF:", err);
      window.open(url, "_blank");
    });

  new bootstrap.Modal(modal).show();
}

// ============================
// IMAGE MODAL
// ============================
function openImageModal(url) {
  let modal = document.getElementById("imageModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "imageModal";
    modal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content bg-dark">
          <button type="button" class="btn-close position-absolute end-0 m-3" data-bs-dismiss="modal"></button>
          <div class="modal-body p-0 text-center">
            <img id="imageModalImg" src="" class="img-fluid rounded">
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById("imageModalImg").src = url;
  new bootstrap.Modal(modal).show();
}

// ============================
// HELPERS
// ============================
function getYouTubeId(url) {
  if (!url) return "";
  const match = url.match(/(youtu\.be\/|v=)([^&]+)/);
  return match ? match[2] : "";
}
