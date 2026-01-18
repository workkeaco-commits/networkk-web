"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getMinSizes(display, aspect, lockAspect) {
  if (!display.w || !display.h) return { minW: 0, minH: 0 };
  const base = Math.round(Math.min(display.w, display.h) * 0.22);
  const minEdge = clamp(base, 64, 160);
  if (!lockAspect) {
    return {
      minW: Math.min(minEdge, display.w),
      minH: Math.min(minEdge, display.h),
    };
  }
  let minW;
  let minH;
  if (aspect >= 1) {
    minH = minEdge;
    minW = minH * aspect;
  } else {
    minW = minEdge;
    minH = minW / aspect;
  }
  if (minW > display.w || minH > display.h) {
    const ratio = Math.min(display.w / minW, display.h / minH);
    minW *= ratio;
    minH *= ratio;
  }
  return { minW, minH };
}

function getInitialCrop(display, aspect) {
  if (!display.w || !display.h) return { x: 0, y: 0, w: 0, h: 0 };
  const lockAspect = Number.isFinite(aspect) && aspect > 0;
  if (!lockAspect) {
    return { x: display.x, y: display.y, w: display.w, h: display.h };
  }
  let w = display.w;
  let h = w / aspect;
  if (h > display.h) {
    h = display.h;
    w = h * aspect;
  }
  const x = display.x + (display.w - w) / 2;
  const y = display.y + (display.h - h) / 2;
  return { x, y, w, h };
}

function clampCrop(crop, display, aspect) {
  if (!display.w || !display.h) return crop;
  const lockAspect = Number.isFinite(aspect) && aspect > 0;
  const { minW, minH } = getMinSizes(display, aspect, lockAspect);
  let w = Math.max(crop.w, minW);
  let h = Math.max(crop.h, minH);
  if (lockAspect && w && h) {
    if (w / h > aspect) {
      w = h * aspect;
    } else {
      h = w / aspect;
    }
  }
  w = Math.min(w, display.w);
  h = Math.min(h, display.h);
  const x = clamp(crop.x, display.x, display.x + display.w - w);
  const y = clamp(crop.y, display.y, display.y + display.h - h);
  return { x, y, w, h };
}

