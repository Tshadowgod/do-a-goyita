import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Doña Goyita | Sistema de Ventas",
  description: "Sistema POS para gestión de ventas e inventario",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { background: "#1e293b", color: "#f8fafc", fontSize: "14px" },
          }}
        />
      </body>
    </html>
  );
}
