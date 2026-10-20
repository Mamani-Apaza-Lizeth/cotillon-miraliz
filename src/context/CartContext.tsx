// Contador del carrito para la cabecera; el contenido real vive en la tabla cart_items.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { countCart } from '../services/cart';
import { useAuth } from './AuthContext';

interface CartState {
  count: number;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [count, setCount] = useState(0);
  const userId = session?.user.id ?? null;

  const refresh = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    try {
      setCount(await countCart());
    } catch {
      /* el contador no es crítico */
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ count, refresh }), [count, refresh]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>.');
  return ctx;
}
