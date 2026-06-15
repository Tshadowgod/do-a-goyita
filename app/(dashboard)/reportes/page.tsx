"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatCurrency, EXPENSE_CATEGORIES } from "@/lib/utils";
import { Target, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const COLORS = ["#16a34a", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#475569"];

const categoryLabel = (v: string) => EXPENSE_CATEGORIES.find((c) => c.value === v)?.label ?? v;

interface ReportData {
  salesTotal:          number;
  salesCount:          number;
  expensesTotal:       number;
  expensesByCategory:  { category: string; total: string }[];
}

export default function ReportesPage() {
  const [data,    setData]    = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from,    setFrom]    = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  async function load() {
    setLoading(true);
    const res  = await fetch(`/api/reportes?from=${from}&to=${to}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const net = data ? data.salesTotal - data.expensesTotal : 0;

  const pieData = data?.expensesByCategory.map((e) => ({
    name:  categoryLabel(e.category),
    value: parseFloat(e.total),
  })) ?? [];

  const summaryCards = data ? [
    { label: "Ingresos",     value: formatCurrency(data.salesTotal),    icon: TrendingUp,   color: "text-green-600",  bg: "bg-green-50" },
    { label: "Ventas (#)",   value: String(data.salesCount),            icon: DollarSign,   color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "Egresos",      value: formatCurrency(data.expensesTotal), icon: TrendingDown, color: "text-red-600",    bg: "bg-red-50" },
    { label: "Ganancia",     value: formatCurrency(net),                icon: Target,       color: net >= 0 ? "text-green-600" : "text-red-600", bg: net >= 0 ? "bg-green-50" : "bg-red-50" },
  ] : [];

  return (
    <div>
      <Header title="Reportes" subtitle="Análisis financiero de tu negocio" />

      {/* Date filter */}
      <Card className="mb-6 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <Input label="Desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
          <Input label="Hasta" type="date" value={to}   onChange={(e) => setTo(e.target.value)}   className="w-auto" />
          <Button onClick={load} loading={loading}>Ver reporte</Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
        </div>
      ) : data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {summaryCards.map((s) => (
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

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Comparison bar chart */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-slate-800">Ingresos vs Egresos</h3>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[{ name: "Período", Ingresos: data.salesTotal, Egresos: data.expensesTotal, Ganancia: Math.max(0, net) }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Bs ${v}`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="Ingresos"  fill="#16a34a" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Egresos"   fill="#ef4444" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Ganancia"  fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expenses by category pie */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-slate-800">Egresos por categoría</h3>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">Sin egresos en este período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Break-even */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-800">Análisis de Punto de Equilibrio</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Ingresos del período</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.salesTotal)}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl">
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Total egresos</p>
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(data.expensesTotal)}</p>
                  </div>
                  <div className={`p-4 rounded-xl ${net >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                    <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Resultado neto</p>
                    <p className={`text-2xl font-bold ${net >= 0 ? "text-green-700" : "text-red-700"}`}>{formatCurrency(net)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  {net >= 0 ? (
                    <Badge variant="green" className="text-sm px-4 py-2">
                      ✓ Negocio rentable en este período · Margen: {data.salesTotal > 0 ? ((net / data.salesTotal) * 100).toFixed(1) : 0}%
                    </Badge>
                  ) : (
                    <Badge variant="red" className="text-sm px-4 py-2">
                      ✗ Pérdida neta de {formatCurrency(Math.abs(net))} en este período
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
