"use client";

import { useState, useSyncExternalStore } from "react";

export const packageManagers = ["vlt", "npm", "pnpm", "yarn", "deno", "bun"] as const;

export type PackageManager = (typeof packageManagers)[number];

export const isPackageManager = (maybePm: unknown): maybePm is PackageManager =>
  packageManagers.includes(maybePm as PackageManager);

const COOKIE = "preferred-package-manager";
const EVENT = "preferred-package-manager-change";
const MAX_AGE = 60 * 60 * 24 * 365;
const DEFAULT: PackageManager = "vlt";

const readCookie = (): PackageManager => {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  const value = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isPackageManager(value) ? value : DEFAULT;
};

const subscribe = (callback: () => void) => {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
};

// pages are prerendered, so the server snapshot is always the default and the stored choice applies after hydration
export const usePreferredPackageManager = () => {
  const preferredPm = useSyncExternalStore(subscribe, readCookie, () => DEFAULT);

  const setPreferredPm = (pm: PackageManager) => {
    document.cookie = `${COOKIE}=${pm}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
    window.dispatchEvent(new Event(EVENT));
  };

  return { preferredPm, setPreferredPm };
};

// controlled-tabs props for tabs labelled by package manager: they open on (and set) the stored preference;
// other tabs keep a local selection
export const usePackageManagerTabs = (labels: (string | undefined)[]) => {
  const [picked, setPicked] = useState("0");
  const { preferredPm, setPreferredPm } = usePreferredPackageManager();
  const pmTab = labels.findIndex((label) => label?.toLowerCase() === preferredPm);
  const onValueChange = (next: string) => {
    const pm = labels[Number(next)]?.toLowerCase();
    if (isPackageManager(pm)) setPreferredPm(pm);
    else setPicked(next);
  };
  return {
    value: pmTab === -1 ? picked : String(pmTab),
    onValueChange,
  };
};
