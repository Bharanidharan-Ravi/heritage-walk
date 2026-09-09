// src/Component/Sections/TempleView.jsx
//
// Immersive image viewer: drag to pan, scroll wheel / pinch to zoom.
// Not a real 3D model — a single high-res photo you can explore in detail.
// See templeView.config.jsx for copy, theme, and the image path to swap in
// (TODO(temple-view) marks the placeholder that needs a real photo).
//
// No extra dependency: panning/zooming is done by hand with Pointer Events
// so it works the same for mouse drag, touch drag, and two-finger pinch.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { templeViewConfig } from "../Config/templeView.config";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function TempleView() {
  const { theme, content, viewer } = templeViewConfig;
  const { minZoom, maxZoom, wheelZoomStep, buttonZoomStep, doubleClickZoom } = viewer;

  const containerRef = useRef(null);
  const [imageError, setImageError] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);

  // Transform state. Image is sized to cover the container at scale 1
  // (transform-origin 0 0), so tx/ty stay within [(1-scale)*W, 0].
  const [transform, setTransform] = useState({ scale: minZoom, tx: 0, ty: 0 });
  // Mirrored in a ref (updated alongside every setTransform call, not via an
  // effect) so pointermove/wheel handlers always read the latest value even
  // across rapid-fire events within the same frame.
  const transformRef = useRef(transform);
  const applyTransform = useCallback((next) => {
    transformRef.current = next;
    setTransform(next);
  }, []);

  // Active pointers, for single-finger drag vs two-finger pinch.
  const pointers = useRef(new Map());
  const dragState = useRef(null); // { startX, startY, startTx, startTy }
  const pinchState = useRef(null); // { startDist, startScale, midX, midY }

  const dismissHint = useCallback(() => setHintVisible(false), []);

  const clampTranslate = useCallback((tx, ty, scale) => {
    const el = containerRef.current;
    const w = el?.clientWidth || 1;
    const h = el?.clientHeight || 1;
    return {
      tx: clamp(tx, (1 - scale) * w, 0),
      ty: clamp(ty, (1 - scale) * h, 0),
    };
  }, []);

  // Zoom while keeping the point under (mx, my) visually fixed.
  const zoomAt = useCallback(
    (mx, my, nextScaleRaw) => {
      const { scale, tx, ty } = transformRef.current;
      const nextScale = clamp(nextScaleRaw, minZoom, maxZoom);
      if (nextScale === scale) return;
      const ratio = nextScale / scale;
      const nextTx = mx - ratio * (mx - tx);
      const nextTy = my - ratio * (my - ty);
      const clamped = clampTranslate(nextTx, nextTy, nextScale);
      applyTransform({ scale: nextScale, ...clamped });
    },
    [clampTranslate, applyTransform, minZoom, maxZoom]
  );

  const resetView = useCallback(() => {
    applyTransform({ scale: minZoom, tx: 0, ty: 0 });
  }, [applyTransform, minZoom]);

  // Wheel-to-zoom needs { passive: false } to preventDefault, which React's
  // synthetic onWheel can't guarantee — attach natively instead.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      dismissHint();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const direction = e.deltaY > 0 ? -1 : 1;
      zoomAt(mx, my, transformRef.current.scale + direction * wheelZoomStep);
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoomAt, wheelZoomStep, dismissHint]);

  const handlePointerDown = (e) => {
    dismissHint();
    const el = containerRef.current;
    el.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      const { tx, ty } = transformRef.current;
      dragState.current = { startX: e.clientX, startY: e.clientY, startTx: tx, startTy: ty };
      pinchState.current = null;
    } else if (pointers.current.size === 2) {
      dragState.current = null;
      const pts = Array.from(pointers.current.values());
      const rect = el.getBoundingClientRect();
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchState.current = {
        startDist: dist || 1,
        startScale: transformRef.current.scale,
        midX: (pts[0].x + pts[1].x) / 2 - rect.left,
        midY: (pts[0].y + pts[1].y) / 2 - rect.top,
      };
    }
  };

  const handlePointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchState.current) {
      const pts = Array.from(pointers.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      const { startDist, startScale, midX, midY } = pinchState.current;
      zoomAt(midX, midY, startScale * (dist / startDist));
      return;
    }

    if (dragState.current) {
      const { scale } = transformRef.current;
      if (scale <= minZoom) return; // nothing to pan at fit-to-screen
      const { startX, startY, startTx, startTy } = dragState.current;
      const nextTx = startTx + (e.clientX - startX);
      const nextTy = startTy + (e.clientY - startY);
      applyTransform({ scale, ...clampTranslate(nextTx, nextTy, scale) });
    }
  };

  const endPointer = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchState.current = null;
    if (pointers.current.size === 0) dragState.current = null;
  };

  const handleDoubleClick = (e) => {
    dismissHint();
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (transformRef.current.scale > minZoom + 0.01) {
      resetView();
    } else {
      zoomAt(mx, my, doubleClickZoom);
    }
  };

  const handleButtonZoom = (direction) => {
    const el = containerRef.current;
    const cx = (el?.clientWidth || 0) / 2;
    const cy = (el?.clientHeight || 0) / 2;
    zoomAt(cx, cy, transformRef.current.scale + direction * buttonZoomStep);
  };

  const { scale, tx, ty } = transform;
  const isZoomed = scale > minZoom + 0.01;

  return (
    <section
      className="relative w-full overflow-hidden h-[calc(100vh-7rem)] min-h-[420px]"
      style={{ backgroundColor: theme.pageBackground }}
    >
      {/* Back link */}
      <Link
        to="/"
        className="absolute top-4 left-4 z-20 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md transition-colors hover:opacity-80"
        style={{ backgroundColor: theme.panelBackground, color: theme.textColor }}
      >
        {content.backLabel}
      </Link>

      {/* Title panel */}
      <div
        className="absolute top-4 right-4 z-20 max-w-xs text-right px-5 py-4 rounded-2xl backdrop-blur-md hidden sm:block"
        style={{ backgroundColor: theme.panelBackground }}
      >
        <span
          className="block text-[10px] font-bold uppercase tracking-[0.25em] mb-1"
          style={{ color: theme.accentColor }}
        >
          {content.eyebrow}
        </span>
        <h1 className="font-serif text-xl leading-tight" style={{ color: theme.textColor }}>
          {content.title}
        </h1>
        <p className="text-xs mt-1" style={{ color: theme.secondaryText }}>
          {content.subtitle}
        </p>
      </div>

      {/* Viewer surface */}
      <div
        ref={containerRef}
        className="absolute inset-0 touch-none select-none"
        style={{ cursor: isZoomed ? "grab" : "zoom-in" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
        onDoubleClick={handleDoubleClick}
      >
        {imageError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center px-8">
            <svg
              className="w-14 h-14 mb-4 opacity-40"
              fill="none"
              stroke={theme.accentColor}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"
              />
            </svg>
            <h2 className="font-serif text-2xl mb-2" style={{ color: theme.textColor }}>
              {content.missingImageTitle}
            </h2>
            <p className="max-w-md text-sm" style={{ color: theme.secondaryText }}>
              {content.missingImageBody}
            </p>
          </div>
        ) : (
          <img
            src={content.image}
            alt={content.imageAlt}
            draggable={false}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
            style={{
              transformOrigin: "0 0",
              transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
              willChange: "transform",
            }}
          />
        )}
      </div>

      {/* Hint overlay */}
      {!imageError && (
        <div
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 rounded-full text-xs font-medium tracking-wide backdrop-blur-md transition-opacity duration-500 pointer-events-none ${
            hintVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundColor: theme.panelBackground, color: theme.textColor }}
        >
          {content.hintText}
        </div>
      )}

      {/* Zoom controls */}
      {!imageError && (
        <div className="absolute bottom-6 right-4 z-20 flex flex-col gap-2">
          <button
            onClick={() => handleButtonZoom(1)}
            aria-label="Zoom in"
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold backdrop-blur-md transition-transform hover:scale-105"
            style={{ backgroundColor: theme.panelBackground, color: theme.textColor }}
          >
            +
          </button>
          <button
            onClick={() => handleButtonZoom(-1)}
            aria-label="Zoom out"
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold backdrop-blur-md transition-transform hover:scale-105"
            style={{ backgroundColor: theme.panelBackground, color: theme.textColor }}
          >
            −
          </button>
          {isZoomed && (
            <button
              onClick={resetView}
              aria-label={content.resetLabel}
              className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-transform hover:scale-105"
              style={{ backgroundColor: theme.panelBackground, color: theme.accentColor }}
              title={content.resetLabel}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114-5M20 15a8 8 0 01-14 5"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
