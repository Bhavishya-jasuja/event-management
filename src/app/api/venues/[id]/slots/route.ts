import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateSlots(open: string, close: string, durationMin: number) {
  const slots: { start: string; end: string }[] = [];
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  let cur = oh * 60 + om;
  const end = ch * 60 + cm;
  while (cur + durationMin <= end) {
    const s = `${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`;
    cur += durationMin;
    const e = `${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`;
    slots.push({ start: s, end: e });
  }
  return slots;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const date    = searchParams.get("date");
  const courtId = searchParams.get("courtId");

  if (!date || !courtId) {
    return NextResponse.json({ error: "date and courtId are required." }, { status: 400 });
  }

  const parsedDate = new Date(date);
  const dayOfWeek  = parsedDate.getUTCDay();

  const [config, unavailableSlots] = await Promise.all([
    prisma.slotConfig.findUnique({ where: { courtId_dayOfWeek: { courtId, dayOfWeek } } }),
    // Fetch both BOOKED and BLOCKED slots — players can't book either
    prisma.slot.findMany({
      where: { courtId, date: parsedDate, status: { in: ["BOOKED", "BLOCKED"] } },
      select: { startTime: true, status: true },
    }),
  ]);

  if (!config) return NextResponse.json({ slots: [] });

  // Build a map: startTime → status (BOOKED / BLOCKED)
  const unavailableMap = new Map<string, string>();
  for (const s of unavailableSlots) unavailableMap.set(s.startTime, s.status);

  const now        = new Date();
  const isToday    = parsedDate.toDateString() === now.toDateString();
  const currentMin = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

  const slots = generateSlots(config.openTime, config.closeTime, config.slotDuration).map(({ start, end }) => {
    const [eh, em]  = end.split(":").map(Number);
    const endMin    = eh * 60 + em;
    const slotStatus = unavailableMap.get(start);

    // A slot is available only if:
    //   1. Its END time hasn't passed yet (so even mid-slot, player can still book)
    //   2. It's not booked or blocked
    const available = endMin > currentMin && !slotStatus;

    return {
      start,
      end,
      price:     config.pricePerSlot,
      available,
      // Tell the UI WHY it's unavailable (for better labels)
      reason: !available
        ? slotStatus === "BLOCKED" ? "blocked"
          : slotStatus === "BOOKED"  ? "booked"
          : "past"
        : null,
    };
  });

  return NextResponse.json({ slots });
}
