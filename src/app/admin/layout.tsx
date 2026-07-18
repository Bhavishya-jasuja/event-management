import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") {
    if (session.user.role === "OWNER") redirect("/owner/dashboard");
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <main className="flex-1 ml-60 p-8">
        {children}
      </main>
    </div>
  );
}
