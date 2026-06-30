import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sport  = searchParams.get("sport");
  const city   = searchParams.get("city")?.trim();
  const search = searchParams.get("q")?.trim();

  const venues = await prisma.venue.findMany({
    where: {
      status: "ACTIVE",
      ...(sport ? { sportTypes: { has: sport as never } } : {}),
      ...(city   ? { city:  { contains: city,   mode: "insensitive" } } : {}),
      ...(search ? { name:  { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      _count: { select: { courts: true, reviews: true } },
      reviews: { select: { rating: true } },
      courts: { include: { slotConfigs: { select: { pricePerSlot: true }, take: 1 } }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = venues.map((v) => {
    // Find the minimum price across all courts' slot configs
    const prices = v.courts.flatMap(c => c.slotConfigs.map(sc => sc.pricePerSlot));
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;

    return {
      id: v.id,
      name: v.name,
      city: v.city,
      state: v.state,
      sportTypes: v.sportTypes,
      amenities: v.amenities,
      photos: v.photos,
      latitude:  v.latitude,
      longitude: v.longitude,
      courtCount: v._count.courts,
      reviewCount: v._count.reviews,
      minPrice,
      avgRating: v.reviews.length
        ? Math.round((v.reviews.reduce((s, r) => s + r.rating, 0) / v.reviews.length) * 10) / 10
        : null,
    };
  });

  return NextResponse.json(result);
}
