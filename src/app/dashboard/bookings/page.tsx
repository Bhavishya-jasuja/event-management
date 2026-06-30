import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Zap, Search } from "lucide-react";
import LogoutButton from "@/components/layout/LogoutButton";
import BookingCard from "@/components/player/BookingCard";
import type { BookingGroupData } from "@/components/player/BookingCard";

function getDisplayStatus(status: string, date: Date, endTime: string) {
  if (status !== "CONFIRMED") return status;
  const [h, m] = endTime.split(":").map(Number);
  const end = new Date(date);
  end.setHours(h, m, 0, 0);
  return end < new Date() ? "COMPLETED" : "CONFIRMED";
}

export default async function MyBookingsPage() {
  const session = await auth();
  if (!session || session.user.role !== "PLAYER") redirect("/login");

  const raw = await prisma.booking.findMany({
    where: { playerId: session.user.id },
    include: {
      slot: {
        include: {
          court: { include: { venue: { select: { id: true, name: true, city: true, photos: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped = new Map<string, BookingGroupData & { status: string }>();

  for (const b of raw) {
    const key = b.groupRef ?? b.id;
    if (grouped.has(key)) {
      const g = grouped.get(key)!;
      g.ids.push(b.id);
      g.totalAmount += b.totalAmount;
      g.slots       += 1;
      if (b.slot.endTime   > g.endTime)   g.endTime   = b.slot.endTime;
      if (b.slot.startTime < g.startTime) g.startTime = b.slot.startTime;
      if (b.status === "CANCELLED") g.status = "CANCELLED";
      if (!g.cancellationReason && b.cancellationReason) g.cancellationReason = b.cancellationReason;
    } else {
      grouped.set(key, {
        id:                 b.id,
        groupRef:           b.groupRef,
        ids:                [b.id],
        status:             b.status,
        displayStatus:      "",
        venue:              b.slot.court.venue,
        court:              b.slot.court.name,
        dateStr:            b.slot.date.toISOString(),
        startTime:          b.slot.startTime,
        endTime:            b.slot.endTime,
        totalAmount:        b.totalAmount,
        slots:              1,
        bookingRef:         b.bookingRef,
        cancellationReason: b.cancellationReason,
      });
    }
  }

  const groups: BookingGroupData[] = Array.from(grouped.values())
    .map((g) => ({
      ...g,
      displayStatus: getDisplayStatus(g.status, new Date(g.dateStr), g.endTime),
    }))
    .sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime());

  const upcoming  = groups.filter((g) => g.displayStatus === "CONFIRMED");
  const past      = groups.filter((g) => g.displayStatus !== "CONFIRMED");
  const completed = past.filter((g) => g.displayStatus === "COMPLETED").length;

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
            <span className="text-sm font-semibold">My Bookings</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/venues" className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Search className="h-3.5 w-3.5" /> Find more venues
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Bookings</h1>
            <p className="text-sm text-muted-foreground mt-1">{groups.length} booking{groups.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            <span className="text-xs px-3 py-1 rounded-full border border-green-400/30 bg-green-400/10 text-green-400">{upcoming.length} upcoming</span>
            <span className="text-xs px-3 py-1 rounded-full border border-blue-400/30 bg-blue-400/10 text-blue-400">{completed} completed</span>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🏟️</div>
            <h3 className="font-semibold text-xl mb-2">No bookings yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Find a venue and make your first booking</p>
            <Link href="/venues" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
              <Search className="h-4 w-4" /> Browse Venues
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {upcoming.length > 0 && (
              <section>
                <h2 className="font-semibold mb-3 text-green-400">Upcoming</h2>
                <div className="space-y-3">
                  {upcoming.map((g) => <BookingCard key={g.id} group={g} />)}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="font-semibold mb-3 text-muted-foreground">Past &amp; Cancelled</h2>
                <div className="space-y-3 opacity-80">
                  {past.map((g) => <BookingCard key={g.id} group={g} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
