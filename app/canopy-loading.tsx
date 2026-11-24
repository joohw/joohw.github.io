"use client";

import { useEffect, useState } from "react";
import { useBlogLanguage } from "./blog-language";

export type CanopyLoadState = {
  phase: "loading" | "preparing" | "ready" | "fallback" | "error";
  loaded: number;
  total: number;
  slow: boolean;
};

const copy = {
  en: {
    loading: "Loading background…",
    slow: "Connection is slow. Still loading…",
    preparing: "Preparing animation…",
    ready: "Background ready",
    fallback: "Animation unavailable. Showing a still image.",
    error: "Background could not load. Refresh to retry.",
    progress: "Background loading progress",
  },
  zh: {
    loading: "正在加载背景…",
    slow: "网络较慢，仍在加载…",
    preparing: "正在准备动画…",
    ready: "背景已就绪",
    fallback: "动画暂不可用，已显示静态背景。",
    error: "背景加载失败，请刷新重试。",
    progress: "背景加载进度",
  },
};

export function CanopyLoading({ state }: { state: CanopyLoadState }) {
  const { language } = useBlogLanguage();
  const [fading, setFading] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    setFading(false);
    setRemoved(false);
    const delay = state.phase === "ready" ? 350 : state.phase === "fallback" ? 5000 : null;
    if (delay === null) return;
    let removalTimer: number | undefined;
    const fadeTimer = window.setTimeout(() => {
      setFading(true);
      removalTimer = window.setTimeout(() => setRemoved(true), 220);
    }, delay);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removalTimer);
    };
  }, [state.phase]);

  const text = copy[language];
  const showProgress = state.phase === "loading" || state.phase === "preparing" || state.phase === "ready";
  const total = Math.max(0, state.total);
  const loaded = Math.max(0, Math.min(total, state.loaded));
  const percent = state.phase === "loading" ? (total ? Math.round(loaded / total * 100) : 0) : 100;
  const message = state.phase === "loading" && state.slow ? text.slow : text[state.phase];
  const valueText = state.phase === "loading"
    ? language === "zh" ? `已加载 ${loaded} 张，共 ${total} 张` : `${loaded} of ${total} images loaded`
    : message;

  return (
    <>
      <noscript><style>{".canopy-loading { display: none !important; }"}</style></noscript>
      {!removed && (
        <div className="canopy-loading" data-fading={fading ? "true" : undefined}>
          <div className="canopy-loading-label">
            <span role="status" aria-live="polite" aria-atomic="true">{message}</span>
            {showProgress && <span className="canopy-loading-percent" aria-hidden="true">{percent}%</span>}
          </div>
          {showProgress && (
            <div
              className="canopy-loading-track"
              role="progressbar"
              aria-label={text.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-valuetext={valueText}
            >
              <span className="canopy-loading-fill" style={{ transform: `scaleX(${percent / 100})` }} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
