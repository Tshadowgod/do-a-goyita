"use client";
import { useCallback, useEffect, useState } from "react";
import { Barcode, Search, Camera, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { Cart } from "@/components/pos/Cart";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/db/schema";

export default function POSPage() {
  const [products,       setProducts]       = useState<Product[]>([]);
  const [query,          setQuery]          = useState("");
  const [scanning,       setScanning]       = useState(false);
  const [cartOpen,       setCartOpen]       = useState(false);
  const { addItem, items } = useCartStore();

  const searchProducts = useCallback(async (q: string) => {
    const url = q ? `/api/productos?q=${encodeURIComponent(q)}` : "/api/productos";
    const res  = await fetch(url);
    const data = await res.json();
    setProducts(data.filter((p: Product) => p.active && (p.quantity ?? 0) > 0));
  }, []);

  useEffect(() => {
    searchProducts(query);
  }, [query, searchProducts]);

  async function handleBarcode(barcode: string) {
    setScanning(false);
    const res  = await fetch(`/api/productos?barcode=${encodeURIComponent(barcode)}`);
    const data = await res.json();
    const product: Product = data[0];

    if (!product) {
      toast.error(`Producto no encontrado: ${barcode}`);
      return;
    }
    if ((product.quantity ?? 0) <= 0) {
      toast.error(`Sin stock: ${product.name}`);
      return;
    }

    addItem({ productId: product.id, name: product.name, price: parseFloat(product.price), quantity: 1, imageUrl: product.imageUrl });
    toast.success(`Agregado: ${product.name}`);
    setCartOpen(true);
  }

  function addToCart(p: Product) {
    if ((p.quantity ?? 0) <= 0) {
      toast.error("Sin stock disponible");
      return;
    }
    addItem({ productId: p.id, name: p.name, price: parseFloat(p.price), quantity: 1, imageUrl: p.imageUrl });
    toast.success(`Agregado: ${p.name}`);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Products panel */}
      <div className="flex-1">
        <Header
          title="Punto de Venta"
          action={
            <Button onClick={() => setCartOpen(true)} variant="outline" className="lg:hidden relative">
              <ShoppingCart className="h-4 w-4" />
              {items.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Button>
          }
        />

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Buscar producto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" onClick={() => setScanning(true)}>
            <Barcode className="h-4 w-4" />
            <span className="hidden sm:inline">Escanear</span>
          </Button>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Search className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {products.map((p) => (
              <Card key={p.id} onClick={() => addToCart(p)} className="p-3 select-none active:scale-95 transition-transform">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-24 object-cover rounded-lg mb-2" />
                ) : (
                  <div className="w-full h-24 bg-slate-100 rounded-lg mb-2 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-slate-300" />
                  </div>
                )}
                <p className="text-xs font-semibold text-slate-900 line-clamp-2 leading-tight">{p.name}</p>
                <p className="text-sm font-bold text-brand-700 mt-1">{formatCurrency(p.price)}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-500">{p.quantity} {p.unit}</span>
                  {(p.quantity ?? 0) <= (p.minStock ?? 5) && (
                    <Badge variant="yellow" className="text-[10px] px-1">Bajo</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cart — desktop always visible, mobile as overlay */}
      <div className={`
        lg:w-80 lg:relative lg:block
        ${cartOpen ? "fixed inset-y-0 right-0 z-40 w-full max-w-sm" : "hidden"}
      `}>
        <div className="lg:sticky lg:top-0 bg-white rounded-2xl border border-slate-200 shadow-lg h-full lg:h-auto p-5 flex flex-col lg:max-h-[calc(100vh-4rem)] max-h-screen">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Carrito</h2>
            <button onClick={() => setCartOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <Cart onSaleComplete={() => { setCartOpen(false); searchProducts(query); }} />
        </div>
      </div>

      {scanning && (
        <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanning(false)} />
      )}
    </div>
  );
}
