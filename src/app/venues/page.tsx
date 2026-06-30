"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, MapPin, Star, SlidersHorizontal, X, LocateFixed, Loader2, Navigation, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Navbar from "@/components/layout/Navbar";

const SPORTS = [
  { label: "All",        value: "" },
  { label: "Cricket",    value: "CRICKET" },
  { label: "Football",   value: "FOOTBALL" },
  { label: "Badminton",  value: "BADMINTON" },
  { label: "Tennis",     value: "TENNIS" },
  { label: "Basketball", value: "BASKETBALL" },
  { label: "Volleyball", value: "VOLLEYBALL" },
  { label: "Turf",       value: "TURF" },
];

interface Venue {
  id: string; name: string; city: string; state: string;
  sportTypes: string[]; photos: string[];
  latitude: number | null; longitude: number | null;
  courtCount: number; reviewCount: number; avgRating: number | null;
  minPrice?: number | null;
}

interface VenueWithDistance extends Venue { distance: number | null }

type LocationState = "idle" | "loading" | "granted" | "denied";

const sportLabel = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export default function VenuesPage() {
  const [venues,       setVenues]       = useState<Venue[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [sport,        setSport]        = useState("");
  const [city,         setCity]         = useState("");
  const [userLoc,      setUserLoc]      = useState<{ lat: number; lng: number } | null>(null);
  const [locState,     setLocState]     = useState<LocationState>("idle");
  const [locError,     setLocError]     = useState("");
  const [radius,       setRadius]       = useState(25);

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (sport)  params.set("sport", sport);
    if (city)   params.set("city",  city);
    if (search) params.set("q",     search);
    const res  = await fetch(`/api/venues?${params}`);
    const data = await res.json();
    setVenues(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [sport, city, search]);

  useEffect(() => {
    const t = setTimeout(fetchVenues, 300);
    return () => clearTimeout(t);
  }, [fetchVenues]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search).get("sport");
    if (sp) setSport(sp);
  }, []);

  function requestLocation() {
    if (!navigator.geolocation) { setLocState("denied"); return; }
    setLocState("loading");
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocState("granted");
        setCity("");
      },
      (err) => {
        setLocState("denied");
        setLocError(err.code === 1 ? "Location access denied." : "Couldn't get your location.");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  function clearLocation() {
    setUserLoc(null);
    setLocState("idle");
    setLocError("");
  }

  const displayVenues: VenueWithDistance[] = venues
    .map((v) => ({
      ...v,
      distance: userLoc && v.latitude != null && v.longitude != null
        ? haversine(userLoc.lat, userLoc.lng, v.latitude, v.longitude)
        : null,
    }))
    .filter((v) => {
      if (userLoc && v.distance !== null) return v.distance <= radius;
      return true;
    })
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return 0;
    });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Search & filter bar — sticky below navbar */}
      <div className="sticky top-16 z-30 border-b border-border bg-card/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-secondary/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground transition-colors"
                placeholder="Search venues by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* City */}
            {locState !== "granted" && (
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  className="pl-9 pr-4 py-2 w-36 rounded-lg border border-border bg-secondary/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-muted-foreground transition-colors"
                  placeholder="City..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            )}

            {/* Near Me */}
            {locState === "idle" && (
              <button onClick={requestLocation} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/50 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                <LocateFixed className="h-4 w-4" /> Near Me
              </button>
            )}
            {locState === "loading" && (
              <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Locating...
              </div>
            )}
            {locState === "granted" && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/40 bg-primary/10">
                <Navigation className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
                <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="bg-transparent text-primary text-sm font-medium focus:outline-none cursor-pointer">
                  <option value={5}>Within 5 km</option>
                  <option value={10}>Within 10 km</option>
                  <option value={25}>Within 25 km</option>
                  <option value={50}>Within 50 km</option>
                </select>
                <button onClick={clearLocation} className="text-primary/60 hover:text-primary ml-1"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
            {locState === "denied" && (
              <button onClick={requestLocation} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/10 transition-colors">
                <LocateFixed className="h-4 w-4" /> Retry
              </button>
            )}
          </div>

          {locError && <p className="text-xs text-destructive mt-2">{locError}</p>}

          {/* Sport chips */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {SPORTS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSport(s.value)}
                className={cn(
                  "px-3.5 py-1 rounded-full text-sm font-medium whitespace-nowrap border transition-all flex-shrink-0",
                  sport === s.value
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground bg-background"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Result count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-medium text-muted-foreground">
            {loading ? (
              <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...</span>
            ) : locState === "granted"
              ? `${displayVenues.length} venue${displayVenues.length !== 1 ? "s" : ""} within ${radius} km`
              : `${displayVenues.length} venue${displayVenues.length !== 1 ? "s" : ""} found`}
          </p>
          {!loading && displayVenues.length > 0 && (
            <span className="text-xs text-muted-foreground">Click any venue to view slots & prices</span>
          )}
        </div>

        {/* Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
                <div className="aspect-video bg-secondary/60" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-secondary/70 rounded w-3/4" />
                  <div className="h-3 bg-secondary/50 rounded w-1/2" />
                  <div className="flex justify-between">
                    <div className="h-3 bg-secondary/40 rounded w-1/4" />
                    <div className="h-3 bg-secondary/40 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayVenues.length === 0 ? (
          /* Empty state */
          <div className="text-center py-24">
            <div className="text-6xl mb-6">🏟️</div>
            <h3 className="font-bold text-xl mb-2">No venues found</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {locState === "granted"
                ? `No venues within ${radius} km — try a larger radius`
                : "Try searching in a different city or changing the sport filter"}
            </p>
            {locState === "granted" && (
              <button onClick={() => setRadius((r) => Math.min(r * 2, 100))} className="text-sm font-medium text-primary hover:underline">
                Expand to {Math.min(radius * 2, 100)} km →
              </button>
            )}
            {sport && (
              <button onClick={() => setSport("")} className="block mx-auto mt-2 text-sm font-medium text-primary hover:underline">
                Show all sports →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayVenues.map((venue) => (
              <Link key={venue.id} href={`/venues/${venue.id}`}>
                <div className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/8 transition-all duration-200 group cursor-pointer h-full flex flex-col">
                  {/* Photo */}
                  <div className="aspect-video bg-secondary/50 overflow-hidden relative">
                    {venue.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={venue.photos[0]}
                        alt={venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-secondary to-secondary/50">🏟️</div>
                    )}

                    {/* Sport badges */}
                    <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                      {venue.sportTypes.slice(0, 2).map((s) => (
                        <span key={s} className="text-[10px] font-semibold bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">
                          {sportLabel(s)}
                        </span>
                      ))}
                      {venue.sportTypes.length > 2 && (
                        <span className="text-[10px] font-semibold bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">
                          +{venue.sportTypes.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Distance badge */}
                    {venue.distance !== null && (
                      <div className="absolute top-3 right-3">
                        <span className="flex items-center gap-1 text-[10px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          <Navigation className="h-2.5 w-2.5" />
                          {fmtDist(venue.distance)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-base truncate group-hover:text-primary transition-colors">{venue.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      {venue.city}, {venue.state}
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{venue.courtCount} court{venue.courtCount !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {venue.minPrice ? (
                          <span className="text-sm font-semibold text-primary">₹{venue.minPrice}<span className="text-xs text-muted-foreground font-normal">/slot</span></span>
                        ) : null}
                        {venue.avgRating ? (
                          <div className="flex items-center gap-0.5">
                            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-semibold">{venue.avgRating}</span>
                            <span className="text-xs text-muted-foreground">({venue.reviewCount})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">New</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA for more venues */}
        {!loading && displayVenues.length > 0 && displayVenues.length < 6 && (
          <div className="mt-12 rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground mb-3">More venues coming soon to your city.</p>
            <Link href="/signup?role=owner">
              <button className="text-sm font-medium text-primary hover:underline flex items-center gap-1 mx-auto">
                Own a venue? List it free <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
