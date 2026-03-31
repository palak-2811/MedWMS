"use strict";

/* ================================================================
   animations.js — Scroll Reveal & Advanced Animations
   
   ADVANCED JS CONCEPTS:
   - Intersection Observer API (scroll-triggered animations)
   - Web Animations API (element.animate())
   - ResizeObserver for responsive handling
   - Performance-optimized with requestAnimationFrame
   ================================================================ */

/* ================================================================
   SECTION 1: INTERSECTION OBSERVER — Scroll Reveal
   Automatically animates elements with .reveal class on scroll.
   ================================================================ */

function initScrollReveal() {
  const reveals = document.querySelectorAll(".reveal, .reveal-left");
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        // Stagger children if parent has reveal-stagger
        const parent = entry.target.closest(".reveal-stagger");
        if (parent) {
          [...parent.children].forEach((child, i) => {
            setTimeout(() => child.classList.add("visible"), i * 80);
          });
        }
        // Unobserve after animation (one-time reveal)
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: "0px 0px -40px 0px"
  });

  reveals.forEach(el => observer.observe(el));
}

/* ================================================================
   SECTION 2: STAT CARD ENTRANCE ANIMATION
   Uses Web Animations API for staggered card entrances.
   ================================================================ */

function animateStatCards() {
  const cards = document.querySelectorAll(".stat-card");
  
  cards.forEach((card, i) => {
    card.animate([
      { opacity: 0, transform: "translateY(20px) scale(0.95)" },
      { opacity: 1, transform: "translateY(0) scale(1)" }
    ], {
      duration: 500,
      easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      delay: i * 100,
      fill: "forwards"
    });
  });
}

/* ================================================================
   SECTION 3: CHART CARD ENTRANCE
   ================================================================ */

function animateChartCards() {
  const cards = document.querySelectorAll(".chart-card");
  
  cards.forEach((card, i) => {
    card.animate([
      { opacity: 0, transform: "translateY(24px)" },
      { opacity: 1, transform: "translateY(0)" }
    ], {
      duration: 600,
      easing: "ease-out",
      delay: 400 + i * 150,
      fill: "forwards"
    });
  });
}

/* ================================================================
   SECTION 4: TABLE ROW ENTRANCE ANIMATION
   Staggered fade-in for data table rows.
   ================================================================ */

function animateTableRows(tableId) {
  const tbody = document.getElementById(tableId);
  if (!tbody) return;

  const rows = tbody.querySelectorAll("tr:not(.empty-row)");
  rows.forEach((row, i) => {
    row.animate([
      { opacity: 0, transform: "translateX(-12px)" },
      { opacity: 1, transform: "translateX(0)" }
    ], {
      duration: 300,
      easing: "ease-out",
      delay: i * 40,
      fill: "forwards"
    });
  });
}

/* ================================================================
   SECTION 5: PANEL HOVER TILT EFFECT
   Subtle 3D tilt on hover using mousemove tracking.
   ================================================================ */

function initPanelTilt() {
  document.querySelectorAll(".stat-card").forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -3;
      const rotateY = ((x - centerX) / centerX) * 3;
      
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

/* ================================================================
   SECTION 6: LOADING SKELETON
   Show/hide skeleton loading states.
   ================================================================ */

function showSkeleton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="padding: 20px; display: flex; flex-direction: column; gap: 12px;">
      <div class="skeleton" style="height: 16px; width: 60%;"></div>
      <div class="skeleton" style="height: 40px; width: 100%;"></div>
      <div class="skeleton" style="height: 16px; width: 80%;"></div>
      <div class="skeleton" style="height: 16px; width: 45%;"></div>
    </div>
  `;
}

/* ================================================================
   SECTION 7: NUMBER PARTICLE EFFECT
   Spawns floating particles when stat changes (visual flair).
   ================================================================ */

function spawnParticles(element, count = 5) {
  const rect = element.getBoundingClientRect();

  for (let i = 0; i < count; i++) {
    const particle = document.createElement("div");
    particle.style.cssText = `
      position: fixed;
      width: 4px; height: 4px;
      background: var(--brand);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      left: ${rect.left + rect.width / 2 + (Math.random() - 0.5) * 30}px;
      top: ${rect.top + rect.height / 2}px;
    `;
    document.body.appendChild(particle);

    particle.animate([
      { transform: "translateY(0) scale(1)", opacity: 1 },
      { 
        transform: `translateY(${-30 - Math.random() * 40}px) translateX(${(Math.random() - 0.5) * 40}px) scale(0)`,
        opacity: 0
      }
    ], {
      duration: 600 + Math.random() * 400,
      easing: "ease-out",
      fill: "forwards"
    }).onfinish = () => particle.remove();
  }
}

/* ================================================================
   SECTION 8: BOOTSTRAP — Initialize all animations
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // Intersection Observer for scroll reveals
  initScrollReveal();

  // Dashboard animations
  if (document.getElementById("adminOrdersBody")) {
    animateStatCards();
    setTimeout(animateChartCards, 200);
    setTimeout(() => animateTableRows("adminOrdersBody"), 600);
    initPanelTilt();
  }

  // Track page animations
  if (document.getElementById("trackSection")) {
    setTimeout(() => animateTableRows("recentOrdersBody"), 300);
  }

  // Bill page animations
  if (document.getElementById("billSelectorBody")) {
    setTimeout(() => animateTableRows("billSelectorBody"), 300);
  }
});
