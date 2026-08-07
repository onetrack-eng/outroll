'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Client-side "campaign builder" cart. Artists are guest-only (spec section 2) — there's no
// server session to hold a pending campaign in, so the in-progress pitch list lives in the
// browser (localStorage) until checkout, when it's submitted and turned into real Holds.
export interface CartItem {
  listingId: string;
  curatorDisplayName: string;
  platformLabel: string;
  genre: string;
  priceCents: number;
  assetLink: string;
  narrative: string;
  context: string;
}

interface CartContextValue {
  items: CartItem[];
  hydrated: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (listingId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'pfm_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore malformed/blocked storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function addItem(item: CartItem) {
    setItems((prev) => [...prev.filter((i) => i.listingId !== item.listingId), item]);
  }

  function removeItem(listingId: string) {
    setItems((prev) => prev.filter((i) => i.listingId !== listingId));
  }

  function clear() {
    setItems([]);
  }

  return (
    <CartContext.Provider value={{ items, hydrated, addItem, removeItem, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
