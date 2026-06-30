import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const blockSchema = z.object({
  courtId:   z.string(),
  date:      z.string(),
  startTime: z.string(),
  endTime:   z.string(),
  price:     z.number(),
  action:    z.enum(["BLOCK", "UNBLOCK"]),
});

// GET /api/owner/slots?courtId=&date=
export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courtId = searchParams.get("courtId");
  const date    = searchParams.get("date");
  if (!courtId || !date) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  // Verify court belongs to this owner
  const court = await prisma.court.findFirst({
    where: { id: courtId, venue: { ownerId: session.user.id } },
    include: { slotConfigs: true },
  });
  if (!court) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsedDate = new Date(date);
  const dayOfWeek  = parsedDate.getUTCDay();
  const config     = court.slotConfigs.find((c) => c.dayOfWeek === dayOfWeek);
  if (!config) return NextResponse.json({ slots: [] });

  // Generate all time slots
  function generateSlots(open: string, close: string, dur: number) {
    const slots: { start: string; end: string }[] = [];
    const [oh, om] = open.split(":").map(Number);
    const [ch, cm] = close.split(":").map(Number);
    let cur = oh * 60 + om;
    const end = ch * 60 + cm;
    while (cur + dur <= end) {
      const s = `${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`;
      cur += dur;
      const e = `${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`;
      slots.push({ start: s, end: e });
    }
    return slots;
  }

  const generated = generateSlots(config.openTime, config.closeTime, config.slotDuration);

  // Fetch existing slot records for this date
  const existing = await prisma.slot.findMany({
    where: { courtId, date: parsedDate },
    include: { booking: { include: { player: { select: { name: true } } } } },
  });

  const slotMap = new Map(existing.map((s) => [s.startTime, s]));

  const slots = generated.map(({ start, end }) => {
    const record = slotMap.get(start);
    return {
      start,
      end,
      price:      record?.price ?? config.pricePerSlot,
      status:     record?.status ?? "AVAILABLE",
      slotId:     record?.id ?? null,
      playerName: record?.booking?.player?.name ?? null,
    };
  });

  return NextResponse.json({ slots });
}

// POST /api/owner/slots — block or unblock a slot
export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json();
  const parsed = blockSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const { courtId, date, startTime, endTime, price, action } = parsed.data;

  // Verify court belongs to this owner
  const court = await prisma.court.findFirst({
    where: { id: courtId, venue: { ownerId: session.user.id } },
  });
  if (!court) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsedDate = new Date(date);

  // Can't block an already booked slot
  if (action === "BLOCK") {
    const existing = await prisma.slot.findUnique({
      where: { courtId_date_startTime: { courtId, date: parsedDate, startTime } },
    });
    if (existing?.status === "BOOKED") {
      return NextResponse.json({ error: "Cannot block a slot that is already booked." }, { status: 409 });
    }
  }

  const slot = await prisma.slot.upsert({
    where:  { courtId_date_startTime: { courtId, date: parsedDate, startTime } },
    create: { courtId, date: parsedDate, startTime, endTime, price, status: action === "BLOCK" ? "BLOCKED" : "AVAILABLE" },
    update: { status: action === "BLOCK" ? "BLOCKED" : "AVAILABLE" },
  });

  return NextResponse.json({ slot });
}
