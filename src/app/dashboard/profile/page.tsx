import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Zap, Calendar, IndianRupee, Trophy, MapPin } from "lucide-react";
import LogoutButton from "@/components/layout/LogoutButton";
import EditProfileForm from "@/components/shared/EditProfileForm";

function getDisplayStatus(status: string, date: Date, endTime: string) {
  if (status !== "CONFIRMED") return status;
  const [h, m] = endTime.split(":").map(Number);
  const end = new Date(date);
  end.setHours(h, m, 0, 0);
  return end < new Date() ? "COMPLETED" : "CONFIRMED";
}

function avatarGradient(name: string) {
  const colors = [
    "from-violet-500 to-purple-700",
    "from-blue-500 to-cyan-600",
    "from-green-500 to-emerald-700",
    "from-orange-500 to-red-600",
    "from-pink-500 to-rose-600",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export default async function PlayerProfilePage() {
  const session = await auth();
  if (!session || session.user.role !== "PLAYER") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  });
  if (!user) redirect("/login");

  const bookings = await prisma.booking.findMany({
    where: { playerId: user.id },
    include: { slot: { include: { court: { include: { venue: { select: { id: true, name: true, city: true } } } } } } },
  });

  const confirmed  = bookings.filter((b) => b.status === "CONFIRMED");
  const completed  = bookings.filter((b) => getDisplayStatus(b.status, new Date(b.slot.date), b.slot.endTime) === "COMPLETED");
  const cancelled  = bookings.filter((b) => b.status === "CANCELLED");
  const totalSpent = confirmed.reduce((s, b) => s + b.totalAmount, 0);
  const uniqueVenueCount = new Set(bookings.map((b) => b.slot.court.venue.id)).size;

  const initials = user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const gradient = avatarGradient(user.name);
  const memberSince = user.createdAt.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </Link>
            <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" /> Dashboard
            </Link>
            <span className="text-border">/</span>
            <span className="text-sm font-semibold">Profile</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/venues" className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">Find Venues</Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Avatar + Identity */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl border border-border/50 bg-card/40 p-6 text-center">
              <div className={`h-24 w-24 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg`}>
                {initials}
              </div>
              <h1 className="text-xl font-bold">{user.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
              <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
                Player
              </span>
              <p className="text-xs text-muted-foreground mt-3">Member since {memberSince}</p>
            </div>

            {/* Edit form */}
            <div className="rounded-2xl border border-border/50 bg-card/40 p-5">
              <EditProfileForm initial={{ name: user.name, phone: user.phone ?? null }} />
              <div className="mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs text-muted-foreground">Email</span>
                  <span className="text-sm font-medium truncate max-w-[180px]">{user.email}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed</p>
              </div>
            </div>
          </div>

          {/* Right: Stats */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-bold text-lg">Your Stats</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Bookings", value: bookings.length,       icon: Calendar,     color: "text-primary",     border: "border-primary/20",      bg: "bg-primary/5" },
                { label: "Completed",      value: completed.length,      icon: Trophy,       color: "text-blue-400",    border: "border-blue-400/20",     bg: "bg-blue-400/5" },
                { label: "Total Spent",    value: `₹${totalSpent.toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-green-400", border: "border-green-400/20", bg: "bg-green-400/5" },
                { label: "Venues Visited", value: uniqueVenueCount,      icon: MapPin,       color: "text-yellow-400",  border: "border-yellow-400/20",   bg: "bg-yellow-400/5" },
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

            {/* Booking status breakdown */}
            <div className="rounded-2xl border border-border/50 bg-card/40 p-5">
              <h3 className="font-semibold mb-4">Booking Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: "Upcoming (Confirmed)", count: confirmed.length,        color: "bg-green-400", pct: bookings.length ? (confirmed.length / bookings.length) * 100 : 0 },
                  { label: "Completed",            count: completed.length,         color: "bg-blue-400",  pct: bookings.length ? (completed.length / bookings.length) * 100 : 0 },
                  { label: "Cancelled",            count: cancelled.length,         color: "bg-destructive", pct: bookings.length ? (cancelled.length / bookings.length) * 100 : 0 },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-semibold">{row.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary/60">
                      <div className={`h-full rounded-full ${row.color} transition-all`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-2xl border border-border/50 bg-card/40 p-5">
              <h3 className="font-semibold mb-3">Quick Links</h3>
              <div className="flex gap-2 flex-wrap">
                <Link href="/dashboard/bookings" className="text-sm border border-border/50 px-4 py-2 rounded-lg hover:border-primary/40 hover:text-primary transition-colors">My Bookings</Link>
                <Link href="/venues" className="text-sm border border-border/50 px-4 py-2 rounded-lg hover:border-primary/40 hover:text-primary transition-colors">Browse Venues</Link>
                <Link href="/dashboard" className="text-sm border border-border/50 px-4 py-2 rounded-lg hover:border-primary/40 hover:text-primary transition-colors">Dashboard</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
