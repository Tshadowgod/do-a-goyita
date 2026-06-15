"use client";
import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Package, AlertTriangle,
  DollarSign, Target, ShoppingCart,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Header } from "@/components/Header";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardStats, SalesChartPoint } from "@/types";

interface DashboardData {
  stats: DashboardStats;
  chart: SalesChartPoint[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { stats, chart } = data ?? { stats: null, chart: [] };

  const statCards = stats ? [
    {
      label: "Ingresos del Mes",
      value: formatCurrency(stats.salesThisMonth),
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Costo de Productos",
      value: formatCurrency(stats.cogsThisMonth),
      icon: ShoppingCart,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Egresos del Mes",
      value: formatCurrency(stats.expensesThisMonth),
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Ganancia Neta",
      value: formatCurrency(stats.netIncome),
      icon: DollarSign,
      color: stats.netIncome >= 0 ? "text-green-600" : "text-red-600",
      bg: stats.netIncome >= 0 ? "bg-green-50" : "bg-red-50",
    },
  ] : [];

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={`Resumen de tu negocio · ${formatDate(new Date())}`}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{s.value}</p>
                </div>
                <div className={`${s.bg} p-2 rounded-xl`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold text-slate-800">Ingresos vs Egresos (últimos 30 días)</h3>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f08a1e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f08a1e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gEgresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Bs ${v}`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => formatDate(l)} />
                <Legend />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#f08a1e" fill="url(#gIngresos)" strokeWidth={2} />
                <Area type="monotone" dataKey="egresos"  name="Egresos"  stroke="#ef4444" fill="url(#gEgresos)"  strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Break-even */}
          {stats && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Punto de Equilibrio</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Costos fijos</span>
                  <span className="font-medium">{formatCurrency(stats.breakEven.fixedCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Necesito vender</span>
                  <span className="font-medium">{formatCurrency(stats.breakEven.breakEvenRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">He vendido</span>
                  <span className="font-medium text-brand-700">{formatCurrency(stats.breakEven.currentRevenue)}</span>
                </div>
                <div className="pt-1 border-t border-slate-100">
                  {stats.breakEven.isCovered ? (
                    <Badge variant="green" className="w-full justify-center py-1">
                      ✓ Punto de equilibrio cubierto ({stats.breakEven.marginOfSafety.toFixed(1)}% margen)
                    </Badge>
                  ) : (
                    <Badge variant="red" className="w-full justify-center py-1">
                      Faltan {formatCurrency(stats.breakEven.breakEvenRevenue - stats.breakEven.currentRevenue)}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inventory alerts */}
          {stats && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Inventario</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total productos</span>
                  <span className="font-medium">{stats.totalProducts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Stock bajo</span>
                  {stats.lowStockProducts > 0 ? (
                    <Badge variant="yellow">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {stats.lowStockProducts} productos
                    </Badge>
                  ) : (
                    <Badge variant="green">Todo en orden</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
