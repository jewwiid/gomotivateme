"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ZoomIn, ZoomOut, Loader2 } from "lucide-react";

/**
 * Circular crop modal for avatar uploads. Lets the user pan + zoom before
 * exporting a clean 256×256 JPEG. Pure pointer events — works for mouse,
 * touch, and stylus on the same handlers. No external cropper dep.
 */

type Props = {
  file: File | null;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
};

const CROP_DISPLAY = 280; // px (visual size of the circular viewport)
const OUTPUT_SIZE = 256; // px (output canvas size, matches the rest of the app)
const MIN_ZOOM = 1; // fit — image just covers the viewport
const MAX_ZOOM = 3;

type Pointer = { x: number; y: number; startX: number; startY: number };

type DragState = {
  pointers: Map<number, Pointer>;
  baseOffset: { x: number; y: number };
  baseZoom: number;
  initialPinchDist: number | null;
};

export function AvatarCropModal({ file, onCancel, onConfirm }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<DragState | null>(null);

  // Load the picked file into a blob URL.
  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErr("Choose an image file");
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Read the natural size once the blob loads.
  useEffect(() => {
    if (!imageUrl) {
      setNatural(null);
      return;
    }
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setErr("Couldn't read this image");
    img.src = imageUrl;
  }, [imageUrl]);

  // Reset the transform every time a new image lands.
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setErr(null);
  }, [imageUrl]);

  // Focus the cancel button when the modal opens, so keyboard users have a
  // sensible starting point and Escape has a target to return to.
  useEffect(() => {
    if (file && cancelRef.current) cancelRef.current.focus();
  }, [file]);

  // Esc closes the modal.
  useEffect(() => {
    if (!file) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [file, onCancel]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!file) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [file]);

  // The scale that just barely covers the circular viewport.
  const fitScale = useMemo(() => {
    if (!natural) return 1;
    return Math.max(CROP_DISPLAY / natural.w, CROP_DISPLAY / natural.h);
  }, [natural]);

  const effectiveScale = fitScale * zoom;

  // How far the user is allowed to drag, in viewport pixels, given the
  // current zoom. At fit, this is zero (image just covers). As zoom grows,
  // the user can pan further to see the rest of the image.
  const bounds = useMemo(() => {
    if (!natural) return { maxX: 0, maxY: 0 };
    const renderedW = natural.w * effectiveScale;
    const renderedH = natural.h * effectiveScale;
    return {
      maxX: Math.max(0, (renderedW - CROP_DISPLAY) / 2),
      maxY: Math.max(0, (renderedH - CROP_DISPLAY) / 2),
    };
  }, [natural, effectiveScale]);

  const clampOffset = useCallback(
    (x: number, y: number) => ({
      x: Math.max(-bounds.maxX, Math.min(bounds.maxX, x)),
      y: Math.max(-bounds.maxY, Math.min(bounds.maxY, y)),
    }),
    [bounds]
  );

  // ── Pointer handlers (pan + pinch) ────────────────────────────────────
  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const state: DragState =
      dragRef.current ?? {
        pointers: new Map(),
        baseOffset: { ...offset },
        baseZoom: zoom,
        initialPinchDist: null,
      };
    state.pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
    });
    state.baseOffset = { ...offset };
    state.baseZoom = zoom;
    dragRef.current = state;

    if (state.pointers.size === 2) {
      const [p1, p2] = Array.from(state.pointers.values());
      state.initialPinchDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    } else {
      state.initialPinchDist = null;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const state = dragRef.current;
    if (!state) return;
    const ptr = state.pointers.get(e.pointerId);
    if (!ptr) return;
    ptr.x = e.clientX;
    ptr.y = e.clientY;

    if (state.pointers.size === 1) {
      // Pan
      const dx = ptr.x - ptr.startX;
      const dy = ptr.y - ptr.startY;
      setOffset(clampOffset(state.baseOffset.x + dx, state.baseOffset.y + dy));
    } else if (state.pointers.size === 2 && state.initialPinchDist) {
      // Pinch zoom. The two fingers may also be moving, so we still update
      // offset relative to the average finger movement.
      const [p1, p2] = Array.from(state.pointers.values());
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const ratio = dist / state.initialPinchDist;
      const newZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, state.baseZoom * ratio)
      );
      setZoom(newZoom);
      // Translate the average movement of the two fingers into an offset
      // update so the image follows the pinch midpoint. We approximate by
      // using the first finger's start-vs-current delta.
      const avgDx = (p1.x - p1.startX + (p2.x - p2.startX)) / 2;
      const avgDy = (p1.y - p1.startY + (p2.y - p2.startY)) / 2;
      setOffset(clampOffset(state.baseOffset.x + avgDx, state.baseOffset.y + avgDy));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const state = dragRef.current;
    if (!state) return;
    state.pointers.delete(e.pointerId);
    if (state.pointers.size === 0) {
      dragRef.current = null;
    } else if (state.pointers.size === 1) {
      // After lifting one finger of a pinch, the remaining finger becomes
      // the new pan anchor — reset its start position to its current spot
      // and use the current offset as the new base.
      const [remaining] = Array.from(state.pointers.values());
      remaining.startX = remaining.x;
      remaining.startY = remaining.y;
      state.baseOffset = { ...offset };
      state.baseZoom = zoom;
      state.initialPinchDist = null;
    }
  }

  // Wheel zoom (desktop / trackpad). Step is normalized to the wheel deltaY
  // range so trackpad pinch-to-zoom also feels right.
  function onWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && Math.abs(e.deltaY) < 1) return;
    e.preventDefault();
    const step = -e.deltaY / 500;
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + step)));
  }

  // ── Save: re-render the transformed image to a square canvas ──────────
  const onSave = useCallback(async () => {
    if (!imageUrl || !natural) return;
    setBusy(true);
    setErr(null);
    try {
      const img = new Image();
      img.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Couldn't load image"));
      });

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // The preview applies (offset + effectiveScale) to the image centered
      // in a CROP_DISPLAY viewport. The output canvas is OUTPUT_SIZE. We
      // compose the same transform here, scaled by OUTPUT_SIZE / CROP_DISPLAY.
      const scaleRatio = OUTPUT_SIZE / CROP_DISPLAY;

      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.translate(offset.x * scaleRatio, offset.y * scaleRatio);
      ctx.scale(effectiveScale * scaleRatio, effectiveScale * scaleRatio);
      ctx.translate(-natural.w / 2, -natural.h / 2);
      ctx.drawImage(img, 0, 0, natural.w, natural.h);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );
      if (!blob) throw new Error("Couldn't encode the cropped image");

      const cropped = new File([blob], "avatar.jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      onConfirm(cropped);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Crop failed");
    } finally {
      setBusy(false);
    }
  }, [imageUrl, natural, offset, effectiveScale, onConfirm]);

  const onBackdrop = (e: React.MouseEvent) => {
    // Close only when the click started on the backdrop, not bubbled from
    // a child element.
    if (e.target === e.currentTarget) onCancel();
  };

  const imageTransform = natural
    ? `translate(${offset.x}px, ${offset.y}px) scale(${effectiveScale})`
    : undefined;

  return (
    <AnimatePresence>
      {file ? (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={onBackdrop}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-crop-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#e9e7df] bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#efeee7] px-5 py-3.5">
              <h2
                id="avatar-crop-title"
                className="text-sm font-semibold text-[#1f1f1c]"
              >
                Adjust your photo
              </h2>
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                aria-label="Close"
                className="grid h-7 w-7 place-items-center rounded-full text-[#777872] transition hover:bg-[#f4f2ea] hover:text-[#1f1f1c]"
              >
                <X size={15} />
              </button>
            </div>

            {/* Crop viewport */}
            <div className="flex justify-center bg-[#fafaf6] px-6 py-7">
              <div
                ref={viewportRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={onWheel}
                className="relative select-none overflow-hidden rounded-full border-2 border-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] touch-none"
                style={{
                  width: CROP_DISPLAY,
                  height: CROP_DISPLAY,
                  cursor: dragRef.current ? "grabbing" : "grab",
                }}
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute left-1/2 top-1/2 max-w-none origin-center"
                    style={{
                      width: natural?.w ?? 0,
                      height: natural?.h ?? 0,
                      transform: `translate(-50%, -50%) ${imageTransform ?? ""}`,
                      transformOrigin: "center",
                    }}
                  />
                ) : null}
                {!natural ? (
                  <div className="grid h-full w-full place-items-center text-xs text-[#9a9a93]">
                    Loading…
                  </div>
                ) : null}
              </div>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-3 border-t border-[#efeee7] px-5 py-3.5">
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z - 0.1)))
                }
                aria-label="Zoom out"
                disabled={zoom <= MIN_ZOOM}
                className="grid h-8 w-8 place-items-center rounded-full border border-[#e3e1d8] text-[#5d5e58] transition hover:bg-[#f4f2ea] disabled:opacity-40"
              >
                <ZoomOut size={14} />
              </button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                aria-label="Zoom"
                className="flex-1 accent-[var(--color-primary)]"
              />
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + 0.1)))
                }
                aria-label="Zoom in"
                disabled={zoom >= MAX_ZOOM}
                className="grid h-8 w-8 place-items-center rounded-full border border-[#e3e1d8] text-[#5d5e58] transition hover:bg-[#f4f2ea] disabled:opacity-40"
              >
                <ZoomIn size={14} />
              </button>
              <span className="ml-1 w-10 text-right text-xs tabular-nums text-[#7a7c75]">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Error */}
            {err ? (
              <div className="mx-5 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {err}
              </div>
            ) : null}

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-[#efeee7] bg-[#fafaf6] px-5 py-3.5">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl px-4 py-2 text-sm font-medium text-[#5d5e58] transition hover:bg-[#efeee7] hover:text-[#1f1f1c]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={busy || !natural}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} strokeWidth={2.2} />
                )}
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
