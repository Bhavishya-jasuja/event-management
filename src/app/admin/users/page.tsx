import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import UserBlockButton from "./UserBlockButton";
import { ShieldOff, ShieldCheck, User, Building2, ShieldAlert } from "lucide-react";

const roleConfig = {
  PLAYER:  { label: "Player",  icon: User,        class: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
  OWNER:   { label: "Owner",   icon: Building2,   class: "bg-purple-400/10 text-purple-400 border-purple-400/20" },
  ADMIN:   { label: "Admin",   icon: ShieldAlert, class: "bg-primary/10 text-primary border-primary/20" },
};

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { bookings: true, venues: true } },
    },
  });

  const totalBlocked = users.filter((u) => u.isBlacklisted).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">
          {users.length} total users · {totalBlocked} blocked
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {(["PLAYER", "OWNER", "ADMIN"] as const).map((role) => {
          const cfg = roleConfig[role];
          const count = users.filter((u) => u.role === role).length;
          return (
            <div key={role} className={`rounded-xl border p-4 ${cfg.class}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium opacity-80">{cfg.label}s</span>
                <cfg.icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold mt-2">{count}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">User</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Role</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Bookings</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Venues</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Joined</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-left px-5 py-3 text-muted-foreground font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const role = user.role ?? "PLAYER";
              const cfg = roleConfig[role as keyof typeof roleConfig];
              const isCurrentAdmin = user.id === session.user.id;

              return (
                <tr key={user.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                    {user.phone && <div className="text-xs text-muted-foreground">{user.phone}</div>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.class}`}>
                      <cfg.icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{user._count.bookings}</td>
                  <td className="px-5 py-4 text-muted-foreground">{user._count.venues}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-4">
                    {user.isBlacklisted ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
                        <ShieldOff className="h-3 w-3" />
                        Blocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-green-400/30 bg-green-400/10 text-green-400">
                        <ShieldCheck className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <a href={`/admin/users/${user.id}`} className="text-primary hover:underline text-sm font-medium">
                        View
                      </a>
                      {!isCurrentAdmin && role !== "ADMIN" && (
                        <UserBlockButton
                          userId={user.id}
                          isBlacklisted={user.isBlacklisted}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
