import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Building2, IndianRupee, CalendarCheck, Users, CheckCircle, Clock } from "lucide-react";
import EditProfileForm from "@/components/shared/EditProfileForm";

function avatarGradient(name: string) {
  const colors = ["from-violet-500 to-purple-700", "from-blue-500 to-cyan-600", "from-green-500 to-emerald-700", "from-orange-500 to-red-600", "from-pink-500 to-rose-600"];
  return colors[name.charCodeAt(0) % colors.length];
}

export default async function OwnerProfilePage() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
  });
  if (!user) redirect("/login");

  const venues = await prisma.venue.findMany({
    where: { ownerId: user.id },
    include: { _count: { select: { courts: true } } },
  });

  const bookings = await prisma.booking.findMany({
    where: { slot: { court: { venue: { ownerId: user.id } } } },
  });

  const confirmed  = bookings.filter((b) => b.status === "CONFIRMED");
  const cancelled  = bookings.filter((b) => b.status === "CANCELLED");
  const revenue    = confirmed.reduce((s, b) => s + b.totalAmount, 0);
  const uniquePlayers = new Set(bookings.map((b) => b.playerId)).size;
  const activeVenues  = venues.filter((v) => v.status === "ACTIVE").length;

  const initials    = user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const gradient    = avatarGradient(user.name);
  const memberSince = user.createdAt.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Avatar + Identity */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card/40 p-6 text-center">
            <div className={`h-24 w-24 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 shadow-lg`}>
              {initials}
            </div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-blue-400/15 text-blue-400 border border-blue-400/30">
              Venue Owner
            </span>
            <p className="text-xs text-muted-foreground mt-3">Member since {memberSince}</p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <EditProfileForm initial={{ name: user.name, phone: user.phone ?? null }} />
            <div className="mt-3 pt-3 border-t border-border/30">
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground">Email</span>
                <span className="text-sm font-medium truncate max-w-[160px]">{user.email}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed</p>
            </div>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-lg">Business Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Revenue",   value: `₹${revenue.toLocaleString("en-IN")}`, icon: IndianRupee,   color: "text-primary",    border: "border-primary/20",      bg: "bg-primary/5" },
              { label: "Total Bookings",  value: bookings.length,                         icon: CalendarCheck, color: "text-green-400",  border: "border-green-400/20",   bg: "bg-green-400/5" },
              { label: "Unique Players",  value: uniquePlayers,                           icon: Users,         color: "text-yellow-400", border: "border-yellow-400/20",  bg: "bg-yellow-400/5" },
              { label: "Active Venues",   value: activeVenues,                            icon: Building2,     color: "text-blue-400",   border: "border-blue-400/20",    bg: "bg-blue-400/5" },
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

          {/* Venue list */}
          <div className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <h3 className="font-semibold mb-3">My Venues</h3>
            {venues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No venues yet.</p>
            ) : (
              <div className="space-y-2">
                {venues.map((v) => {
                  const statusCfg: Record<string, string> = {
                    ACTIVE:    "bg-green-400/15 text-green-400 border-green-400/30",
                    PENDING:   "bg-yellow-400/15 text-yellow-400 border-yellow-400/30",
                    REJECTED:  "bg-destructive/15 text-destructive border-destructive/30",
                    SUSPENDED: "bg-orange-400/15 text-orange-400 border-orange-400/30",
                  };
                  return (
                    <div key={v.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div>
                        <div className="text-sm font-medium">{v.name}</div>
                        <div className="text-xs text-muted-foreground">{v._count.courts} court{v._count.courts !== 1 ? "s" : ""} · {v.city}</div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg[v.status]}`}>{v.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Booking breakdown */}
          <div className="rounded-2xl border border-border/50 bg-card/40 p-5">
            <h3 className="font-semibold mb-3">Booking Health</h3>
            <div className="flex gap-6">
              <div className="text-center">
                <CheckCircle className="h-5 w-5 text-green-400 mx-auto mb-1" />
                <div className="text-xl font-bold text-green-400">{confirmed.length}</div>
                <div className="text-xs text-muted-foreground">Confirmed</div>
              </div>
              <div className="text-center">
                <Clock className="h-5 w-5 text-destructive mx-auto mb-1" />
                <div className="text-xl font-bold text-destructive">{cancelled.length}</div>
                <div className="text-xs text-muted-foreground">Cancelled</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">
                  {bookings.length > 0 ? Math.round((confirmed.length / bookings.length) * 100) : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Confirm rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
