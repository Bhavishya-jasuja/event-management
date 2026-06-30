import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { IndianRupee, TrendingUp, TrendingDown, CalendarCheck, Users } from "lucide-react";

function displayStatus(status: string, slotDate: Date, endTime: string) {
  if (status !== "CONFIRMED") return status;
  const [h, m] = endTime.split(":").map(Number);
  const end = new Date(slotDate);
  end.setHours(h, m, 0, 0);
  return end < new Date() ? "COMPLETED" : "CONFIRMED";
}

export default async function OwnerAnalyticsPage() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") redirect("/login");

  const now       = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const weekStart  = new Date(todayStart); weekStart.setDate(todayStart.getDate() - 6);

  const allBookings = await prisma.booking.findMany({
    where: { slot: { court: { venue: { ownerId: session.user.id } } } },
    include: {
      slot: { include: { court: { include: { venue: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const confirmed  = allBookings.filter((b) => b.status === "CONFIRMED");
  const cancelled  = allBookings.filter((b) => b.status === "CANCELLED");
  const completed  = allBookings.filter((b) => displayStatus(b.status, new Date(b.slot.date), b.slot.endTime) === "COMPLETED");

  const revenue        = (bkgs: typeof allBookings) => bkgs.filter((b) => b.status === "CONFIRMED").reduce((s, b) => s + b.totalAmount, 0);
  const thisMonthBk    = confirmed.filter((b) => new Date(b.slot.date) >= monthStart);
  const lastMonthBk    = confirmed.filter((b) => new Date(b.slot.date) >= lastMonthStart && new Date(b.slot.date) < monthStart);
  const thisMonthRev   = revenue(thisMonthBk);
  const lastMonthRev   = revenue(lastMonthBk);
  const monthGrowth    = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : null;
  const totalRevenue   = revenue(allBookings);

  // Last 7 days revenue
  const last7: { label: string; date: Date; revenue: number; bookings: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const dayBk = confirmed.filter((b) => {
      const bd = new Date(b.slot.date);
      return bd >= d && bd < next;
    });
    last7.push({
      label:    d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
      date:     d,
      revenue:  dayBk.reduce((s, b) => s + b.totalAmount, 0),
      bookings: dayBk.length,
    });
  }
  const maxDayRevenue = Math.max(...last7.map((d) => d.revenue), 1);

  // Top courts by revenue
  const courtRevMap = new Map<string, { name: string; venueName: string; revenue: number; bookings: number }>();
  for (const b of confirmed) {
    const cid = b.slot.courtId;
    if (!courtRevMap.has(cid)) {
      courtRevMap.set(cid, { name: b.slot.court.name, venueName: b.slot.court.venue.name, revenue: 0, bookings: 0 });
    }
    const entry = courtRevMap.get(cid)!;
    entry.revenue  += b.totalAmount;
    entry.bookings += 1;
  }
  const topCourts = Array.from(courtRevMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const maxCourtRev = Math.max(...topCourts.map((c) => c.revenue), 1);

  // Monthly revenue last 6 months
  const months6: { label: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const bk    = confirmed.filter((b) => new Date(b.slot.date) >= start && new Date(b.slot.date) < end);
    months6.push({
      label:   start.toLocaleDateString("en-IN", { month: "short" }),
      revenue: bk.reduce((s, b) => s + b.totalAmount, 0),
    });
  }
  const maxMonthRev = Math.max(...months6.map((m) => m.revenue), 1);

  const uniquePlayers = new Set(allBookings.map((b) => b.playerId)).size;

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Revenue, bookings, and court performance</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Revenue",    value: `₹${totalRevenue.toLocaleString("en-IN")}`, icon: IndianRupee,   color: "text-primary",    border: "border-primary/20",    bg: "bg-primary/5" },
          { label: "This Month",       value: `₹${thisMonthRev.toLocaleString("en-IN")}`, icon: TrendingUp,    color: "text-green-400",  border: "border-green-400/20",  bg: "bg-green-400/5",
            badge: monthGrowth !== null ? `${monthGrowth > 0 ? "+" : ""}${monthGrowth.toFixed(0)}% vs last month` : null,
            badgeColor: monthGrowth !== null && monthGrowth >= 0 ? "text-green-400" : "text-destructive" },
          { label: "Total Bookings",   value: allBookings.length,                          icon: CalendarCheck, color: "text-blue-400",   border: "border-blue-400/20",   bg: "bg-blue-400/5" },
          { label: "Unique Players",   value: uniquePlayers,                               icon: Users,         color: "text-yellow-400", border: "border-yellow-400/20", bg: "bg-yellow-400/5" },
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
        {/* Last 7 days bar chart */}
        <div className="col-span-3 rounded-2xl border border-border/50 bg-card/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Last 7 Days</h2>
            <span className="text-xs text-muted-foreground">Revenue</span>
          </div>
          <div className="flex items-end gap-2 h-36">
            {last7.map((d) => (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[9px] text-primary font-medium">
                  {d.revenue > 0 ? `₹${(d.revenue / 1000).toFixed(0)}k` : ""}
                </div>
                <div className="w-full flex items-end" style={{ height: "80px" }}>
                  <div
                    className="w-full rounded-t-md bg-primary/70 hover:bg-primary transition-all"
                    style={{ height: `${Math.max((d.revenue / maxDayRevenue) * 100, d.revenue > 0 ? 4 : 1)}%` }}
                    title={`₹${d.revenue} · ${d.bookings} bookings`}
                  />
                </div>
                <div className="text-[9px] text-muted-foreground text-center leading-tight">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking status breakdown */}
        <div className="col-span-2 rounded-2xl border border-border/50 bg-card/40 p-5">
          <h2 className="font-bold mb-4">Booking Status</h2>
          <div className="space-y-3">
            {[
              { label: "Confirmed",  count: confirmed.length,   color: "bg-green-400",    badge: "bg-green-400/15 text-green-400 border-green-400/30" },
              { label: "Completed",  count: completed.length,   color: "bg-blue-400",     badge: "bg-blue-400/15 text-blue-400 border-blue-400/30" },
              { label: "Cancelled",  count: cancelled.length,   color: "bg-destructive",  badge: "bg-destructive/15 text-destructive border-destructive/30" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${row.badge}`}>{row.label}</span>
                  </div>
                  <span className="text-sm font-bold">{row.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary/60">
                  <div
                    className={`h-full rounded-full ${row.color}`}
                    style={{ width: allBookings.length > 0 ? `${(row.count / allBookings.length) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="text-xs text-muted-foreground mb-1">Cancellation rate</div>
            <div className="text-2xl font-bold text-destructive">
              {allBookings.length > 0 ? `${Math.round((cancelled.length / allBookings.length) * 100)}%` : "0%"}
            </div>
          </div>
        </div>
      </div>

      {/* 6-month chart */}
      <div className="rounded-2xl border border-border/50 bg-card/40 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Monthly Revenue</h2>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {monthGrowth !== null && monthGrowth >= 0
              ? <><TrendingUp className="h-3.5 w-3.5 text-green-400" /><span className="text-green-400">+{monthGrowth.toFixed(0)}% MoM</span></>
              : monthGrowth !== null
              ? <><TrendingDown className="h-3.5 w-3.5 text-destructive" /><span className="text-destructive">{monthGrowth.toFixed(0)}% MoM</span></>
              : null}
          </div>
        </div>
        <div className="flex items-end gap-3 h-44">
          {months6.map((m, i) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[10px] text-primary font-medium">
                {m.revenue > 0 ? `₹${(m.revenue / 1000).toFixed(0)}k` : ""}
              </div>
              <div className="w-full flex items-end" style={{ height: "120px" }}>
                <div
                  className={`w-full rounded-t-lg transition-all ${i === months6.length - 1 ? "bg-primary" : "bg-primary/40"}`}
                  style={{ height: `${Math.max((m.revenue / maxMonthRev) * 100, m.revenue > 0 ? 3 : 1)}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top courts */}
      <div className="rounded-2xl border border-border/50 bg-card/40 p-5">
        <h2 className="font-bold mb-4">Top Courts by Revenue</h2>
        {topCourts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No booking data yet.</p>
        ) : (
          <div className="space-y-3">
            {topCourts.map((c, i) => (
              <div key={c.name + c.venueName} className="flex items-center gap-4">
                <div className="text-xs text-muted-foreground w-5 text-center font-bold">#{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{c.venueName}</span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="font-bold text-primary text-sm">₹{c.revenue.toLocaleString("en-IN")}</div>
                      <div className="text-[10px] text-muted-foreground">{c.bookings} bookings</div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary/60">
                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${(c.revenue / maxCourtRev) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
