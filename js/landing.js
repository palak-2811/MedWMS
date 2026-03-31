/* landing.js — Animations & interactions for index.html */
"use strict";

// ── Scroll reveal (lreveal + lstagger)
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.lreveal, .lstagger').forEach(el => io.observe(el));

// ── Count-up numbers
const countIO = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    let current = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.round(current) + suffix;
      if (current >= target) clearInterval(timer);
    }, 22);
    countIO.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(el => countIO.observe(el));

// ── Smooth-scroll for nav anchors
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ── Nav scroll shadow
const lnav = document.querySelector('.lnav');
window.addEventListener('scroll', () => {
  lnav.style.boxShadow = window.scrollY > 20 ? '0 4px 24px rgba(0,0,0,0.4)' : '';
}, { passive: true });
