import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SportType } from "@/generated/prisma/enums";
import { z } from "zod";

const courtSchema = z.object({
  name: z.string().min(1),
  sportType: z.string().min(1),
  pricePerSlot: z.number().positive(),
  slotDurationMinutes: z.number().int().min(30).max(180),
  openTime: z.string(),
  closeTime: z.string(),
});

const venueSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(20),
  sportTypes: z.array(z.string()).min(1),
  amenities: z.array(z.string()),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
  photos: z.array(z.string()).min(1).max(8),
  courts: z.array(courtSchema).min(1),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const venues = await prisma.venue.findMany({
    where:   { ownerId: session.user.id },
    include: { courts: { select: { id: true, name: true, sportType: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ venues });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = venueSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { courts, ...venueData } = parsed.data;

  // Geocode address → lat/lng (non-fatal if it fails)
  let latitude: number | undefined;
  let longitude: number | undefined;
  try {
    const q   = encodeURIComponent(`${venueData.address}, ${venueData.city}, ${venueData.state}, India`);
    const geo = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { "User-Agent": "NexArc/1.0 (sports venue booking)" },
    });
    const geoData: any[] = await geo.json();
    if (geoData.length > 0) {
      latitude  = parseFloat(geoData[0].lat);
      longitude = parseFloat(geoData[0].lon);
    }
  } catch { /* geocoding failure is non-fatal */ }

  const venue = await prisma.venue.create({
    data: {
      ...venueData,
      sportTypes: venueData.sportTypes as SportType[],
      ownerId: session.user.id,
      status: "PENDING",
      latitude,
      longitude,
      courts: {
        create: courts.map((c) => ({
          name: c.name,
          sportType: c.sportType as SportType,
          // Create SlotConfig for all 7 days (0=Sun … 6=Sat) with same pricing
          slotConfigs: {
            create: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
              dayOfWeek: day,
              openTime: c.openTime,
              closeTime: c.closeTime,
              slotDuration: c.slotDurationMinutes,
              pricePerSlot: c.pricePerSlot,
            })),
          },
        })),
      },
    },
  });

  return NextResponse.json({ id: venue.id });
}
