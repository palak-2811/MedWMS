"use strict";

/* ================================================================
   tracker-canvas.js — Animated Delivery Tracker
   
   ADVANCED JS CONCEPTS:
   - Canvas API (paths, arcs, gradients, bezier curves)
   - requestAnimationFrame for smooth animation loop
   - Particle system (floating completion particles)
   - Easing functions & interpolation
   - Dynamic color from CSS custom properties
   ================================================================ */

/**
 * Draw an animated delivery tracker on a canvas element.
 * Shows a path with checkpoints, animated progress, and a moving vehicle.
 */
function drawTrackerCanvas(canvasId, status) {
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
  const statusIdx = STATUSES.indexOf(status);
  const targetProgress = statusIdx / (STATUSES.length - 1);

  // Track layout
  const trackY = H * 0.45;
  const startX = 50;
  const endX = W - 50;
  const trackW = endX - startX;

  // Checkpoint positions
  const checkpoints = STATUSES.map((s, i) => ({
    x: startX + (i / (STATUSES.length - 1)) * trackW,
    y: trackY,
    label: s,
    icon: ["📋", "📦", "🚚", "✅"][i],
    color: STATUS_COLORS[s],
    done: i <= statusIdx,
    active: i === statusIdx
  }));

  // Animation state
  let progress = 0;
  let particles = [];
  let sparkleTimer = 0;

  function animate() {
    progress = Math.min(progress + 0.012, targetProgress);
    const eased = easeOutCubic(Math.min(progress / Math.max(targetProgress, 0.001), 1));
    const currentProgress = targetProgress * eased;

    ctx.clearRect(0, 0, W, H);

    // --- Draw road/track background ---
    drawTrack(ctx, startX, endX, trackY, W, H);

    // --- Draw progress fill ---
    const progressX = startX + currentProgress * trackW;

    const grad = ctx.createLinearGradient(startX, 0, endX, 0);
    grad.addColorStop(0, "#10b981");
    grad.addColorStop(0.5, "#06b6d4");
    grad.addColorStop(1, "#8b5cf6");

    ctx.beginPath();
    ctx.moveTo(startX, trackY);
    ctx.lineTo(progressX, trackY);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();

    // Glow effect on progress line
    ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(startX, trackY);
    ctx.lineTo(progressX, trackY);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // --- Draw checkpoints ---
    checkpoints.forEach((cp, i) => {
      const isReached = (cp.x - startX) / trackW <= currentProgress + 0.01;

      // Checkpoint circle
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 18, 0, Math.PI * 2);

      if (isReached) {
        ctx.fillStyle = cp.color;
        ctx.fill();

        // Glow ring
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 22, 0, Math.PI * 2);
        ctx.strokeStyle = cp.color + "40";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Pulse for active
        if (cp.active) {
          const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
          ctx.beginPath();
          ctx.arc(cp.x, cp.y, 22 + pulse * 6, 0, Math.PI * 2);
          ctx.strokeStyle = cp.color + "20";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = getCSS("--border") || "#e5e7eb";
        ctx.fill();
        ctx.strokeStyle = getCSS("--border-dark") || "#d1d5db";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Icon in circle
      ctx.font = "13px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(cp.icon, cp.x, cp.y);

      // Label below
      ctx.fillStyle = isReached
        ? (getCSS("--text-1") || "#111")
        : (getCSS("--text-4") || "#9ca3af");
      ctx.font = `${isReached ? "bold" : "500"} 10px Outfit`;
      ctx.textAlign = "center";
      ctx.fillText(cp.label, cp.x, cp.y + 34);
    });

    // --- Draw moving vehicle at progress point ---
    if (currentProgress > 0.01 && currentProgress < 1) {
      drawVehicle(ctx, progressX, trackY - 28, currentProgress);
    }

    // --- Completion particles ---
    if (progress >= targetProgress && targetProgress === 1) {
      sparkleTimer++;
      if (sparkleTimer % 4 === 0 && particles.length < 30) {
        particles.push(createParticle(endX, trackY));
      }
    }

    updateAndDrawParticles(ctx, particles);

    // Continue animation
    if (progress < targetProgress || particles.length > 0) {
      requestAnimationFrame(animate);
    }
  }

  animate();
}

/** Draw the background track line with decorative elements */
function drawTrack(ctx, startX, endX, trackY, W, H) {
  // Dashed background line
  ctx.beginPath();
  ctx.moveTo(startX, trackY);
  ctx.lineTo(endX, trackY);
  ctx.strokeStyle = getCSS("--border") || "#e5e7eb";
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Decorative dots along the path
  for (let x = startX; x <= endX; x += 20) {
    ctx.beginPath();
    ctx.arc(x, trackY, 1, 0, Math.PI * 2);
    ctx.fillStyle = (getCSS("--border") || "#e5e7eb") + "60";
    ctx.fill();
  }
}

/** Draw a simple vehicle (truck) icon at position */
function drawVehicle(ctx, x, y, progress) {
  ctx.save();

  // Subtle bobbing animation
  const bob = Math.sin(Date.now() / 200) * 1.5;

  ctx.translate(x, y + bob);

  // Truck body
  ctx.fillStyle = "#10b981";
  ctx.beginPath();
  ctx.roundRect(-14, -6, 20, 12, 3);
  ctx.fill();

  // Truck cabin
  ctx.fillStyle = "#059669";
  ctx.beginPath();
  ctx.roundRect(6, -8, 10, 14, [0, 3, 3, 0]);
  ctx.fill();

  // Window
  ctx.fillStyle = "#d1fae5";
  ctx.fillRect(8, -6, 6, 6);

  // Wheels
  ctx.fillStyle = getCSS("--text-1") || "#111";
  ctx.beginPath();
  ctx.arc(-6, 7, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8, 7, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Create a sparkle particle */
function createParticle(x, y) {
  return {
    x: x + (Math.random() - 0.5) * 40,
    y: y + (Math.random() - 0.5) * 20,
    vx: (Math.random() - 0.5) * 2,
    vy: -1 - Math.random() * 2,
    size: 2 + Math.random() * 3,
    life: 1,
    color: ["#10b981", "#06b6d4", "#f59e0b", "#8b5cf6"][Math.floor(Math.random() * 4)]
  };
}

/** Update and draw particles */
function updateAndDrawParticles(ctx, particles) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.02;
    p.size *= 0.98;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color + Math.round(p.life * 255).toString(16).padStart(2, "0");
    ctx.fill();
  }
}

/** Easing: ease-out cubic */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/** Read CSS variable */
function getCSS(prop) {
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
}
