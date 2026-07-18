import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Search, Calendar, Clock, ChevronRight, Zap, TrendingUp, IndianRupee, Trophy, User } from "lucide-react";
import LogoutButton from "@/components/layout/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import BookingCard from "@/components/player/BookingCard";
import type { BookingGroupData } from "@/components/player/BookingCard";

function getDisplayStatus(status: string, date: Date, endTime: string) {
  if (status !== "CONFIRMED") return status;
  const [h, m] = endTime.split(":").map(Number);
  const end = new Date(date);
  end.setHours(h, m, 0, 0);
  return end < new Date() ? "COMPLETED" : "CONFIRMED";
}


const SPORTS = [
  { label: "Cricket",    value: "CRICKET",    emoji: "🏏" },
  { label: "Football",   value: "FOOTBALL",   emoji: "⚽" },
  { label: "Badminton",  value: "BADMINTON",  emoji: "🏸" },
  { label: "Tennis",     value: "TENNIS",     emoji: "🎾" },
  { label: "Basketball", value: "BASKETBALL", emoji: "🏀" },
  { label: "Turf",       value: "TURF",       emoji: "🌿" },
];

export default async function PlayerDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "PLAYER") {
    if (session.user.role === "ADMIN") redirect("/admin/dashboard");
    if (session.user.role === "OWNER") redirect("/owner/dashboard");
    redirect("/login");
  }

  const raw = await prisma.booking.findMany({
    where: { playerId: session.user.id },
    include: {
      slot: {
        include: {
          court: {
            include: { venue: { select: { id: true, name: true, city: true, photos: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // ── Group by groupRef ──────────────────────────────────────────────────────
  const grouped = new Map<string, BookingGroupData & { status: string }>();
  for (const b of raw) {
    const key = b.groupRef ?? b.id;
    if (grouped.has(key)) {
      const g = grouped.get(key)!;
      g.totalAmount += b.totalAmount;
      g.slots       += 1;
      if (b.slot.startTime < g.startTime) g.startTime = b.slot.startTime;
      if (b.slot.endTime   > g.endTime)   g.endTime   = b.slot.endTime;
      if (b.status === "CANCELLED") g.status = "CANCELLED";
      g.ids.push(b.id);
    } else {
      grouped.set(key, {
        id: b.id, groupRef: b.groupRef, ids: [b.id], status: b.status,
        displayStatus: "",
        venue: b.slot.court.venue, court: b.slot.court.name,
        dateStr: b.slot.date.toISOString(), startTime: b.slot.startTime, endTime: b.slot.endTime,
        totalAmount: b.totalAmount, slots: 1, bookingRef: b.bookingRef,
        cancellationReason: b.cancellationReason,
      });
    }
  }

  const groups: BookingGroupData[] = Array.from(grouped.values()).map((g) => ({
    ...g,
    displayStatus: getDisplayStatus(g.status, new Date(g.dateStr), g.endTime),
  }));

  const now          = new Date();
  const upcoming     = groups.filter((g) => g.displayStatus === "CONFIRMED");
  const totalSpent   = raw.filter((b) => b.status === "CONFIRMED").reduce((s, b) => s + b.totalAmount, 0);
  const uniqueVenues = new Set(raw.map((b) => b.slot.court.venue.id)).size;
  const completedCount = groups.filter((g) => g.displayStatus === "COMPLETED").length;

  const hour      = now.getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session.user.name?.split(" ")[0] ?? "Player";

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Nex<span className="text-primary">Arc</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/venues" className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5 hover:border-primary/50 hover:bg-secondary/40">
              <Search className="h-3.5 w-3.5" /> Find Venues
            </Link>
            <Link href="/dashboard/bookings" className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5 hover:border-primary/50 hover:bg-secondary/40">
              <Calendar className="h-3.5 w-3.5" /> My Bookings
            </Link>
            <Link href="/dashboard/profile" className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5 hover:border-primary/50 hover:bg-secondary/40">
              <User className="h-3.5 w-3.5" /> Profile
            </Link>
            <Link href="/dashboard/profile">
              <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm hover:bg-primary/30 transition-colors">
                {firstName[0].toUpperCase()}
              </div>
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Welcome hero */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 p-8 mb-8">
          <div className="relative z-10">
            <p className="text-muted-foreground text-sm mb-1">{greeting},</p>
            <h1 className="text-3xl font-bold mb-3">{firstName}! 👋</h1>
            <p className="text-muted-foreground mb-6">Find a court, pick your slots, and play today.</p>
            <Link href="/venues" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
              <Search className="h-4 w-4" /> Browse Venues
            </Link>
          </div>
          <div className="absolute right-8 top-1/2 -translate-y-1/2 text-8xl opacity-10 select-none">🏟️</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Bookings", value: groups.length,   icon: Calendar,     color: "text-primary" },
            { label: "Upcoming",       value: upcoming.length, icon: Clock,        color: "text-green-400" },
            { label: "Completed",      value: completedCount,  icon: Trophy,       color: "text-blue-400" },
            { label: "Total Spent",    value: `₹${totalSpent.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Upcoming bookings — grouped */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Upcoming Bookings</h2>
              {groups.length > 0 && (
                <Link href="/dashboard/bookings" className="text-sm text-primary hover:underline flex items-center gap-1">
                  See all <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/50 p-10 text-center">
                <div className="text-5xl mb-4">🏆</div>
                <h3 className="font-semibold mb-2">No upcoming games</h3>
                <p className="text-sm text-muted-foreground mb-5">Book a slot and get on the court!</p>
                <Link href="/venues" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Search className="h-3.5 w-3.5" /> Find a venue
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.slice(0, 5).map((g) => (
                  <BookingCard key={g.id} group={g} compact />
                ))}
              </div>
            )}
          </div>

          {/* Browse by sport */}
          <div>
            <h2 className="font-bold text-lg mb-4">Browse by Sport</h2>
            <div className="space-y-2">
              {SPORTS.map((s) => (
                <Link key={s.value} href={`/venues?sport=${s.value}`}>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/30 transition-all p-3.5 group">
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="font-medium text-sm group-hover:text-primary transition-colors">{s.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>

            {uniqueVenues > 0 && (
              <div className="mt-6 rounded-xl border border-border bg-card p-4 text-center">
                <TrendingUp className="h-5 w-5 text-primary mx-auto mb-2" />
                <div className="text-sm text-muted-foreground">You&apos;ve played at</div>
                <div className="text-2xl font-bold text-primary">{uniqueVenues}</div>
                <div className="text-sm text-muted-foreground">venue{uniqueVenues !== 1 ? "s" : ""}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
