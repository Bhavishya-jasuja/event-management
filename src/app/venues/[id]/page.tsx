import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { MapPin, Star, Users, CheckCircle, ArrowLeft, Zap } from "lucide-react";
import Link from "next/link";
import SlotPicker from "./SlotPicker";

const sportLabel = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

export default async function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [venue, session] = await Promise.all([
    prisma.venue.findUnique({
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
          take: 8,
        },
        _count: { select: { reviews: true } },
      },
    }),
    auth(),
  ]);

  if (!venue) notFound();

  const avgRating = venue.reviews.length
    ? (venue.reviews.reduce((s, r) => s + r.rating, 0) / venue.reviews.length).toFixed(1)
    : null;

  const minPrice = venue.courts.length
    ? Math.min(...venue.courts.flatMap((c) => c.slotConfigs.map((sc) => sc.pricePerSlot)))
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/venues" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to venues
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-base">Nex<span className="text-primary">Arc</span></span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">Log in</Link>
            <span className="text-border">|</span>
            <Link href="/signup" className="text-primary font-medium hover:underline">Sign up</Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Photo gallery */}
        {venue.photos.length === 0 ? (
          <div className="rounded-2xl overflow-hidden h-72 mb-8 bg-secondary/50 flex items-center justify-center text-6xl">🏟️</div>
        ) : venue.photos.length === 1 ? (
          <div className="rounded-2xl overflow-hidden h-72 mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={venue.photos[0]} alt={venue.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`grid gap-2 rounded-2xl overflow-hidden h-72 mb-8 ${venue.photos.length === 2 ? "grid-cols-2" : venue.photos.length === 3 ? "grid-cols-3" : "grid-cols-4 grid-rows-2"}`}>
            {venue.photos.slice(0, 5).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`${venue.name} photo ${i + 1}`}
                className={`w-full h-full object-cover ${venue.photos.length >= 4 && i === 0 ? "col-span-2 row-span-2" : ""}`}
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-5 gap-8">
          {/* Left — venue info */}
          <div className="col-span-3 space-y-8">
            {/* Header */}
            <div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {venue.sportTypes.map((s) => (
                  <span key={s} className="text-xs font-semibold bg-primary/15 border border-primary/25 text-primary px-2.5 py-0.5 rounded-full">
                    {sportLabel(s)}
                  </span>
                ))}
              </div>
              <h1 className="text-2xl font-bold">{venue.name}</h1>
              <div className="flex items-center gap-1 text-muted-foreground mt-1.5">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{venue.address}, {venue.city}, {venue.state} — {venue.pincode}</span>
              </div>
              <div className="flex items-center gap-4 mt-3">
                {avgRating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold">{avgRating}</span>
                    <span className="text-sm text-muted-foreground">({venue._count.reviews} reviews)</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {venue.courts.length} court{venue.courts.length !== 1 ? "s" : ""}
                </div>
                {minPrice && (
                  <div className="text-sm font-semibold text-primary">from ₹{minPrice}/slot</div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="font-semibold mb-2">About this venue</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{venue.description}</p>
            </div>

            {/* Amenities */}
            {venue.amenities.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3">Amenities</h2>
                <div className="grid grid-cols-2 gap-2">
                  {venue.amenities.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Courts info */}
            <div>
              <h2 className="font-semibold mb-3">Courts</h2>
              <div className="space-y-3">
                {venue.courts.map((court) => {
                  const prices = court.slotConfigs.map((sc) => sc.pricePerSlot);
                  const minP   = Math.min(...prices);
                  const maxP   = Math.max(...prices);
                  return (
                    <div key={court.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{court.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{sportLabel(court.sportType)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-primary">
                          ₹{minP === maxP ? minP : `${minP}–${maxP}`}<span className="text-xs text-muted-foreground font-normal">/slot</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{court.slotConfigs[0]?.slotDuration} min slots</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviews */}
            {venue.reviews.length > 0 && (
              <div>
                <h2 className="font-semibold mb-3">Reviews</h2>
                <div className="space-y-3">
                  {venue.reviews.map((r) => (
                    <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{r.player.name}</span>
                        <div className="flex">
                          {[1,2,3,4,5].map((n) => (
                            <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-border"}`} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — slot picker */}
          <div className="col-span-2">
            <SlotPicker
              venueId={venue.id}
              courts={venue.courts.map((c) => ({
                id: c.id,
                name: c.name,
                sportType: c.sportType,
                slotDuration: c.slotConfigs[0]?.slotDuration ?? 60,
              }))}
              isLoggedIn={!!session}
              isPlayer={session?.user.role === "PLAYER"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
