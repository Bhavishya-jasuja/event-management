import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Users, Building2, CalendarCheck, ShieldCheck, TrendingUp } from "lucide-react";
import EditProfileForm from "@/components/shared/EditProfileForm";

function avatarGradient(name: string) {
  const colors = ["from-violet-500 to-purple-700", "from-blue-500 to-cyan-600", "from-green-500 to-emerald-700", "from-orange-500 to-red-600", "from-pink-500 to-rose-600"];
  return colors[name.charCodeAt(0) % colors.length];
}

export default async function AdminProfilePage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });
  if (!user) redirect("/login");

  const [totalUsers, totalVenues, totalBookings, activeVenues, pendingVenues, totalRevenue] = await Promise.all([
    prisma.user.count(),
    prisma.venue.count(),
    prisma.booking.count(),
    prisma.venue.count({ where: { status: "ACTIVE" } }),
    prisma.venue.count({ where: { status: "PENDING" } }),
    prisma.booking.aggregate({ where: { status: "CONFIRMED" }, _sum: { totalAmount: true } }),
  ]);

  const initials    = user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const gradient    = avatarGradient(user.name);
  const memberSince = user.createdAt.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const revenue     = totalRevenue._sum.totalAmount ?? 0;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Profile</h1>
        <p className="text-muted-foreground mt-1">Your account and platform overview</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Avatar + Identity */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card/40 p-6 text-center">
            <div className="relative mx-auto w-24 h-24 mb-4">
              <div className={`h-24 w-24 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                <ShieldCheck className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
              Administrator
            </span>
            <p className="text-xs text-muted-foreground mt-3">Since {memberSince}</p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <EditProfileForm initial={{ name: user.name, phone: user.phone ?? null }} />
            <div className="mt-3 pt-3 border-t border-border/30">
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground">Email</span>
                <span className="text-sm font-medium truncate max-w-[160px]">{user.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Platform Stats */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-lg">Platform Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Users",    value: totalUsers,   icon: Users,         color: "text-primary",    border: "border-primary/20",    bg: "bg-primary/5" },
              { label: "Total Venues",   value: totalVenues,  icon: Building2,     color: "text-blue-400",   border: "border-blue-400/20",   bg: "bg-blue-400/5" },
              { label: "Total Bookings", value: totalBookings,icon: CalendarCheck, color: "text-green-400",  border: "border-green-400/20",  bg: "bg-green-400/5" },
              { label: "Platform GMV",   value: `₹${revenue.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-yellow-400", border: "border-yellow-400/20", bg: "bg-yellow-400/5" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-5`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Venue health */}
          <div className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <h3 className="font-semibold mb-3">Venue Health</h3>
            <div className="space-y-3">
              {[
                { label: "Active",   count: activeVenues,              color: "bg-green-400",  total: totalVenues },
                { label: "Pending",  count: pendingVenues,             color: "bg-yellow-400", total: totalVenues },
                { label: "Other",    count: totalVenues - activeVenues - pendingVenues, color: "bg-destructive", total: totalVenues },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary/60">
                    <div className={`h-full rounded-full ${row.color}`} style={{ width: row.total > 0 ? `${(row.count / row.total) * 100}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Pending Venues",  href: "/admin/venues",    count: pendingVenues },
                { label: "All Users",       href: "/admin/users",     count: totalUsers },
                { label: "All Bookings",    href: "/admin/bookings",  count: totalBookings },
              ].map((a) => (
                <a key={a.href} href={a.href} className="flex items-center gap-2 text-sm border border-border/50 px-4 py-2 rounded-lg hover:border-primary/40 hover:text-primary transition-colors">
                  {a.label} <span className="bg-secondary/60 px-1.5 py-0.5 rounded text-xs">{a.count}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
