import { Sidebar, BottomNav, MobileTopBar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <MobileTopBar />
        <div className="p-4 md:p-8 pb-20 md:pb-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
