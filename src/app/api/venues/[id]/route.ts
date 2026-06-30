import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const venue = await prisma.venue.findUnique({
    where: { id, status: "ACTIVE" },
    include: {
      owner: { select: { name: true } },
      courts: {
        where: { isActive: true },
        include: { slotConfigs: true },
      },
      reviews: {
        include: { player: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { reviews: true } },
    },
  });

  if (!venue) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json(venue);
}
