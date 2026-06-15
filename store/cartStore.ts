"use client";
import { create } from "zustand";
import type { CartItem } from "@/types";

interface CartStore {
  items:      CartItem[];
  addItem:    (item: CartItem) => void;
  removeItem: (productId: number) => void;
  updateQty:  (productId: number, quantity: number) => void;
  clearCart:  () => void;
  total:      () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem(item) {
    set((state) => {
      const existing = state.items.find((i) => i.productId === item.productId);
      if (existing) {
        const max = item.stock ?? existing.stock ?? Infinity;
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: Math.min(i.quantity + item.quantity, max), stock: item.stock ?? i.stock }
              : i
          ),
        };
      }
      const max = item.stock ?? Infinity;
      return { items: [...state.items, { ...item, quantity: Math.min(item.quantity, max) }] };
    });
  },

  removeItem(productId) {
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }));
  },

  updateQty(productId, quantity) {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(quantity, i.stock ?? Infinity) }
          : i
      ),
    }));
  },

  clearCart() {
    set({ items: [] });
  },

  total() {
    return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },
}));
