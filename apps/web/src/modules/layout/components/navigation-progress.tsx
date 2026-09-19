"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingBar } from "@/src/modules/layout/components/loading-bar";

const MAX_PROGRESS = 92;

const getNavigationKey = () => `${window.location.pathname}${window.location.search}`;

const isInternalNavigation = (anchor: HTMLAnchorElement) => {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;

  const destination = new URL(href, window.location.href);
  if (destination.origin !== window.location.origin) return false;

  return `${destination.pathname}${destination.search}` !== getNavigationKey();
};

export const NavigationProgress = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigationKey = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedFromRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    progressTimerRef.current = null;
    finishTimerRef.current = null;
  }, []);

  const start = useCallback(() => {
    clearTimers();
    startedFromRef.current = navigationKey;
    setLoading(true);
    setProgress((current) => Math.max(current, 8));

    let nextProgress = 8;
    progressTimerRef.current = setInterval(() => {
      nextProgress += Math.max(0.6, (MAX_PROGRESS - nextProgress) * 0.08);
      setProgress(Math.min(MAX_PROGRESS, nextProgress));
    }, 180);
  }, [clearTimers, navigationKey]);

  const finish = useCallback(() => {
    clearTimers();
    setProgress(100);
    finishTimerRef.current = setTimeout(() => {
      setLoading(false);
      setProgress(0);
      startedFromRef.current = null;
    }, 220);
  }, [clearTimers]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (anchor instanceof HTMLAnchorElement && isInternalNavigation(anchor)) start();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [start]);

  useEffect(() => {
    if (loading && startedFromRef.current !== null && startedFromRef.current !== navigationKey) finish();
  }, [finish, loading, navigationKey]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (!loading) return null;

  return <LoadingBar progress={progress} />;
};
