"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  ClipboardList,
  Package,
  TrendingDown,
  BarChart2,
  LogOut,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

function useLogout() {
  const router = useRouter();
  return async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };
}

const NAV = [
  { href: "/dashboard",  label: "Dashboard",        icon: LayoutDashboard },
  { href: "/pos",        label: "Punto de Venta",   icon: ShoppingCart },
  { href: "/pedidos",    label: "Pedidos",           icon: ClipboardList },
  { href: "/ventas",     label: "Ventas",            icon: Receipt },
  { href: "/inventario", label: "Inventario",        icon: Package },
  { href: "/egresos",      label: "Egresos",           icon: TrendingDown },
  { href: "/proveedores", label: "Proveedores",       icon: Truck },
  { href: "/reportes",    label: "Reportes",          icon: BarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 bg-slate-900 min-h-screen shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <img src="/logo.png" alt="Doña Goyita" className="h-10 w-10 rounded-xl object-cover bg-white" />
        <div>
          <p className="text-white font-bold text-sm leading-tight">Doña Goyita</p>
          <p className="text-slate-400 text-xs">Sistema de Ventas</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-brand-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-800 space-y-2">
        <LogoutButton />
        <p className="text-xs text-slate-500 text-center">v1.0 · Doña Goyita</p>
      </div>
    </aside>
  );
}

function LogoutButton() {
  const logout = useLogout();
  return (
    <button
      onClick={logout}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
    >
      <LogOut className="h-5 w-5 shrink-0" />
      Cerrar sesión
    </button>
  );
}

export function MobileTopBar() {
  const logout = useLogout();
  return (
    <div className="md:hidden sticky top-0 z-30 flex items-center gap-2 bg-white border-b border-slate-200 px-4 py-2.5">
      <img src="/logo.png" alt="Doña Goyita" className="h-9 w-9 rounded-lg object-cover bg-white" />
      <div className="leading-tight flex-1">
        <p className="font-bold text-slate-900 text-sm">Doña Goyita</p>
        <p className="text-[11px] text-slate-400">Sistema de Ventas</p>
      </div>
      <button onClick={logout} className="text-slate-400 hover:text-red-600 p-1.5" title="Cerrar sesión">
        <LogOut className="h-5 w-5" />
      </button>
    </div>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 z-40">
      <div className="flex items-center justify-around">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-3 px-2 flex-1 transition-all",
                active ? "text-brand-400" : "text-slate-500"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
