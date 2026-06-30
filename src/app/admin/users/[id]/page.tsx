import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import UserBlockButton from "../UserBlockButton";
import { User, Calendar, MapPin, CheckCircle, XCircle, Clock } from "lucide-react";

const bookingStatusColor: Record<string, string> = {
  CONFIRMED:  "text-green-400",
  PENDING:    "text-yellow-400",
  CANCELLED:  "text-destructive",
  COMPLETED:  "text-blue-400",
  NO_SHOW:    "text-orange-400",
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      bookings: {
        include: { slot: { include: { court: { include: { venue: { select: { name: true } } } } } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      venues: { orderBy: { createdAt: "desc" } },
      _count: { select: { bookings: true, venues: true, reviews: true } },
    },
  });

  if (!user) notFound();

  const isCurrentAdmin = user.id === session.user.id;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <a href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to users
        </a>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            {user.phone && <div className="text-sm text-muted-foreground">{user.phone}</div>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
            user.isBlacklisted
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-green-400/30 bg-green-400/10 text-green-400"
          }`}>
            {user.isBlacklisted ? "Blocked" : "Active"}
          </span>
          {!isCurrentAdmin && user.role !== "ADMIN" && (
            <UserBlockButton userId={user.id} isBlacklisted={user.isBlacklisted} />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Role", value: user.role ?? "—" },
          { label: "Bookings", value: user._count.bookings },
          { label: "Venues", value: user._count.venues },
          { label: "Reviews", value: user._count.reviews },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card/40 p-4 text-center">
            <div className="text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Venues (if owner) */}
      {user.venues.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Venues
          </h2>
          <div className="space-y-3">
            {user.venues.map((venue) => (
              <div key={venue.id} className="rounded-xl border border-border/50 bg-card/40 p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{venue.name}</div>
                  <div className="text-xs text-muted-foreground">{venue.city}, {venue.state}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    venue.status === "ACTIVE"   ? "border-green-400/30 bg-green-400/10 text-green-400" :
                    venue.status === "PENDING"  ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-400" :
                    venue.status === "REJECTED" ? "border-destructive/30 bg-destructive/10 text-destructive" :
                    "border-orange-400/30 bg-orange-400/10 text-orange-400"
                  }`}>
                    {venue.status}
                  </span>
                  <a href={`/admin/venues/${venue.id}`} className="text-primary hover:underline text-sm">
                    Review →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings */}
      <div>
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Recent Bookings
        </h2>
        {user.bookings.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card/40 p-8 text-center text-muted-foreground text-sm">
            No bookings yet
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Venue</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Slot</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Amount</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {user.bookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-border/30 last:border-0">
                    <td className="px-5 py-3.5 font-medium">{booking.slot.court.venue.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {new Date(booking.slot.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {booking.slot.startTime} – {booking.slot.endTime}
                    </td>
                    <td className="px-5 py-3.5">₹{booking.totalAmount}</td>
                    <td className={`px-5 py-3.5 font-medium ${bookingStatusColor[booking.status] ?? ""}`}>
                      {booking.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
