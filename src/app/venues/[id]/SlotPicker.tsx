"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Loader2, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Court { id: string; name: string; sportType: string; slotDuration: number; }
interface Slot  { start: string; end: string; price: number; available: boolean; reason?: string | null; }

const sportLabel = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

function minToTime(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export default function SlotPicker({
  venueId, courts, isLoggedIn, isPlayer,
}: {
  venueId: string; courts: Court[]; isLoggedIn: boolean; isPlayer: boolean;
}) {
  const router = useRouter();

  const [courtId,  setCourtId]  = useState(courts[0]?.id ?? "");
  const [date,     setDate]     = useState(todayStr());
  const [slots,    setSlots]    = useState<Slot[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [booking,  setBooking]  = useState(false);
  const [successes,setSuccesses]= useState<string[]>([]);
  const [error,    setError]    = useState("");

  // Range selection: null = nothing selected
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd,   setRangeEnd]   = useState<string | null>(null);

  const court = courts.find((c) => c.id === courtId);

  // ---- fetch slots ----
  useEffect(() => {
    if (!courtId || !date) return;
    setRangeStart(null); setRangeEnd(null);
    setError(""); setLoading(true);
    fetch(`/api/venues/${venueId}/slots?courtId=${courtId}&date=${date}&_t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .finally(() => setLoading(false));
  }, [courtId, date, venueId]);

  // Silent 15-second background refresh
  useEffect(() => {
    if (!courtId || !date) return;
    function silentRefresh() {
      fetch(`/api/venues/${venueId}/slots?courtId=${courtId}&date=${date}&_t=${Date.now()}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          const fresh: Slot[] = d.slots ?? [];
          setSlots(fresh);
          // If selected range now has unavailable slot, warn
          setError((prev) => {
            if (rangeStart && rangeEnd) {
              const inRange = getSlotsInRange(rangeStart, rangeEnd, fresh);
              if (inRange.some((s) => !s.available)) return "A slot in your selected range was just booked. Please reselect.";
            }
            return prev;
          });
        })
        .catch(() => {});
    }
    const id = setInterval(silentRefresh, 15000);
    const onVisible = () => { if (document.visibilityState === "visible") silentRefresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [courtId, date, venueId, rangeStart, rangeEnd]);

  // ---- range helpers ----
  function getSlotsInRange(from: string, to: string, src: Slot[] = slots): Slot[] {
    const lo = timeToMin(from) <= timeToMin(to) ? from : to;
    const hi = timeToMin(from) <= timeToMin(to) ? to   : from;
    return src.filter((s) => timeToMin(s.start) >= timeToMin(lo) && timeToMin(s.start) <= timeToMin(hi));
  }

  // Derived selected slots
  const selectedSlots: Slot[] = (() => {
    if (!rangeStart) return [];
    if (!rangeEnd)   return slots.filter((s) => s.start === rangeStart);
    return getSlotsInRange(rangeStart, rangeEnd);
  })();

  const hasBlockedInRange = selectedSlots.some((s) => !s.available);

  function clickSlot(slot: Slot) {
    if (!slot.available) return;
    setError("");
    if (!rangeStart) {
      setRangeStart(slot.start);
      setRangeEnd(null);
      return;
    }
    if (!rangeEnd) {
      if (slot.start === rangeStart) {
        // Deselect
        setRangeStart(null);
        return;
      }
      setRangeEnd(slot.start);
      return;
    }
    // Both set → restart from this slot
    setRangeStart(slot.start);
    setRangeEnd(null);
  }

  function clearRange() {
    setRangeStart(null);
    setRangeEnd(null);
    setError("");
  }

  // ---- slot visual state ----
  function slotState(slot: Slot): "available" | "selected-edge" | "selected-mid" | "blocked" | "booked" | "past" {
    if (!slot.available) {
      return slot.reason === "booked" ? "booked" : slot.reason === "blocked" ? "blocked" : "past";
    }
    if (!rangeStart) return "available";
    if (selectedSlots.some((s) => s.start === slot.start)) {
      const isEdge = slot.start === rangeStart || slot.start === rangeEnd ||
        (rangeEnd === null && slot.start === rangeStart);
      return isEdge ? "selected-edge" : "selected-mid";
    }
    return "available";
  }

  // ---- booking ----
  const totalPrice    = selectedSlots.reduce((s, sl) => s + sl.price, 0);
  const totalDuration = (court?.slotDuration ?? 30) * selectedSlots.length;
  const rangeLabel    = selectedSlots.length > 0
    ? `${selectedSlots[0].start} – ${selectedSlots[selectedSlots.length - 1].end}`
    : "";

  async function handleBook() {
    if (!isLoggedIn) { router.push("/login"); return; }
    if (selectedSlots.length === 0 || hasBlockedInRange) return;
    setBooking(true); setError("");
    const bookedIds: string[] = [];
    const results:   string[] = [];
    const groupRef = selectedSlots.length > 1 ? crypto.randomUUID() : undefined;
    try {
      for (const slot of selectedSlots) {
        const res  = await fetch("/api/bookings", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courtId, date, startTime: slot.start, endTime: slot.end, price: slot.price, groupRef }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (bookedIds.length > 0) {
            await Promise.all(bookedIds.map((id) =>
              fetch(`/api/bookings/${id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "CANCEL", reason: "Partial booking rollback" }),
              })
            ));
          }
          setError(data.error ?? `Slot ${slot.start} is no longer available.`);
          break;
        }
        bookedIds.push(data.bookingId);
        results.push(data.bookingRef);
      }
      if (results.length === selectedSlots.length) {
        setSuccesses(results);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBooking(false);
    }
  }

  // ---- success screen ----
  if (successes.length > 0) {
    return (
      <div className="sticky top-24 rounded-2xl border border-green-400/30 bg-green-400/5 p-6 text-center">
        <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
        <h3 className="font-bold text-lg text-green-400 mb-1">
          {successes.length > 1 ? `${successes.length} Slots Booked!` : "Slot Booked!"}
        </h3>
        <p className="text-sm text-muted-foreground mb-1">{rangeLabel || "Your court is reserved."}</p>
        <p className="text-sm text-muted-foreground mb-4">{formatDuration(totalDuration)} · ₹{totalPrice.toLocaleString("en-IN")}</p>
        {successes.map((ref, i) => (
          <div key={i} className="font-mono text-xs bg-secondary/60 rounded px-3 py-1 mb-1.5">#{ref.slice(-8).toUpperCase()}</div>
        ))}
        <Button className="w-full bg-primary text-primary-foreground mt-4" onClick={() => router.push("/dashboard/bookings")}>
          View My Bookings
        </Button>
      </div>
    );
  }

  return (
    <div className="sticky top-24 rounded-2xl border border-border/50 bg-card/40 overflow-hidden">
      <div className="p-5 border-b border-border/30">
        <h2 className="font-bold text-lg">Book a slot</h2>
        {court && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {sportLabel(court.sportType)} · {court.slotDuration} min per slot
          </p>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Court selector */}
        {courts.length > 1 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Court</label>
            <div className="flex flex-wrap gap-2">
              {courts.map((c) => (
                <button key={c.id} onClick={() => setCourtId(c.id)}
                  className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    courtId === c.id ? "border-primary bg-primary/15 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40")}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Date
          </label>
          <input type="date" value={date} min={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-secondary/50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
          {date && <p className="text-xs text-muted-foreground mt-1">{formatDate(date)}</p>}
        </div>

        {/* Instruction hint */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {!rangeStart
                ? "Tap your start time"
                : !rangeEnd
                ? "Now tap your end time"
                : `${selectedSlots.length} slot${selectedSlots.length !== 1 ? "s" : ""} · ${rangeLabel}`}
            </label>
            {rangeStart && (
              <button onClick={clearRange} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground rounded-lg border border-border/30 bg-secondary/20">
              No slots available for this date
            </div>
          ) : (
            <div className="rounded-xl border border-border/30 overflow-hidden">
              {slots.map((slot, idx) => {
                const state    = slotState(slot);
                const isUnavail = state === "booked" || state === "blocked" || state === "past";
                const isEdge   = state === "selected-edge";
                const isMid    = state === "selected-mid";
                const isInError = hasBlockedInRange && (isMid || isEdge);

                return (
                  <button
                    key={slot.start}
                    disabled={isUnavail}
                    onClick={() => clickSlot(slot)}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-all border-b border-border/20 last:border-0",
                      isUnavail  ? "bg-transparent text-muted-foreground/25 cursor-not-allowed" :
                      isInError  ? "bg-destructive/15 text-destructive" :
                      isEdge     ? "bg-primary text-primary-foreground font-semibold" :
                      isMid      ? "bg-primary/20 text-primary" :
                      "hover:bg-primary/8 text-foreground"
                    )}
                  >
                    <span className={cn("font-medium tabular-nums", isUnavail && "line-through opacity-30")}>
                      {slot.start} – {slot.end}
                    </span>
                    <span className={cn("text-xs tabular-nums",
                      isUnavail  ? "opacity-30" :
                      isEdge     ? "text-primary-foreground/80 font-semibold" :
                      isMid      ? "text-primary/80" :
                      "text-muted-foreground"
                    )}>
                      {isUnavail
                        ? state === "booked" ? "Booked" : state === "blocked" ? "Blocked" : "Past"
                        : `₹${slot.price.toLocaleString("en-IN")}`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Error if blocked slot in range */}
        {hasBlockedInRange && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            Your selected range includes a slot that&apos;s already booked or blocked. Please adjust your selection.
          </p>
        )}

        {/* Summary */}
        {selectedSlots.length > 0 && !hasBlockedInRange && (
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-semibold">{formatDuration(totalDuration)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium tabular-nums">{rangeLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{selectedSlots.length} slot{selectedSlots.length !== 1 ? "s" : ""} × ₹{slots.find(s=>s.start===rangeStart)?.price.toLocaleString("en-IN") ?? 0}</span>
              <span className="text-muted-foreground font-medium">₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
            <div className="border-t border-primary/20 pt-2 flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-bold text-primary text-lg">₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        {error && !hasBlockedInRange && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
        )}

        <Button
          onClick={handleBook}
          disabled={selectedSlots.length === 0 || booking || hasBlockedInRange || (!isPlayer && isLoggedIn)}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-11"
        >
          {booking
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Booking...</>
            : !isLoggedIn
            ? "Login to Book"
            : !isPlayer
            ? "Only players can book"
            : selectedSlots.length === 0
            ? "Select a time range above"
            : `Confirm ${formatDuration(totalDuration)} — ₹${totalPrice.toLocaleString("en-IN")}`}
        </Button>

        {!isLoggedIn && (
          <p className="text-xs text-center text-muted-foreground">
            <a href="/login" className="text-primary hover:underline">Log in</a> as a player to book
          </p>
        )}
      </div>
    </div>
  );
}
