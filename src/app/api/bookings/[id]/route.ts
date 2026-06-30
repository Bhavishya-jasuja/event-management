import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["CANCEL"]),
  reason: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { slot: { include: { court: { include: { venue: { select: { ownerId: true } } } } } } },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const isOwner  = booking.slot.court.venue.ownerId === session.user.id;
  const isPlayer = booking.playerId === session.user.id;
  const isAdmin  = session.user.role === "ADMIN";

  if (!isOwner && !isPlayer && !isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "Already cancelled." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data:  { status: "CANCELLED", cancellationReason: parsed.data.reason ?? null },
    }),
    prisma.slot.update({
      where: { id: booking.slotId },
      data:  { status: "AVAILABLE" },
    }),
  ]);

  return NextResponse.json({ success: true });
}
