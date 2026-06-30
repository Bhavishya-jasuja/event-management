import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import OwnerSidebar from "@/components/owner/OwnerSidebar";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session || session.user.role !== "OWNER") redirect("/login");

  return (
    <div className="min-h-screen bg-background flex">
      <OwnerSidebar ownerName={session.user.name ?? "Owner"} />
      <main className="flex-1 ml-60 p-8">
        {children}
      </main>
    </div>
  );
}
