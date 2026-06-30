import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

function getDisplayStatus(status: string, slotDate: Date, endTime: string) {
  if (status !== "CONFIRMED") return status;
  const [h, m] = endTime.split(":").map(Number);
  const end = new Date(slotDate);
  end.setHours(h, m, 0, 0);
  return end < new Date() ? "COMPLETED" : "CONFIRMED";
}

const statusColor: Record<string, string> = {
  CONFIRMED: "border-green-400/30 bg-green-400/10 text-green-400",
  COMPLETED: "border-purple-400/30 bg-purple-400/10 text-purple-400",
  CANCELLED: "border-destructive/30 bg-destructive/10 text-destructive",
  PENDING:   "border-yellow-400/30 bg-yellow-400/10 text-yellow-400",
  NO_SHOW:   "border-orange-400/30 bg-orange-400/10 text-orange-400",
};

export default async function AdminBookingsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const bookings = await prisma.booking.findMany({
    include: {
      player: { select: { name: true, email: true, phone: true } },
      slot:   { include: { court: { include: { venue: { select: { name: true, city: true } } } } } },
      payment: { select: { status: true, razorpayPaymentId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const annotated = bookings.map((b) => ({
    ...b,
    ds: getDisplayStatus(b.status, new Date(b.slot.date), b.slot.endTime),
  }));

  const counts = {
    CONFIRMED: annotated.filter((b) => b.ds === "CONFIRMED").length,
    COMPLETED: annotated.filter((b) => b.ds === "COMPLETED").length,
    CANCELLED: annotated.filter((b) => b.ds === "CANCELLED").length,
    PENDING:   annotated.filter((b) => b.ds === "PENDING").length,
    NO_SHOW:   annotated.filter((b) => b.ds === "NO_SHOW").length,
  };

  const totalRevenue = bookings
    .filter((b) => b.status === "CONFIRMED")
    .reduce((s, b) => s + b.totalAmount, 0);

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">All Bookings</h1>
        <p className="text-muted-foreground mt-1">
          {bookings.length} total · ₹{totalRevenue.toLocaleString("en-IN")} platform revenue
        </p>
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {(["CONFIRMED", "COMPLETED", "CANCELLED", "PENDING", "NO_SHOW"] as const).map((s) => (
          <div key={s} className={`rounded-xl border p-4 text-center ${statusColor[s]}`}>
            <div className="text-2xl font-bold">{counts[s]}</div>
            <div className="text-[10px] mt-1 opacity-80 uppercase tracking-wide">{s.replace("_", " ")}</div>
          </div>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/40 p-10 text-center text-muted-foreground">
          No bookings yet
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left">
                {["Ref", "Player", "Venue / Court", "Date & Slot", "Amount", "Payment", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {annotated.map((b) => (
                <tr key={b.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                    #{b.bookingRef.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium">{b.player.name}</div>
                    <div className="text-xs text-muted-foreground">{b.player.email}</div>
                    {b.player.phone && <div className="text-xs text-muted-foreground">{b.player.phone}</div>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium">{b.slot.court.venue.name}</div>
                    <div className="text-xs text-muted-foreground">{b.slot.court.name} · {b.slot.court.venue.city}</div>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    <div>{new Date(b.slot.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                    <div className="text-xs">{b.slot.startTime} – {b.slot.endTime}</div>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-primary">₹{b.totalAmount}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      b.payment?.status === "PAID"     ? "border-green-400/30 bg-green-400/10 text-green-400" :
                      b.payment?.status === "REFUNDED" ? "border-blue-400/30 bg-blue-400/10 text-blue-400" :
                      b.payment?.status === "FAILED"   ? "border-destructive/30 bg-destructive/10 text-destructive" :
                      "border-border/40 bg-secondary/30 text-muted-foreground"
                    }`}>
                      {b.payment?.status ?? "UNPAID"}
                    </span>
                    {b.payment?.razorpayPaymentId && (
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-[100px]">
                        {b.payment.razorpayPaymentId}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${statusColor[b.ds] ?? ""}`}>
                      {b.ds.replace("_", " ")}
                    </span>
                    {b.cancellationReason && (
                      <div className="text-[10px] text-muted-foreground mt-1 max-w-[120px] truncate" title={b.cancellationReason}>
                        {b.cancellationReason}
                      </div>
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
