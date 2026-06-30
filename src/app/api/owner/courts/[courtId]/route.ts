import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  slotDuration:  z.number().int().min(30).max(180),
  pricePerSlot:  z.number().positive().optional(),
  openTime:      z.string().optional(),
  closeTime:     z.string().optional(),
});

// PATCH /api/owner/courts/[courtId]
// Updates SlotConfig for all 7 days of this court
export async function PATCH(req: Request, { params }: { params: Promise<{ courtId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OWNER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courtId } = await params;

  // Verify ownership
  const court = await prisma.court.findFirst({
    where: { id: courtId, venue: { ownerId: session.user.id } },
  });
  if (!court) return NextResponse.json({ error: "Court not found" }, { status: 404 });

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const update: Record<string, unknown> = { slotDuration: parsed.data.slotDuration };
  if (parsed.data.pricePerSlot !== undefined) update.pricePerSlot = parsed.data.pricePerSlot;
  if (parsed.data.openTime     !== undefined) update.openTime     = parsed.data.openTime;
  if (parsed.data.closeTime    !== undefined) update.closeTime    = parsed.data.closeTime;

  await prisma.slotConfig.updateMany({
    where:  { courtId },
    data:   update,
  });

  return NextResponse.json({ ok: true });
}

// GET — return current config for this court
export async function GET(req: Request, { params }: { params: Promise<{ courtId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OWNER")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courtId } = await params;

  const config = await prisma.slotConfig.findFirst({
    where: { courtId, court: { venue: { ownerId: session.user.id } } },
  });
  if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ config });
}
