import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OwnerCancelButton from "./OwnerCancelButton";

function displayStatus(status: string, slotDate: Date, endTime: string) {
  if (status !== "CONFIRMED") return status;
  const [h, m] = endTime.split(":").map(Number);
  const end = new Date(slotDate);
  end.setHours(h, m, 0, 0);
  return end < new Date() ? "COMPLETED" : "CONFIRMED";
}

const statusStyle: Record<string, string> = {
  CONFIRMED: "bg-green-400/15 text-green-400 border-green-400/30",
  COMPLETED: "bg-blue-400/15 text-blue-400 border-blue-400/30",
  CANCELLED: "bg-destructive/15 text-destructive border-destructive/30",
  PENDING:   "bg-yellow-400/15 text-yellow-400 border-yellow-400/30",
};

export default async function OwnerBookingsPage() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") redirect("/login");

  const bookings = await prisma.booking.findMany({
    where: { slot: { court: { venue: { ownerId: session.user.id } } } },
    include: {
      player: { select: { name: true, email: true, phone: true } },
      slot:   { include: { court: { include: { venue: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const annotated = bookings.map((b) => ({
    ...b,
    ds: displayStatus(b.status, new Date(b.slot.date), b.slot.endTime),
  }));

  const counts = {
    ALL:       annotated.length,
    CONFIRMED: annotated.filter((b) => b.ds === "CONFIRMED").length,
    COMPLETED: annotated.filter((b) => b.ds === "COMPLETED").length,
    CANCELLED: annotated.filter((b) => b.ds === "CANCELLED").length,
  };

  const totalRevenue = bookings.filter((b) => b.status === "CONFIRMED").reduce((s, b) => s + b.totalAmount, 0);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-muted-foreground mt-1">
          {annotated.length} total · ₹{totalRevenue.toLocaleString("en-IN")} revenue
        </p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className={`rounded-xl border p-4 text-center ${status === "ALL" ? "border-border/50 bg-card/40" : statusStyle[status] ?? "border-border/50 bg-card/40"}`}>
            <div className="text-2xl font-bold">{count}</div>
            <div className="text-xs mt-1 opacity-80">{status === "ALL" ? "All Bookings" : status}</div>
          </div>
        ))}
      </div>

      {annotated.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 p-16 text-center text-muted-foreground">
          No bookings yet — get your venue approved to start accepting bookings.
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Player</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Venue / Court</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Date & Time</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {annotated.map((b) => (
                <tr key={b.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-medium">{b.player.name}</div>
                    <div className="text-xs text-muted-foreground">{b.player.email}</div>
                    {b.player.phone && <div className="text-xs text-muted-foreground">{b.player.phone}</div>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium">{b.slot.court.venue.name}</div>
                    <div className="text-xs text-muted-foreground">{b.slot.court.name}</div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    <div>{new Date(b.slot.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                    <div className="text-xs">{b.slot.startTime} – {b.slot.endTime}</div>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-primary">₹{b.totalAmount}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${statusStyle[b.ds] ?? ""}`}>
                      {b.ds}
                    </span>
                    {b.cancellationReason && (
                      <div className="text-xs text-muted-foreground mt-1">{b.cancellationReason}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {b.ds === "CONFIRMED" && (
                      <OwnerCancelButton bookingId={b.id} playerName={b.player.name} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
