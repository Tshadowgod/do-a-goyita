"use client";
import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, Plus, Minus, Trash2, Search, CheckCircle2, Store, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";

interface StoreProduct {
  id: number;
  name: string;
  price: string;
  quantity: number;
  category: string | null;
  unit: string | null;
  imageUrl: string | null;
}

interface Line { productId: number; name: string; price: number; quantity: number; stock: number; }

export default function TiendaPage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState("");
  const [cat,      setCat]      = useState("");  // "" hasta cargar; luego la 1ra categoría
  const [cart,     setCart]     = useState<Line[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [name,     setName]     = useState("");
  const [notes,    setNotes]    = useState("");
  const [sending,  setSending]  = useState(false);
  const [done,     setDone]     = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/tienda/productos");
      setProducts(await res.json());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => products.filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query],
  );

  // Orden preferido de categorías; el resto va al final, "Otros" siempre último.
  const CAT_ORDER = ["Limpieza", "Cuidado del cabello", "Cuidado personal", "Hogar", "Bebidas", "Otros"];
  const catName = (c: string | null) => (c && c.trim() ? c.trim() : "Otros");
  const catRank = (c: string) => { const i = CAT_ORDER.indexOf(c); return i < 0 ? 98 : i; };

  // Lista de categorías existentes (para los botones de filtro).
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => catName(p.category)));
    return [...set].sort((a, b) => catRank(a) - catRank(b) || a.localeCompare(b));
  }, [products]);

  // Al cargar, abre directamente en la primera categoría (pestaña activa).
  useEffect(() => {
    if (!cat && categories.length) setCat(categories[0]);
  }, [categories, cat]);

  // Al buscar, se muestran TODAS las categorías que coincidan (ignora la pestaña).
  const searching = query.trim() !== "";

  // Productos agrupados por categoría, respetando búsqueda y pestaña activa.
  const grouped = useMemo(() => {
    const map = new Map<string, StoreProduct[]>();
    for (const p of filtered) {
      const c = catName(p.category);
      if (!searching && cat && c !== cat) continue;
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(p);
    }
    return [...map.entries()].sort((a, b) => catRank(a[0]) - catRank(b[0]) || a[0].localeCompare(b[0]));
  }, [filtered, cat, searching]);

  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const total     = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  function add(p: StoreProduct) {
    setCart((prev) => {
      const ex = prev.find((l) => l.productId === p.id);
      if (ex) {
        if (ex.quantity >= p.quantity) { toast.error(`Solo hay ${p.quantity} disponibles`); return prev; }
        return prev.map((l) => l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l);
      }
      return [...prev, { productId: p.id, name: p.name, price: parseFloat(p.price), quantity: 1, stock: p.quantity }];
    });
  }

  function setQty(productId: number, qty: number) {
    setCart((prev) => prev.flatMap((l) => {
      if (l.productId !== productId) return [l];
      if (qty <= 0) return [];
      return [{ ...l, quantity: Math.min(qty, l.stock) }];
    }));
  }

  async function submit() {
    if (!name.trim()) { toast.error("Escribe tu nombre"); return; }
    if (cart.length === 0) { toast.error("Tu carrito está vacío"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/tienda/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          notes,
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setDone(true);
      setCart([]);
      setCartOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al enviar el pedido");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <CheckCircle2 className="h-20 w-20 text-brand-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">¡Pedido enviado!</h1>
        <p className="text-slate-600 mt-2 max-w-sm">
          Gracias, <b>{name}</b>. Doña Goyita revisará y confirmará tu pedido. Pagas al recibirlo.
        </p>
        <button
          onClick={() => { setDone(false); setName(""); setNotes(""); load(); }}
          className="mt-6 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium"
        >
          Hacer otro pedido
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { background: "#1e293b", color: "#f8fafc", fontSize: "14px" } }} />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <img src="/logo.png" alt="Doña Goyita" className="h-10 w-10 rounded-xl object-cover" onError={(e) => { (e.currentTarget.style.display = "none"); }} />
        <div className="flex-1 leading-tight">
          <p className="font-bold text-slate-900">Doña Goyita</p>
          <p className="text-xs text-slate-400">Haz tu pedido en línea</p>
        </div>
        <button onClick={() => setCartOpen(true)} className="relative bg-brand-600 text-white rounded-xl p-2.5">
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{cartCount}</span>
          )}
        </button>
      </header>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Pestañas por categoría */}
        {!loading && categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mt-3 -mx-1 px-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => { setCat(c); setQuery(""); }}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                  !searching && cat === c
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-300 hover:border-brand-400"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products */}
      <div className="px-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Store className="h-12 w-12 mb-2 opacity-40" />
            <p className="text-sm">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-7">
            {grouped.map(([c, items]) => (
              <section key={c}>
                {(searching || grouped.length > 1) && (
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2.5 px-1">
                    {c} <span className="text-slate-400 font-normal normal-case">· {items.length}</span>
                  </h2>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map((p) => (
                    <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-28 object-cover rounded-xl mb-2" />
                      ) : (
                        <div className="w-full h-28 bg-slate-100 rounded-xl mb-2 flex items-center justify-center">
                          <Store className="h-8 w-8 text-slate-300" />
                        </div>
                      )}
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2 leading-tight flex-1">{p.name}</p>
                      <p className="text-base font-bold text-brand-700 mt-1">{formatCurrency(p.price)}</p>
                      <button onClick={() => add(p)} className="mt-2 w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-2 text-sm font-medium flex items-center justify-center gap-1">
                        <Plus className="h-4 w-4" /> Agregar
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} className="fixed bottom-4 inset-x-4 max-w-md mx-auto bg-brand-600 text-white rounded-2xl py-3 px-5 shadow-lg flex items-center justify-between z-30">
          <span className="font-medium">{cartCount} producto{cartCount !== 1 ? "s" : ""}</span>
          <span className="font-bold">Ver pedido · {formatCurrency(total)}</span>
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative ml-auto w-full max-w-md bg-white h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Tu pedido</h2>
              <button onClick={() => setCartOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.length === 0 ? (
                <p className="text-center text-slate-400 py-10 text-sm">Tu carrito está vacío</p>
              ) : cart.map((l) => (
                <div key={l.productId} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{l.name}</p>
                    <p className="text-xs text-brand-700">{formatCurrency(l.price)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(l.productId, l.quantity - 1)} className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                    <span className="w-7 text-center text-sm font-semibold">{l.quantity}</span>
                    <button onClick={() => setQty(l.productId, l.quantity + 1)} disabled={l.quantity >= l.stock} className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center disabled:opacity-40"><Plus className="h-3 w-3" /></button>
                  </div>
                  <p className="text-sm font-bold w-20 text-right">{formatCurrency(l.price * l.quantity)}</p>
                  <button onClick={() => setQty(l.productId, 0)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 p-4 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre *"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nota (opcional): ej. paso a las 5pm"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-brand-700">{formatCurrency(total)}</span>
              </div>
              <button
                onClick={submit}
                disabled={sending || cart.length === 0}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3 font-semibold disabled:opacity-50"
              >
                {sending ? "Enviando..." : "Enviar pedido"}
              </button>
              <p className="text-center text-xs text-slate-400">Pagas al recibir tu pedido.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
