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
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, item] };
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
        i.productId === productId ? { ...i, quantity } : i
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
