"use client";
import { useEffect, useRef, useState } from "react";
export default function DiagramCanvas({
  url,
  title,
  onImageError,
}: {
  url: string;
  title: string;
  onImageError: () => void;
}) {
  const [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [full, setFull] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const distance = useRef(0);
  const adjust = (value: number) =>
    setZoom((z) => Math.min(4, Math.max(0.5, value * z)));
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [url]);
  useEffect(() => {
    const change = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      adjust(e.deltaY < 0 ? 1.1 : 1 / 1.1);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  return (
    <section
      className={full ? "canvas-panel expanded" : "canvas-panel"}
      aria-label="図解プレビュー"
    >
      <div className="toolbar">
        <div>
          <button onClick={() => adjust(1 / 1.25)} aria-label="縮小">
            −
          </button>
          <output aria-label="ズーム倍率">{Math.round(zoom * 100)}%</output>
          <button onClick={() => adjust(1.25)} aria-label="拡大">
            ＋
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            全体表示
          </button>
        </div>
        <button
          onClick={async () => {
            if (full) {
              if (document.fullscreenElement) await document.exitFullscreen();
              setFull(false);
            } else {
              setFull(true);
              try {
                await box.current?.parentElement?.requestFullscreen();
              } catch {
                /* iOS uses the fixed viewport fallback. */
              }
            }
          }}
        >
          {full ? "全画面終了" : "全画面"}
        </button>
      </div>
      <div
        ref={box}
        className="canvas"
        tabIndex={0}
        role="img"
        aria-label={`${title}。ピンチ、ドラッグ、矢印キーで移動できます。`}
        onKeyDown={(e) => {
          if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
          ) {
            e.preventDefault();
            setPan((p) => ({
              x:
                p.x +
                (e.key === "ArrowLeft" ? 30 : e.key === "ArrowRight" ? -30 : 0),
              y:
                p.y +
                (e.key === "ArrowUp" ? 30 : e.key === "ArrowDown" ? -30 : 0),
            }));
          }
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          distance.current = 0;
        }}
        onPointerMove={(e) => {
          const prev = pointers.current.get(e.pointerId);
          if (!prev) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const points = [...pointers.current.values()];
          if (points.length === 2) {
            const d = Math.hypot(
              points[0].x - points[1].x,
              points[0].y - points[1].y,
            );
            if (distance.current) adjust(d / distance.current);
            distance.current = d;
          } else if (zoom > 1)
            setPan((p) => ({
              x: p.x + e.clientX - prev.x,
              y: p.y + e.clientY - prev.y,
            }));
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          distance.current = 0;
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          distance.current = 0;
        }}
      >
        <img
          draggable={false}
          src={url}
          alt=""
          onError={onImageError}
          style={{
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          }}
        />
      </div>
      <p className="hint">
        16:9 · ピンチで拡大、ドラッグで移動 · 横向きでの閲覧を推奨
      </p>
    </section>
  );
}
