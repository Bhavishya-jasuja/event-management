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
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid." }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { slot: { include: { court: { include: { venue: { select: { ownerId: true } } } } } } },
  });

  if (!booking) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (booking.slot.court.venue.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not your venue." }, { status: 403 });
  }
  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "Already cancelled." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data:  { status: "CANCELLED", cancellationReason: parsed.data.reason ?? "Cancelled by venue owner" },
    }),
    prisma.slot.update({
      where: { id: booking.slotId },
      data:  { status: "AVAILABLE" },
    }),
  ]);

  return NextResponse.json({ success: true });
}
