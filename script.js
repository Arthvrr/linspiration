/* ==========================================================================
   L'Inspiration – Fleuriste | Interactions & Horaires temps réel
   ========================================================================== */

(() => {
  "use strict";

  document.documentElement.classList.add("js-enabled");

  /* 1. Horaires d'ouverture en temps réel (Fuseau Europe/Brussels)
     ---------------------------------------------------------------------- */
  const SCHEDULE = {
    0: { name: "Dimanche", slots: [[10 * 60, 12 * 60 + 30]] },
    1: { name: "Lundi", slots: [[13 * 60, 18 * 60]] },
    2: { name: "Mardi", slots: [[10 * 60, 12 * 60], [13 * 60, 18 * 60]] },
    3: { name: "Mercredi", slots: [] },
    4: { name: "Jeudi", slots: [[13 * 60, 18 * 60]] },
    5: { name: "Vendredi", slots: [[10 * 60, 12 * 60], [13 * 60, 18 * 60]] },
    6: { name: "Samedi", slots: [[10 * 60, 18 * 60]] }
  };

  function formatMinutes(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h${m === 0 ? "00" : String(m).padStart(2, "0")}`;
  }

  function formatDaySlots(slots) {
    if (!slots.length) return "Fermé";
    return slots.map(([s, e]) => `${formatMinutes(s)} – ${formatMinutes(e)}`).join(" et ");
  }

  function getBrusselsNow() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Brussels",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(now);

    const map = {};
    parts.forEach((p) => {
      map[p.type] = p.value;
    });

    const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayIndex = weekdayMap[map.weekday] ?? now.getDay();
    const hour = parseInt(map.hour, 10);
    const minute = parseInt(map.minute, 10);

    return { dayIndex, minutes: hour * 60 + minute };
  }

  function computeStoreStatus() {
    const { dayIndex, minutes } = getBrusselsNow();
    const today = SCHEDULE[dayIndex];

    for (const [start, end] of today.slots) {
      if (minutes >= start && minutes < end) {
        return {
          isOpen: true,
          dayIndex,
          shortLabel: `Ouvert · ferme à ${formatMinutes(end)}`,
          longLabel: `Ouvert en ce moment · jusqu'à ${formatMinutes(end)}`,
          todayHours: `${today.name} : ${formatDaySlots(today.slots)}`
        };
      }
    }

    for (const [start] of today.slots) {
      if (minutes < start) {
        return {
          isOpen: false,
          dayIndex,
          shortLabel: `Fermé · ouvre à ${formatMinutes(start)}`,
          longLabel: `Actuellement fermé · ouvre aujourd'hui à ${formatMinutes(start)}`,
          todayHours: `${today.name} : ${formatDaySlots(today.slots)}`
        };
      }
    }

    for (let offset = 1; offset <= 7; offset++) {
      const nextDayIndex = (dayIndex + offset) % 7;
      const nextDay = SCHEDULE[nextDayIndex];
      if (nextDay.slots.length > 0) {
        const nextStart = formatMinutes(nextDay.slots[0][0]);
        const when = offset === 1 ? "demain" : nextDay.name.toLowerCase();
        return {
          isOpen: false,
          dayIndex,
          shortLabel: `Fermé · ouvre ${when} à ${nextStart}`,
          longLabel: `Actuellement fermé · ouvre ${when} à ${nextStart}`,
          todayHours: `${today.name} : ${formatDaySlots(today.slots)}`
        };
      }
    }

    return {
      isOpen: false,
      dayIndex,
      shortLabel: "Fermé",
      longLabel: "Actuellement fermé",
      todayHours: `${today.name} : ${formatDaySlots(today.slots)}`
    };
  }

  function updateOpeningStatus() {
    const status = computeStoreStatus();

    document.querySelectorAll(".js-open-status").forEach((el) => {
      el.classList.toggle("is-open", status.isOpen);
      el.classList.toggle("is-closed", !status.isOpen);
      const textEl = el.querySelector(".js-status-text");
      if (textEl) {
        textEl.textContent = el.dataset.statusFormat === "long" ? status.longLabel : status.shortLabel;
      }
    });

    document.querySelectorAll(".js-today-hours").forEach((el) => {
      el.textContent = status.todayHours;
    });

    document.querySelectorAll("[data-day-index]").forEach((row) => {
      const idx = parseInt(row.dataset.dayIndex, 10);
      row.classList.toggle("is-today", idx === status.dayIndex);
    });
  }

  updateOpeningStatus();
  setInterval(updateOpeningStatus, 60000);

  /* 2. Navigation sticky & Menu mobile
     ---------------------------------------------------------------------- */
  const navbar = document.querySelector(".navbar");
  const navToggle = document.querySelector(".navbar__toggle");
  const navMenu = document.querySelector(".navbar__menu");

  function handleScroll() {
    if (!navbar) return;
    navbar.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();

  function closeMobileMenu() {
    if (!navToggle || !navMenu) return;
    navMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      navMenu.classList.toggle("is-open", !expanded);
    });

    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMobileMenu);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMobileMenu();
    });
  }

  /* 3. Filtres de galerie & Lightbox accessible
     ---------------------------------------------------------------------- */
  const filterButtons = Array.from(document.querySelectorAll(".filter-btn"));
  const galleryCards = Array.from(document.querySelectorAll(".gallery-card"));
  const lightbox = document.getElementById("lightbox");

  if (filterButtons.length && galleryCards.length) {
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.dataset.filter;
        filterButtons.forEach((b) => {
          const active = b === btn;
          b.classList.toggle("is-active", active);
          b.setAttribute("aria-pressed", String(active));
        });

        galleryCards.forEach((card) => {
          const matches = filter === "all" || card.dataset.category === filter;
          card.classList.toggle("is-hidden", !matches);
        });
      });
    });
  }

  if (lightbox && galleryCards.length) {
    const lbImg = document.getElementById("lightbox-img");
    const lbCaption = document.getElementById("lightbox-caption");
    const lbCounter = document.getElementById("lightbox-counter");
    const btnClose = lightbox.querySelector(".lightbox__close");
    const btnPrev = lightbox.querySelector(".lightbox__prev");
    const btnNext = lightbox.querySelector(".lightbox__next");

    let activeItems = [];
    let currentIndex = 0;
    let lastFocused = null;

    function getVisibleCards() {
      return galleryCards.filter((card) => !card.classList.contains("is-hidden"));
    }

    function renderLightbox() {
      const card = activeItems[currentIndex];
      if (!card) return;
      const img = card.querySelector("img");
      const title = card.dataset.title || img?.alt || "";

      if (lbImg && img) {
        lbImg.src = img.getAttribute("src");
        lbImg.alt = title;
      }
      if (lbCaption) lbCaption.textContent = title;
      if (lbCounter) lbCounter.textContent = `${currentIndex + 1} / ${activeItems.length}`;
    }

    function openLightbox(card) {
      activeItems = getVisibleCards();
      currentIndex = Math.max(0, activeItems.indexOf(card));
      lastFocused = document.activeElement;
      renderLightbox();
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      if (btnClose) btnClose.focus();
    }

    function closeLightbox() {
      if (!lightbox.classList.contains("is-open")) return;
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }

    function stepLightbox(delta) {
      if (!activeItems.length) return;
      currentIndex = (currentIndex + delta + activeItems.length) % activeItems.length;
      renderLightbox();
    }

    galleryCards.forEach((card) => {
      const trigger = card.querySelector(".gallery-card__trigger");
      if (trigger) {
        trigger.addEventListener("click", () => openLightbox(card));
      }
    });

    if (btnClose) btnClose.addEventListener("click", closeLightbox);
    if (btnPrev) btnPrev.addEventListener("click", () => stepLightbox(-1));
    if (btnNext) btnNext.addEventListener("click", () => stepLightbox(1));

    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") stepLightbox(-1);
      if (e.key === "ArrowRight") stepLightbox(1);
    });
  }

  /* 4. Bouton Copier l'IBAN (avec fallback pour ouverture locale file://)
     ---------------------------------------------------------------------- */
  document.querySelectorAll(".js-copy-iban").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = btn.dataset.copy || "BE70731033256625";
      const label = btn.querySelector(".js-copy-label");
      const originalText = label ? label.textContent : "Copier l'IBAN";

      let copied = false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(value);
          copied = true;
        } catch {
          copied = false;
        }
      }

      if (!copied) {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          copied = true;
        } catch {
          copied = false;
        }
        document.body.removeChild(ta);
      }

      if (copied) {
        btn.classList.add("is-copied");
        if (label) label.textContent = "Copié !";
        setTimeout(() => {
          btn.classList.remove("is-copied");
          if (label) label.textContent = originalText;
        }, 2000);
      }
    });
  });

  /* 5. Apparition douce au scroll
     ---------------------------------------------------------------------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }
})();
