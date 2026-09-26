"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartLine, Product } from "@/lib/types";

type CartState = {
  owner: string | null;
  items: CartLine[];
  setOwner: (owner: string | null) => void;
  add: (product: Product, quantity?: number) => void;
  remove: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      owner: null,
      items: [],
      setOwner: (owner) =>
        set((state) => {
          if (state.owner === owner) return state;
          if (state.owner && !owner) return { owner, items: [] };
          if (state.owner && owner) return { owner, items: [] };
          return { owner, items: state.items };
        }),
      add: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find(
            (line) => line.product.id === product.id,
          );
          const safeQuantity = Math.max(1, Math.min(quantity, product.stock));
          if (!existing) {
            return {
              items: [...state.items, { product, quantity: safeQuantity }],
            };
          }
          return {
            items: state.items.map((line) =>
              line.product.id === product.id
                ? {
                    ...line,
                    quantity: Math.min(
                      product.stock,
                      line.quantity + safeQuantity,
                    ),
                  }
                : line,
            ),
          };
        }),
      remove: (productId) =>
        set((state) => ({
          items: state.items.filter((line) => line.product.id !== productId),
        })),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items
            .map((line) =>
              line.product.id === productId
                ? {
                    ...line,
                    quantity: Math.min(
                      line.product.stock,
                      Math.max(1, quantity),
                    ),
                  }
                : line,
            )
            .filter((line) => line.quantity > 0),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "mosameli-cart-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ owner: state.owner, items: state.items }),
    },
  ),
);
