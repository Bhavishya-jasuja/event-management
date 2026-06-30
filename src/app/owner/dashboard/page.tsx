import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, Clock, CheckCircle, XCircle, PauseCircle, IndianRupee, CalendarCheck, Users, TrendingUp, PlusCircle, ChevronRight } from "lucide-react";

const statusConfig = {
  PENDING:   { label: "Under Review", icon: Clock,        cls: "border-yellow-400/30 bg-yellow-400/10 text-yellow-400" },
  ACTIVE:    { label: "Active",       icon: CheckCircle,  cls: "border-green-400/30 bg-green-400/10 text-green-400" },
  REJECTED:  { label: "Rejected",     icon: XCircle,      cls: "border-destructive/30 bg-destructive/10 text-destructive" },
  SUSPENDED: { label: "Suspended",    icon: PauseCircle,  cls: "border-orange-400/30 bg-orange-400/10 text-orange-400" },
};

function bookingDisplayStatus(status: string, slotDate: Date, endTime: string) {
  if (status !== "CONFIRMED") return status;
  const [h, m] = endTime.split(":").map(Number);
  const end = new Date(slotDate);
  end.setHours(h, m, 0, 0);
  return end < new Date() ? "COMPLETED" : "CONFIRMED";
}

export default async function OwnerDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") redirect("/login");

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const venues = await prisma.venue.findMany({
    where: { ownerId: session.user.id },
    include: { _count: { select: { courts: true } } },
    orderBy: { createdAt: "desc" },
  });

  const bookingsWithSlots = await prisma.booking.findMany({
    where: {
      slot: { court: { venue: { ownerId: session.user.id } } },
    },
    include: {
      player: { select: { name: true, email: true, phone: true } },
      slot:   { include: { court: { include: { venue: { select: { id: true, name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const confirmed   = bookingsWithSlots.filter((b) => b.status === "CONFIRMED");
  const cancelled   = bookingsWithSlots.filter((b) => b.status === "CANCELLED");
  const todaysBk    = confirmed.filter((b) => new Date(b.slot.date) >= today && new Date(b.slot.date) < new Date(today.getTime() + 86400000));
  const monthBk     = confirmed.filter((b) => new Date(b.slot.date) >= monthStart);
  const totalRevenue = confirmed.reduce((s, b) => s + b.totalAmount, 0);
  const monthRevenue = monthBk.reduce((s, b) => s + b.totalAmount, 0);

  const upcoming5 = bookingsWithSlots
    .filter((b) => {
      if (b.status !== "CONFIRMED") return false;
      const slotDate = new Date(b.slot.date);
      slotDate.setHours(23, 59, 59);
      return slotDate >= now;
    })
    .slice(0, 8);

  const activeVenues  = venues.filter((v) => v.status === "ACTIVE").length;
  const pendingVenues = venues.filter((v) => v.status === "PENDING").length;

  const statusStyle: Record<string, string> = {
    CONFIRMED: "bg-green-400/15 text-green-400 border-green-400/30",
    COMPLETED: "bg-blue-400/15 text-blue-400 border-blue-400/30",
    CANCELLED: "bg-destructive/15 text-destructive border-destructive/30",
    PENDING:   "bg-yellow-400/15 text-yellow-400 border-yellow-400/30",
  };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {session.user.name?.split(" ")[0]}!</p>
        </div>
        <Link href="/owner/venues/new" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
          <PlusCircle className="h-4 w-4" /> Add Venue
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Revenue",    value: `₹${totalRevenue.toLocaleString("en-IN")}`, sub: "all time",           icon: IndianRupee,  color: "text-primary",      border: "border-primary/20",    bg: "bg-primary/5" },
          { label: "This Month",       value: `₹${monthRevenue.toLocaleString("en-IN")}`, sub: "confirmed bookings", icon: TrendingUp,   color: "text-green-400",    border: "border-green-400/20",  bg: "bg-green-400/5" },
          { label: "Today's Bookings", value: todaysBk.length,                             sub: "confirmed slots",    icon: CalendarCheck,color: "text-blue-400",     border: "border-blue-400/20",   bg: "bg-blue-400/5" },
          { label: "Total Players",    value: new Set(bookingsWithSlots.map((b) => b.playerId)).size, sub: "unique players", icon: Users, color: "text-yellow-400",  border: "border-yellow-400/20", bg: "bg-yellow-400/5" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Booking stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{confirmed.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Confirmed</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-center">
          <div className="text-3xl font-bold text-destructive">{cancelled.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Cancelled</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">
            {bookingsWithSlots.filter((b) => {
              if (b.status !== "CONFIRMED") return false;
              const [h, m] = b.slot.endTime.split(":").map(Number);
              const end = new Date(b.slot.date);
              end.setHours(h, m, 0, 0);
              return end < now;
            }).length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Completed</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Upcoming bookings */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Upcoming Bookings</h2>
            <Link href="/owner/bookings" className="text-sm text-primary hover:underline flex items-center gap-1">
              All bookings <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {upcoming5.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/50 p-10 text-center">
              <CalendarCheck className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No upcoming bookings yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming5.map((b) => {
                const ds = bookingDisplayStatus(b.status, new Date(b.slot.date), b.slot.endTime);
                return (
                  <div key={b.id} className="rounded-xl border border-border/50 bg-card/40 p-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{b.player.name}</div>
                      <div className="text-xs text-muted-foreground">{b.slot.court.venue.name} · {b.slot.court.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(b.slot.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {b.slot.startTime}–{b.slot.endTime}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-sm text-primary">₹{b.totalAmount}</div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1 inline-block ${statusStyle[ds]}`}>
                        {ds}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My venues */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">My Venues</h2>
            <Link href="/owner/venues" className="text-sm text-primary hover:underline">View all</Link>
          </div>

          {venues.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/50 p-8 text-center">
              <Building2 className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-3">No venues yet</p>
              <Link href="/owner/venues/new" className="text-xs text-primary hover:underline">Add your first venue →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {venues.slice(0, 5).map((v) => {
                const cfg = statusConfig[v.status];
                return (
                  <div key={v.id} className="rounded-xl border border-border/50 bg-card/40 p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm truncate">{v.name}</div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 flex-shrink-0 ml-2 ${cfg.cls}`}>
                        <cfg.icon className="h-2.5 w-2.5" />{cfg.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{v.city} · {v._count.courts} court{v._count.courts !== 1 ? "s" : ""}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-green-400/20 bg-green-400/5 p-3 text-center">
              <div className="text-xl font-bold text-green-400">{activeVenues}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-3 text-center">
              <div className="text-xl font-bold text-yellow-400">{pendingVenues}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
