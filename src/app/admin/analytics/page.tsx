import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { IndianRupee, TrendingUp, TrendingDown, Users, Building2, CalendarCheck } from "lucide-react";

function displayStatus(status: string, slotDate: Date, endTime: string) {
  if (status !== "CONFIRMED") return status;
  const [h, m] = endTime.split(":").map(Number);
  const end = new Date(slotDate);
  end.setHours(h, m, 0, 0);
  return end < new Date() ? "COMPLETED" : "CONFIRMED";
}

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart  = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 6);

  const [allBookings, allUsers, allVenues] = await Promise.all([
    prisma.booking.findMany({
      include: { slot: { include: { court: { include: { venue: { select: { id: true, name: true, city: true, ownerId: true } } } } } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({ select: { id: true, role: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
    prisma.venue.findMany({ select: { id: true, name: true, city: true, status: true, createdAt: true } }),
  ]);

  const confirmed = allBookings.filter((b) => b.status === "CONFIRMED");
  const cancelled = allBookings.filter((b) => b.status === "CANCELLED");
  const completed = allBookings.filter((b) => displayStatus(b.status, new Date(b.slot.date), b.slot.endTime) === "COMPLETED");

  const revenue     = (bk: typeof allBookings) => bk.filter((b) => b.status === "CONFIRMED").reduce((s, b) => s + b.totalAmount, 0);
  const thisMonRev  = revenue(confirmed.filter((b) => new Date(b.slot.date) >= monthStart));
  const lastMonRev  = revenue(confirmed.filter((b) => new Date(b.slot.date) >= lastMonthStart && new Date(b.slot.date) < monthStart));
  const totalRevenue = revenue(allBookings);
  const monthGrowth = lastMonRev > 0 ? ((thisMonRev - lastMonRev) / lastMonRev) * 100 : null;

  // Last 7 days
  const last7: { label: string; revenue: number; bookings: number; users: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart); d.setDate(d.getDate() - i);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const dayBk = confirmed.filter((b) => { const bd = new Date(b.createdAt); return bd >= d && bd < next; });
    const dayUsers = allUsers.filter((u) => { const ud = new Date(u.createdAt); return ud >= d && ud < next; });
    last7.push({
      label:    d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
      revenue:  dayBk.reduce((s, b) => s + b.totalAmount, 0),
      bookings: dayBk.length,
      users:    dayUsers.length,
    });
  }
  const maxDayRev = Math.max(...last7.map((d) => d.revenue), 1);

  // 6-month revenue
  const months6: { label: string; revenue: number; bookings: number; newUsers: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const bk    = confirmed.filter((b) => { const d = new Date(b.createdAt); return d >= start && d < end; });
    const users = allUsers.filter((u) => { const d = new Date(u.createdAt); return d >= start && d < end; });
    months6.push({ label: start.toLocaleDateString("en-IN", { month: "short" }), revenue: bk.reduce((s, b) => s + b.totalAmount, 0), bookings: bk.length, newUsers: users.length });
  }
  const maxMonthRev = Math.max(...months6.map((m) => m.revenue), 1);

  // Top venues by revenue
  const venueRevMap = new Map<string, { name: string; city: string; revenue: number; bookings: number }>();
  for (const b of confirmed) {
    const vid = b.slot.court.venue.id;
    if (!venueRevMap.has(vid)) venueRevMap.set(vid, { name: b.slot.court.venue.name, city: b.slot.court.venue.city, revenue: 0, bookings: 0 });
    const e = venueRevMap.get(vid)!;
    e.revenue += b.totalAmount; e.bookings += 1;
  }
  const topVenues = Array.from(venueRevMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const maxVenueRev = Math.max(...topVenues.map((v) => v.revenue), 1);

  const players = allUsers.filter((u) => u.role === "PLAYER").length;
  const owners  = allUsers.filter((u) => u.role === "OWNER").length;
  const uniquePlayers = new Set(confirmed.map((b) => b.playerId ?? "")).size;

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-muted-foreground mt-1">Full platform revenue, users, and booking trends</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Platform GMV",   value: `₹${totalRevenue.toLocaleString("en-IN")}`,  icon: IndianRupee,   color: "text-primary",    border: "border-primary/20",    bg: "bg-primary/5",
            badge: monthGrowth !== null ? `${monthGrowth > 0 ? "+" : ""}${monthGrowth.toFixed(0)}% MoM` : null,
            badgeColor: monthGrowth !== null && monthGrowth >= 0 ? "text-green-400" : "text-destructive" },
          { label: "This Month GMV", value: `₹${thisMonRev.toLocaleString("en-IN")}`,    icon: TrendingUp,    color: "text-green-400",  border: "border-green-400/20",  bg: "bg-green-400/5", badge: null, badgeColor: "" },
          { label: "Total Bookings", value: allBookings.length,                            icon: CalendarCheck, color: "text-blue-400",   border: "border-blue-400/20",   bg: "bg-blue-400/5",  badge: null, badgeColor: "" },
          { label: "Total Users",    value: allUsers.length,                               icon: Users,         color: "text-yellow-400", border: "border-yellow-400/20", bg: "bg-yellow-400/5", badge: null, badgeColor: "" },
        ].map((s: any) => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            {s.badge && <div className={`text-[10px] mt-1 ${s.badgeColor}`}>{s.badge}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6 mb-6">
        {/* Last 7 days chart */}
        <div className="col-span-3 rounded-2xl border border-border/50 bg-card/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Revenue — Last 7 Days</h2>
          </div>
          <div className="flex items-end gap-2 h-36">
            {last7.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[9px] text-primary font-medium">
                  {d.revenue > 0 ? `₹${(d.revenue / 1000).toFixed(0)}k` : ""}
                </div>
                <div className="w-full flex items-end" style={{ height: "80px" }}>
                  <div className="w-full rounded-t-md bg-primary/70 hover:bg-primary transition-all"
                    style={{ height: `${Math.max((d.revenue / maxDayRev) * 100, d.revenue > 0 ? 4 : 1)}%` }}
                    title={`₹${d.revenue} · ${d.bookings} bookings · ${d.users} new users`} />
                </div>
                <div className="text-[9px] text-muted-foreground text-center leading-tight">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking breakdown */}
        <div className="col-span-2 rounded-2xl border border-border/50 bg-card/40 p-5">
          <h2 className="font-bold mb-4">Booking Status</h2>
          <div className="space-y-3">
            {[
              { label: "Confirmed",  count: confirmed.length, color: "bg-green-400",    badge: "bg-green-400/15 text-green-400 border-green-400/30" },
              { label: "Completed",  count: completed.length, color: "bg-purple-400",   badge: "bg-purple-400/15 text-purple-400 border-purple-400/30" },
              { label: "Cancelled",  count: cancelled.length, color: "bg-destructive",  badge: "bg-destructive/15 text-destructive border-destructive/30" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${row.badge}`}>{row.label}</span>
                  <span className="text-sm font-bold">{row.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary/60">
                  <div className={`h-full rounded-full ${row.color}`}
                    style={{ width: allBookings.length > 0 ? `${(row.count / allBookings.length) * 100}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{uniquePlayers}</div>
              <div className="text-xs text-muted-foreground">Active players</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-destructive">
                {allBookings.length > 0 ? `${Math.round((cancelled.length / allBookings.length) * 100)}%` : "0%"}
              </div>
              <div className="text-xs text-muted-foreground">Cancel rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* 6-month chart */}
      <div className="rounded-2xl border border-border/50 bg-card/40 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Monthly Revenue (6 months)</h2>
          {monthGrowth !== null && (
            <div className="flex items-center gap-1 text-xs">
              {monthGrowth >= 0
                ? <><TrendingUp className="h-3.5 w-3.5 text-green-400" /><span className="text-green-400">+{monthGrowth.toFixed(0)}% MoM</span></>
                : <><TrendingDown className="h-3.5 w-3.5 text-destructive" /><span className="text-destructive">{monthGrowth.toFixed(0)}% MoM</span></>}
            </div>
          )}
        </div>
        <div className="flex items-end gap-3 h-44">
          {months6.map((m, i) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[10px] text-primary font-medium">
                {m.revenue > 0 ? `₹${(m.revenue / 1000).toFixed(0)}k` : ""}
              </div>
              <div className="w-full flex items-end" style={{ height: "120px" }}>
                <div className={`w-full rounded-t-lg transition-all ${i === months6.length - 1 ? "bg-primary" : "bg-primary/40"}`}
                  style={{ height: `${Math.max((m.revenue / maxMonthRev) * 100, m.revenue > 0 ? 3 : 1)}%` }}
                  title={`${m.label}: ₹${m.revenue} · ${m.bookings} bookings · ${m.newUsers} new users`} />
              </div>
              <div className="text-[10px] text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Top venues */}
        <div className="col-span-3 rounded-2xl border border-border/50 bg-card/40 p-5">
          <h2 className="font-bold mb-4">Top Venues by Revenue</h2>
          {topVenues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No booking data yet.</p>
          ) : (
            <div className="space-y-3">
              {topVenues.map((v, i) => (
                <div key={v.name + v.city} className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground w-5 font-bold">#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm font-medium">{v.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{v.city}</span>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <div className="font-bold text-primary text-sm">₹{v.revenue.toLocaleString("en-IN")}</div>
                        <div className="text-[10px] text-muted-foreground">{v.bookings} bookings</div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary/60">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: `${(v.revenue / maxVenueRev) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User breakdown */}
        <div className="col-span-2 rounded-2xl border border-border/50 bg-card/40 p-5">
          <h2 className="font-bold mb-4">User Breakdown</h2>
          <div className="space-y-4">
            {[
              { label: "Players", count: players, color: "bg-primary/60", total: allUsers.length },
              { label: "Owners",  count: owners,  color: "bg-blue-400/60", total: allUsers.length },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold">{row.count}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary/60">
                  <div className={`h-full rounded-full ${row.color}`}
                    style={{ width: row.total > 0 ? `${(row.count / row.total) * 100}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-border/30 space-y-2">
            {[
              { label: "Active venues",    value: allVenues.filter((v) => v.status === "ACTIVE").length,  color: "text-green-400" },
              { label: "Pending approval", value: allVenues.filter((v) => v.status === "PENDING").length, color: "text-yellow-400" },
              { label: "Rejected",         value: allVenues.filter((v) => v.status === "REJECTED").length,color: "text-destructive" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{r.label}</span>
                <span className={`text-sm font-bold ${r.color}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
