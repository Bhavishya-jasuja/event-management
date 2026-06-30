import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Users, Clock, CheckCircle, XCircle, TrendingUp, IndianRupee, CalendarCheck, ShieldAlert, ChevronRight } from "lucide-react";

function getDisplayStatus(status: string, slotDate: Date, endTime: string) {
  if (status !== "CONFIRMED") return status;
  const [h, m] = endTime.split(":").map(Number);
  const end = new Date(slotDate);
  end.setHours(h, m, 0, 0);
  return end < new Date() ? "COMPLETED" : "CONFIRMED";
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers, totalOwners, totalPlayers,
    pendingVenues, activeVenues, rejectedVenues, suspendedVenues,
    totalBookings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "OWNER" } }),
    prisma.user.count({ where: { role: "PLAYER" } }),
    prisma.venue.count({ where: { status: "PENDING" } }),
    prisma.venue.count({ where: { status: "ACTIVE" } }),
    prisma.venue.count({ where: { status: "REJECTED" } }),
    prisma.venue.count({ where: { status: "SUSPENDED" } }),
    prisma.booking.count(),
  ]);

  const [recentBookings, pendingVenueList, recentUsers, revenueAgg, monthRevenueAgg] = await Promise.all([
    prisma.booking.findMany({
      include: {
        player: { select: { name: true } },
        slot:   { include: { court: { include: { venue: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.venue.findMany({
      where: { status: "PENDING" },
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.booking.aggregate({ where: { status: "CONFIRMED" }, _sum: { totalAmount: true } }),
    prisma.booking.aggregate({ where: { status: "CONFIRMED", slot: { date: { gte: monthStart } } }, _sum: { totalAmount: true } }),
  ]);

  const totalRevenue = revenueAgg._sum.totalAmount ?? 0;
  const monthRevenue = monthRevenueAgg._sum.totalAmount ?? 0;

  const todayBookingsCount = recentBookings.filter((b) =>
    new Date(b.slot.date) >= todayStart
  ).length;

  const statusColor: Record<string, string> = {
    CONFIRMED: "bg-green-400/15 text-green-400 border-green-400/30",
    COMPLETED: "bg-purple-400/15 text-purple-400 border-purple-400/30",
    CANCELLED: "bg-destructive/15 text-destructive border-destructive/30",
    PENDING:   "bg-yellow-400/15 text-yellow-400 border-yellow-400/30",
  };

  const roleColor: Record<string, string> = {
    PLAYER: "bg-primary/15 text-primary border-primary/30",
    OWNER:  "bg-blue-400/15 text-blue-400 border-blue-400/30",
    ADMIN:  "bg-purple-400/15 text-purple-400 border-purple-400/30",
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {session.user.name?.split(" ")[0]}.</p>
        </div>
        {pendingVenues > 0 && (
          <Link href="/admin/venues" className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 px-4 py-2 rounded-xl text-sm font-medium hover:bg-yellow-400/20 transition-colors">
            <ShieldAlert className="h-4 w-4" /> {pendingVenues} venue{pendingVenues !== 1 ? "s" : ""} need review
          </Link>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Platform GMV",     value: `₹${totalRevenue.toLocaleString("en-IN")}`, sub: "all confirmed", icon: IndianRupee,   color: "text-primary",    border: "border-primary/20",    bg: "bg-primary/5" },
          { label: "This Month",       value: `₹${monthRevenue.toLocaleString("en-IN")}`, sub: "revenue",       icon: TrendingUp,    color: "text-green-400",  border: "border-green-400/20",  bg: "bg-green-400/5" },
          { label: "Total Bookings",   value: totalBookings,                               sub: "all time",      icon: CalendarCheck, color: "text-blue-400",   border: "border-blue-400/20",   bg: "bg-blue-400/5" },
          { label: "Total Users",      value: totalUsers,                                  sub: `${totalOwners} owners · ${totalPlayers} players`, icon: Users, color: "text-yellow-400", border: "border-yellow-400/20", bg: "bg-yellow-400/5" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Venue health */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "Active",    value: activeVenues,    icon: CheckCircle, color: "text-green-400",    border: "border-green-400/20",    bg: "bg-green-400/5" },
          { label: "Pending",   value: pendingVenues,   icon: Clock,       color: "text-yellow-400",   border: "border-yellow-400/20",   bg: "bg-yellow-400/5" },
          { label: "Rejected",  value: rejectedVenues,  icon: XCircle,     color: "text-destructive",  border: "border-destructive/20",  bg: "bg-destructive/5" },
          { label: "Suspended", value: suspendedVenues, icon: Building2,   color: "text-orange-400",   border: "border-orange-400/20",   bg: "bg-orange-400/5" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-4 text-center`}>
            <s.icon className={`h-5 w-5 ${s.color} mx-auto mb-1`} />
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label} Venues</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Recent bookings */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Recent Bookings</h2>
            <Link href="/admin/bookings" className="text-sm text-primary hover:underline flex items-center gap-1">
              All <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/40 divide-y divide-border/30">
            {recentBookings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No bookings yet</div>
            ) : recentBookings.map((b) => {
              const ds = getDisplayStatus(b.status, new Date(b.slot.date), b.slot.endTime);
              return (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{b.player.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{b.slot.court.venue.name} · {b.slot.startTime}–{b.slot.endTime}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-primary">₹{b.totalAmount}</div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor[ds] ?? ""}`}>{ds}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-2 space-y-6">
          {/* Pending venues */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Pending Venues</h2>
              <Link href="/admin/venues" className="text-sm text-primary hover:underline">Review all</Link>
            </div>
            {pendingVenueList.length === 0 ? (
              <div className="rounded-xl border border-border/50 bg-card/40 p-6 text-center text-sm text-muted-foreground">
                All caught up ✓
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 bg-card/40 divide-y divide-border/30">
                {pendingVenueList.map((v) => (
                  <Link key={v.id} href={`/admin/venues/${v.id}`}>
                    <div className="px-4 py-3 hover:bg-secondary/20 transition-colors">
                      <div className="text-sm font-medium">{v.name}</div>
                      <div className="text-xs text-muted-foreground">{v.owner.name} · {v.city}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent users */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">New Users</h2>
              <Link href="/admin/users" className="text-sm text-primary hover:underline">All users</Link>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/40 divide-y divide-border/30">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {u.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                  </div>
                  {u.role && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${roleColor[u.role] ?? ""}`}>{u.role}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