export default function ImageCropperModal({
  open,
  file,
  aspect = 1,
  title = "Crop image",
  onCancel,
  onConfirm,
}) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const layoutReadyRef = useRef(false);

  const [imageUrl, setImageUrl] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [display, setDisplay] = useState({ x: 0, y: 0, w: 0, h: 0, scale: 1 });
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [errorMsg, setErrorMsg] = useState("");

  const displayRef = useRef(display);
  const cropRef = useRef(crop);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  useEffect(() => {
    layoutReadyRef.current = false;
  }, [file]);

  useEffect(() => {
    if (!open || !file) {
      setImageUrl(null);
      setImgSize({ w: 0, h: 0 });
      setErrorMsg("");
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setErrorMsg("");
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  useEffect(() => {
    if (!open) return;
    const updateLayout = () => {
      if (!containerRef.current || !imgSize.w || !imgSize.h) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scale = Math.min(rect.width / imgSize.w, rect.height / imgSize.h);
      const w = imgSize.w * scale;
      const h = imgSize.h * scale;
      const x = (rect.width - w) / 2;
      const y = (rect.height - h) / 2;
      const nextDisplay = { x, y, w, h, scale };
      setDisplay(nextDisplay);
      setCrop((prev) => {
        if (!layoutReadyRef.current) {
          layoutReadyRef.current = true;
          return getInitialCrop(nextDisplay, aspect);
        }
        return clampCrop(prev, nextDisplay, aspect);
      });
    };
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [open, imgSize, aspect]);

  function handleImageLoad() {
    if (!imgRef.current) return;
    setImgSize({
      w: imgRef.current.naturalWidth,
      h: imgRef.current.naturalHeight,
    });
  }

  function handlePointerDown(handle, e) {
    if (!cropRef.current.w || !displayRef.current.w) return;
    e.preventDefault();
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: cropRef.current,
      display: displayRef.current,
      aspect,
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const next = getNextCrop(drag, dx, dy);
    setCrop(next);
  }

  function handlePointerUp() {
    dragRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  }

  function getNextCrop(drag, dx, dy) {
    const { handle, startCrop, display: disp, aspect: asp } = drag;
    const lockAspect = Number.isFinite(asp) && asp > 0;
    const { minW, minH } = getMinSizes(disp, asp, lockAspect);
    if (!lockAspect) {
      if (handle === "left") {
        const nextX = clamp(startCrop.x + dx, disp.x, startCrop.x + startCrop.w - minW);
        return { x: nextX, y: startCrop.y, w: startCrop.w + (startCrop.x - nextX), h: startCrop.h };
      }
      if (handle === "right") {
        const maxW = disp.x + disp.w - startCrop.x;
        const nextW = clamp(startCrop.w + dx, minW, maxW);
        return { x: startCrop.x, y: startCrop.y, w: nextW, h: startCrop.h };
      }
      if (handle === "top") {
        const nextY = clamp(startCrop.y + dy, disp.y, startCrop.y + startCrop.h - minH);
        return { x: startCrop.x, y: nextY, w: startCrop.w, h: startCrop.h + (startCrop.y - nextY) };
      }
      const maxH = disp.y + disp.h - startCrop.y;
      const nextH = clamp(startCrop.h + dy, minH, maxH);
      return { x: startCrop.x, y: startCrop.y, w: startCrop.w, h: nextH };
    }

    const centerX = startCrop.x + startCrop.w / 2;
    const centerY = startCrop.y + startCrop.h / 2;

    if (handle === "left") {
      const right = startCrop.x + startCrop.w;
      let nextW = clamp(startCrop.w - dx, minW, right - disp.x);
      let nextH = nextW / asp;
      if (nextH > disp.h) {
        nextH = disp.h;
        nextW = nextH * asp;
      }
      const nextX = right - nextW;
      const nextY = clamp(centerY - nextH / 2, disp.y, disp.y + disp.h - nextH);
      return { x: nextX, y: nextY, w: nextW, h: nextH };
    }

    if (handle === "right") {
      const left = startCrop.x;
      let nextW = clamp(startCrop.w + dx, minW, disp.x + disp.w - left);
      let nextH = nextW / asp;
      if (nextH > disp.h) {
        nextH = disp.h;
        nextW = nextH * asp;
      }
      const nextY = clamp(centerY - nextH / 2, disp.y, disp.y + disp.h - nextH);
      return { x: left, y: nextY, w: nextW, h: nextH };
    }

    if (handle === "top") {
      const bottom = startCrop.y + startCrop.h;
      let nextH = clamp(startCrop.h - dy, minH, bottom - disp.y);
      let nextW = nextH * asp;
      if (nextW > disp.w) {
        nextW = disp.w;
        nextH = nextW / asp;
      }
      const nextY = bottom - nextH;
      const nextX = clamp(centerX - nextW / 2, disp.x, disp.x + disp.w - nextW);
      return { x: nextX, y: nextY, w: nextW, h: nextH };
    }

    const top = startCrop.y;
    let nextH = clamp(startCrop.h + dy, minH, disp.y + disp.h - top);
    let nextW = nextH * asp;
    if (nextW > disp.w) {
      nextW = disp.w;
      nextH = nextW / asp;
    }
    const nextX = clamp(centerX - nextW / 2, disp.x, disp.x + disp.w - nextW);
    return { x: nextX, y: top, w: nextW, h: nextH };
  }

  function handleConfirm() {
    if (!file || !imgRef.current) return;
    const currentCrop = cropRef.current;
    const currentDisplay = displayRef.current;
    if (!currentCrop.w || !currentCrop.h || !currentDisplay.scale) return;
    const sx = (currentCrop.x - currentDisplay.x) / currentDisplay.scale;
    const sy = (currentCrop.y - currentDisplay.y) / currentDisplay.scale;
    const sWidth = currentCrop.w / currentDisplay.scale;
    const sHeight = currentCrop.h / currentDisplay.scale;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sWidth);
    canvas.height = Math.round(sHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imgRef.current, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const quality = outputType === "image/jpeg" ? 0.9 : undefined;
    canvas.toBlob(
      (blob) => {
        if (!blob || !blob.size) {
          setErrorMsg("We couldn't process that image. Please upload a JPG or PNG image.");
          return;
        }
        const baseName = file.name ? file.name.replace(/\.[^/.]+$/, "") : "image";
        const ext = outputType === "image/png" ? "png" : "jpg";
        const croppedFile = new File([blob], `${baseName}-cropped.${ext}`, { type: outputType });
        onConfirm(croppedFile);
      },
      outputType,
      quality
    );
  }

  if (!open || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-[560px] rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Adjust</p>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close cropper"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center gap-4">
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-[24px] border border-gray-200 bg-gray-50 w-[80vw] max-w-[360px] shadow-inner"
            style={{ aspectRatio: aspect }}
          >
            {imageUrl && (
              <>
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Crop preview"
                  onLoad={handleImageLoad}
                  draggable={false}
                  className="absolute left-0 top-0 select-none touch-none"
                  style={{
                    width: display.w ? `${display.w}px` : "auto",
                    height: display.h ? `${display.h}px` : "auto",
                    transform: `translate(${display.x}px, ${display.y}px)`,
                  }}
                />
                {crop.w > 0 && (
                  <div
                    className="absolute rounded-[18px] border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] pointer-events-none"
                    style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
                  >
                    <div
                      onPointerDown={(e) => handlePointerDown("left", e)}
                      className="absolute left-0 top-0 h-full w-4 -translate-x-1/2 cursor-ew-resize pointer-events-auto touch-none"
                    >
                      <div className="absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow" />
                    </div>
                    <div
                      onPointerDown={(e) => handlePointerDown("right", e)}
                      className="absolute right-0 top-0 h-full w-4 translate-x-1/2 cursor-ew-resize pointer-events-auto touch-none"
                    >
                      <div className="absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow" />
                    </div>
                    <div
                      onPointerDown={(e) => handlePointerDown("top", e)}
                      className="absolute left-0 top-0 h-4 w-full -translate-y-1/2 cursor-ns-resize pointer-events-auto touch-none"
                    >
                      <div className="absolute left-1/2 top-1/2 h-1 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow" />
                    </div>
                    <div
                      onPointerDown={(e) => handlePointerDown("bottom", e)}
                      className="absolute left-0 bottom-0 h-4 w-full translate-y-1/2 cursor-ns-resize pointer-events-auto touch-none"
                    >
                      <div className="absolute left-1/2 top-1/2 h-1 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Drag the edges to crop from each side.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {errorMsg ? (
            <p className="mr-auto text-xs font-medium text-red-500">{errorMsg}</p>
          ) : null}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-full bg-[#10b8a6] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#10b8a6]/20 hover:bg-[#0e9f8e] transition-colors"
          >
            Apply crop
          </button>
        </div>
      </div>
    </div>
  );
}
