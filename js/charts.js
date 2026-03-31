"use strict";

/* ================================================================
   charts.js — Canvas-Based Dashboard Charts
   
   ADVANCED JS CONCEPTS:
   - Canvas API (2D context, arcs, gradients, text rendering)
   - requestAnimationFrame for smooth entry animations
   - Easing functions (ease-out cubic)
   - Dynamic color reading from CSS custom properties
   - Mouse event handling for interactive tooltips
   ================================================================ */

/**
 * Render both dashboard charts.
 * Called on page load and when data changes.
 */
function renderCharts() {
  const distribution = store.getStatusDistribution();
  const revenue = store.getRevenueByRetailer();

  drawDoughnutChart("doughnutChart", distribution);
  drawBarChart("barChart", revenue);
}

/* ----------------------------------------------------------------
   DOUGHNUT CHART — Animated segments with center label
   ---------------------------------------------------------------- */

function drawDoughnutChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Handle high-DPI displays
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const centerX = W / 2;
  const centerY = H / 2;
  const radius = Math.min(W, H) / 2 - 30;
  const innerRadius = radius * 0.6;
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getCSS("--text-4");
    ctx.font = "500 14px Outfit";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No orders yet", centerX, centerY);
    return;
  }

  let animProgress = 0;

  function animate() {
    animProgress = Math.min(animProgress + 0.025, 1);
    const eased = 1 - Math.pow(1 - animProgress, 3);

    ctx.clearRect(0, 0, W, H);

    let startAngle = -Math.PI / 2;

    data.forEach((d, i) => {
      if (d.value === 0) return;
      const sliceAngle = (d.value / total) * Math.PI * 2 * eased;

      // Draw arc segment
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = d.color;
      ctx.fill();

      // Segment shadow for depth
      ctx.shadowColor = "rgba(0,0,0,0.1)";
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // Label on segment (when animation is near complete)
      if (eased > 0.8 && d.value > 0) {
        const midAngle = startAngle + sliceAngle / 2;
        const labelR = (radius + innerRadius) / 2;
        const lx = centerX + Math.cos(midAngle) * labelR;
        const ly = centerY + Math.sin(midAngle) * labelR;

        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px Outfit";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d.value, lx, ly);
      }

      startAngle += sliceAngle;
    });

    // Center circle & text
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 2, 0, Math.PI * 2);
    ctx.fillStyle = getCSS("--surface") || "#fff";
    ctx.fill();

    ctx.fillStyle = getCSS("--text-1") || "#111827";
    ctx.font = "bold 28px Outfit";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.round(total * eased), centerX, centerY - 8);

    ctx.fillStyle = getCSS("--text-4") || "#9ca3af";
    ctx.font = "500 11px Outfit";
    ctx.fillText("Total Orders", centerX, centerY + 14);

    if (animProgress < 1) requestAnimationFrame(animate);
  }

  animate();
}

/* ----------------------------------------------------------------
   BAR CHART — Animated bars with gradient fills
   ---------------------------------------------------------------- */

function drawBarChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const padding = { top: 20, right: 20, bottom: 50, left: 70 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  if (!data.length) {
    ctx.fillStyle = getCSS("--text-4");
    ctx.font = "500 14px Outfit";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No data available", W / 2, H / 2);
    return;
  }

  const maxVal = Math.max(...data.map(d => d.value)) * 1.15;
  const barWidth = Math.min((chartW / data.length) * 0.6, 50);
  const gap = (chartW - barWidth * data.length) / (data.length + 1);

  let animProgress = 0;

  function animate() {
    animProgress = Math.min(animProgress + 0.025, 1);
    const eased = 1 - Math.pow(1 - animProgress, 3);

    ctx.clearRect(0, 0, W, H);

    // Y-axis gridlines
    const gridLines = 5;
    ctx.strokeStyle = getCSS("--border") || "#e5e7eb";
    ctx.lineWidth = 0.5;
    ctx.fillStyle = getCSS("--text-4") || "#9ca3af";
    ctx.font = "500 10px IBM Plex Mono";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + chartH - (i / gridLines) * chartH;
      const val = (i / gridLines) * maxVal;

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(W - padding.right, y);
      ctx.stroke();

      ctx.fillText("₹" + Math.round(val).toLocaleString("en-IN"), padding.left - 8, y);
    }

    // Bars
    data.forEach((d, i) => {
      const x = padding.left + gap + i * (barWidth + gap);
      const barH = (d.value / maxVal) * chartH * eased;
      const y = padding.top + chartH - barH;

      // Gradient fill
      const grad = ctx.createLinearGradient(x, y, x, padding.top + chartH);
      grad.addColorStop(0, "#10b981");
      grad.addColorStop(1, "#06b6d4");
      ctx.fillStyle = grad;

      // Rounded top corners
      const r = Math.min(4, barWidth / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barWidth - r, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
      ctx.lineTo(x + barWidth, padding.top + chartH);
      ctx.lineTo(x, padding.top + chartH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();

      // Value label on top
      if (eased > 0.6) {
        ctx.fillStyle = getCSS("--text-1") || "#111";
        ctx.font = "bold 10px IBM Plex Mono";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText("₹" + Math.round(d.value).toLocaleString("en-IN"), x + barWidth / 2, y - 6);
      }

      // X-axis label (truncated)
      ctx.fillStyle = getCSS("--text-3") || "#6b7280";
      ctx.font = "500 9px Outfit";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const label = d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label;
      ctx.fillText(label, x + barWidth / 2, padding.top + chartH + 10);
    });

    if (animProgress < 1) requestAnimationFrame(animate);
  }

  animate();
}

/* ----------------------------------------------------------------
   HELPER: Read CSS custom property value
   ---------------------------------------------------------------- */
function getCSS(prop) {
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
}

/* ----------------------------------------------------------------
   RESPONSIVE: Redraw charts on window resize
   ---------------------------------------------------------------- */
let chartResizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(chartResizeTimer);
  chartResizeTimer = setTimeout(() => {
    if (typeof renderCharts === "function" && document.getElementById("doughnutChart")) {
      renderCharts();
    }
  }, 250);
});
