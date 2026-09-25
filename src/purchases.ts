import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';

type PurchasesModule = typeof import('@revenuecat/purchases-capacitor').Purchases;

/** Free tier: cases beyond this count require the full-library unlock. */
export const FREE_CASE_LIMIT = 5;

const ENTITLEMENT_ID = 'full_library';
const UNLOCK_CACHE_KEY = 'foulplay:full-library-unlocked';

// Public RevenueCat API key for the iOS app (the "public" app-specific key from
// the RevenueCat dashboard — safe to ship in the client, it is not a secret).
// Fill this in once the RevenueCat project + App Store Connect product exist
// (see README → "Monetization"). Purchases silently no-op until it's set.
const REVENUECAT_IOS_API_KEY = 'REPLACE_WITH_REVENUECAT_PUBLIC_API_KEY';

let purchasesModule: typeof import('@revenuecat/purchases-capacitor') | null = null;
let configured: Promise<PurchasesModule> | null = null;
const listeners = new Set<(unlocked: boolean) => void>();

function readCache(): boolean {
  try {
    return localStorage.getItem(UNLOCK_CACHE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCache(unlocked: boolean): void {
  try {
    localStorage.setItem(UNLOCK_CACHE_KEY, unlocked ? '1' : '0');
  } catch {
    /* private mode etc.: the unlock still applies for this session */
  }
  listeners.forEach((fn) => fn(unlocked));
}

/** Purchases only exist on iOS: the web build is never gated. */
function gated(): boolean {
  return Capacitor.isNativePlatform() && REVENUECAT_IOS_API_KEY !== 'REPLACE_WITH_REVENUECAT_PUBLIC_API_KEY';
}

async function getPurchases(): Promise<PurchasesModule> {
  if (!configured) {
    configured = (async () => {
      purchasesModule ??= await import('@revenuecat/purchases-capacitor');
      const { Purchases } = purchasesModule;
      await Purchases.configure({ apiKey: REVENUECAT_IOS_API_KEY });
      Purchases.addCustomerInfoUpdateListener((info) => writeCache(!!info.entitlements.active[ENTITLEMENT_ID]));
      return Purchases;
    })();
  }
  return configured;
}

export function isUnlocked(): boolean {
  return !gated() || readCache();
}

export function subscribeUnlocked(fn: (unlocked: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Re-checks entitlement status with RevenueCat (e.g. on app start). */
export async function refreshEntitlement(): Promise<boolean> {
  if (!gated()) return true;
  const Purchases = await getPurchases();
  const { customerInfo } = await Purchases.getCustomerInfo();
  const unlocked = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  writeCache(unlocked);
  return unlocked;
}

export function useUnlocked(): boolean {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  useEffect(() => {
    void refreshEntitlement().catch(() => undefined);
    return subscribeUnlocked(setUnlocked);
  }, []);
  return unlocked;
}

export interface UnlockOffer {
  priceString: string;
  purchase: () => Promise<boolean>;
}

/** The one-time "full library" package to buy, or null if unavailable/not gated. */
export async function getUnlockOffer(): Promise<UnlockOffer | null> {
  if (!gated()) return null;
  const Purchases = await getPurchases();
  const offerings = await Purchases.getOfferings();
  const pkg: PurchasesPackage | null = offerings.current?.lifetime ?? offerings.current?.availablePackages[0] ?? null;
  if (!pkg) return null;
  return {
    priceString: pkg.product.priceString,
    purchase: async () => {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      const unlocked = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
      writeCache(unlocked);
      return unlocked;
    },
  };
}

/** @returns whether the entitlement is active after restoring. */
export async function restorePurchases(): Promise<boolean> {
  if (!gated()) return true;
  const Purchases = await getPurchases();
  const { customerInfo } = await Purchases.restorePurchases();
  const unlocked = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  writeCache(unlocked);
  return unlocked;
}
