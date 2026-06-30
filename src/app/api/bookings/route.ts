import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  courtId:   z.string(),
  date:      z.string(),
  startTime: z.string(),
  endTime:   z.string(),
  price:     z.number().positive(),
  groupRef:  z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "PLAYER") {
    return NextResponse.json({ error: "Only players can book." }, { status: 401 });
  }

  const player = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isBlacklisted: true } });
  if (player?.isBlacklisted) {
    return NextResponse.json({ error: "Your account has been restricted." }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

  const { courtId, date, startTime, endTime, price, groupRef } = parsed.data;
  const parsedDate = new Date(date);

  // Fast-path check outside transaction (not authoritative — transaction re-checks)
  const preCheck = await prisma.slot.findUnique({
    where: { courtId_date_startTime: { courtId, date: parsedDate, startTime } },
  });
  if (preCheck?.status === "BOOKED")   return NextResponse.json({ error: "This slot was just booked. Please pick another." }, { status: 409 });
  if (preCheck?.status === "BLOCKED")  return NextResponse.json({ error: "This slot has been blocked by the venue." },        { status: 409 });

  let booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      // Authoritative check inside transaction — catches race conditions
      const slotNow = await tx.slot.findUnique({
        where: { courtId_date_startTime: { courtId, date: parsedDate, startTime } },
      });
      if (slotNow?.status === "BLOCKED") throw new Error("SLOT_BLOCKED");

      const slot = await tx.slot.upsert({
        where:  { courtId_date_startTime: { courtId, date: parsedDate, startTime } },
        create: { courtId, date: parsedDate, startTime, endTime, price, status: "BOOKED" },
        update: { status: "BOOKED" },
      });

      const existingBooking = await tx.booking.findUnique({ where: { slotId: slot.id } });

      if (existingBooking) {
        // Active booking already exists — another player just grabbed it
        if (existingBooking.status !== "CANCELLED") throw new Error("SLOT_TAKEN");
        // Previous booking was cancelled — safe to reuse the record
        return tx.booking.update({
          where: { slotId: slot.id },
          data:  { playerId: session.user.id, totalAmount: price, status: "CONFIRMED", groupRef: groupRef ?? null, cancellationReason: null },
        });
      }

      return tx.booking.create({
        data: { playerId: session.user.id, slotId: slot.id, totalAmount: price, status: "CONFIRMED", groupRef: groupRef ?? null },
      });
    });
  } catch (err: any) {
    if (err?.message === "SLOT_TAKEN")    return NextResponse.json({ error: "Someone just booked this slot. Please pick another time." }, { status: 409 });
    if (err?.message === "SLOT_BLOCKED")  return NextResponse.json({ error: "This slot has been blocked by the venue." },                { status: 409 });
    throw err;
  }

  return NextResponse.json({ bookingRef: booking.bookingRef, bookingId: booking.id });
}
