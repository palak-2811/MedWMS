"use strict";

/* ================================================================
   signature.js — Canvas Signature Pad
   
   ADVANCED JS CONCEPTS:
   - Canvas API (paths, strokes, compositing)
   - Touch event handling (touchstart, touchmove, touchend)
   - Mouse event handling (mousedown, mousemove, mouseup)
   - toDataURL() for image export
   - Pointer events for unified input
   ================================================================ */

let signatureCanvas = null;
let signatureCtx = null;
let isDrawing = false;
let hasSignature = false;
let lastX = 0;
let lastY = 0;

/**
 * Initialize the signature pad on a canvas element.
 * Supports both mouse and touch input.
 */
function initSignaturePad(canvasId) {
  signatureCanvas = document.getElementById(canvasId);
  if (!signatureCanvas) return;

  const wrap = signatureCanvas.closest(".signature-canvas-wrap");
  signatureCtx = signatureCanvas.getContext("2d");

  // Set canvas resolution for crisp rendering
  resizeSignatureCanvas();

  // Configure stroke style
  signatureCtx.strokeStyle = getComputedStyle(document.documentElement)
    .getPropertyValue("--text-1").trim() || "#111827";
  signatureCtx.lineWidth = 2.5;
  signatureCtx.lineCap = "round";
  signatureCtx.lineJoin = "round";

  // --- Mouse events ---
  signatureCanvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    [lastX, lastY] = getCanvasCoords(e);
    wrap?.classList.add("active");
  });

  signatureCanvas.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    const [x, y] = getCanvasCoords(e);
    drawLine(lastX, lastY, x, y);
    lastX = x;
    lastY = y;
    markHasSignature(wrap);
  });

  signatureCanvas.addEventListener("mouseup", () => {
    isDrawing = false;
    wrap?.classList.remove("active");
  });

  signatureCanvas.addEventListener("mouseleave", () => {
    isDrawing = false;
    wrap?.classList.remove("active");
  });

  // --- Touch events ---
  signatureCanvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    isDrawing = true;
    const touch = e.touches[0];
    [lastX, lastY] = getCanvasCoords(touch);
    wrap?.classList.add("active");
  }, { passive: false });

  signatureCanvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const [x, y] = getCanvasCoords(touch);
    drawLine(lastX, lastY, x, y);
    lastX = x;
    lastY = y;
    markHasSignature(wrap);
  }, { passive: false });

  signatureCanvas.addEventListener("touchend", () => {
    isDrawing = false;
    wrap?.classList.remove("active");
  });

  // --- Clear button ---
  const clearBtn = document.getElementById("clearSignatureBtn");
  clearBtn?.addEventListener("click", clearSignature);

  // --- Resize handling ---
  window.addEventListener("resize", debounce(() => {
    // Save current drawing
    const imageData = signatureCanvas.toDataURL();
    resizeSignatureCanvas();
    // Restore drawing
    if (hasSignature) {
      const img = new Image();
      img.onload = () => {
        signatureCtx.drawImage(img, 0, 0, signatureCanvas.width / (window.devicePixelRatio || 1), signatureCanvas.height / (window.devicePixelRatio || 1));
      };
      img.src = imageData;
    }
  }, 300));
}

/** Get canvas-relative coordinates from a mouse/touch event */
function getCanvasCoords(e) {
  const rect = signatureCanvas.getBoundingClientRect();
  const x = (e.clientX ?? e.pageX) - rect.left;
  const y = (e.clientY ?? e.pageY) - rect.top;
  return [x, y];
}

/** Draw a line segment on the canvas */
function drawLine(x1, y1, x2, y2) {
  const dpr = window.devicePixelRatio || 1;
  signatureCtx.beginPath();
  signatureCtx.moveTo(x1 * dpr, y1 * dpr);
  signatureCtx.lineTo(x2 * dpr, y2 * dpr);
  signatureCtx.stroke();
}

/** Resize canvas to match display size at device pixel ratio */
function resizeSignatureCanvas() {
  if (!signatureCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = signatureCanvas.getBoundingClientRect();
  signatureCanvas.width  = rect.width * dpr;
  signatureCanvas.height = rect.height * dpr;

  // Reconfigure stroke after resize
  signatureCtx.strokeStyle = getComputedStyle(document.documentElement)
    .getPropertyValue("--text-1").trim() || "#111827";
  signatureCtx.lineWidth = 2.5 * dpr;
  signatureCtx.lineCap = "round";
  signatureCtx.lineJoin = "round";
}

/** Mark that the user has started signing */
function markHasSignature(wrap) {
  if (!hasSignature) {
    hasSignature = true;
    wrap?.classList.add("has-signature");
  }
}

/** Clear the signature canvas */
function clearSignature() {
  if (!signatureCanvas || !signatureCtx) return;
  const dpr = window.devicePixelRatio || 1;
  signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  hasSignature = false;

  const wrap = signatureCanvas.closest(".signature-canvas-wrap");
  wrap?.classList.remove("has-signature");

  showToast("Signature cleared", "🗑️");
}

/**
 * Get the signature as a base64 data URL.
 * Returns null if no signature was drawn.
 */
function getSignatureData() {
  if (!signatureCanvas || !hasSignature) return null;
  return signatureCanvas.toDataURL("image/png");
}

/* ================================================================
   INVOICE WATERMARK — Canvas diagonal stamp
   ================================================================ */

/**
 * Draw a diagonal watermark stamp on the invoice canvas.
 * Shows "DELIVERED" in green or "PENDING" in orange.
 */
function drawInvoiceWatermark(canvasId, status) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const wrap = canvas.closest(".invoice-wrap");
  if (!wrap) return;

  // Size canvas to match invoice
  const rect = wrap.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width  = rect.width + "px";
  canvas.style.height = rect.height + "px";

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const isDelivered = status === "Delivered";
  const text = isDelivered ? "DELIVERED" : "PENDING";
  const color = isDelivered ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)";
  const borderColor = isDelivered ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)";

  ctx.save();
  ctx.translate(rect.width / 2, rect.height / 2);
  ctx.rotate(-Math.PI / 6);

  // Stamp border
  const textWidth = ctx.measureText(text).width;
  ctx.font = "bold 60px Outfit";
  const metrics = ctx.measureText(text);
  const tw = metrics.width;
  const pad = 24;

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(-tw / 2 - pad, -40, tw + pad * 2, 80);

  // Stamp text
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);

  ctx.restore();
}

/* ================================================================
   BOOTSTRAP
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // Init signature pad on order page
  if (document.getElementById("signatureCanvas")) {
    initSignaturePad("signatureCanvas");
  }

  // Init watermark on bill page
  if (document.getElementById("invoiceWatermarkCanvas")) {
    // Watermark is rendered after invoice data loads (called from app.js)
  }
});
