export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

export interface DashboardStats {
  salesToday:        number;
  profitToday:       number;
  salesThisMonth:    number;
  cogsThisMonth:     number;
  grossProfit:       number;
  expensesThisMonth: number;
  netIncome:         number;
  totalProducts:     number;
  lowStockProducts:  number;
  breakEven:         BreakEvenData;
}

export interface BreakEvenData {
  fixedCosts:       number;
  variableCostRatio: number;
  breakEvenRevenue: number;
  currentRevenue:   number;
  isCovered:        boolean;
  marginOfSafety:   number;
}

export interface SalesChartPoint {
  date:     string;
  ingresos: number;
  egresos:  number;
}

export interface AIDetectResult {
  name:        string;
  description: string;
  category:    string;
  unit:        string;
  barcode?:    string;
}
