"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Lock, Unlock, CheckCircle, Clock, Ban, RefreshCw, Settings, Save, X } from "lucide-react";

interface Venue   { id: string; name: string; courts: Court[] }
interface Court   { id: string; name: string; sportType: string }
interface Slot    {
  start: string; end: string; price: number;
  status: "AVAILABLE" | "BOOKED" | "BLOCKED";
  slotId: string | null; playerName: string | null;
}
interface CourtCfg {
  slotDuration: number; pricePerSlot: number; openTime: string; closeTime: string;
}

type DisplayStatus = "AVAILABLE" | "BOOKED" | "BLOCKED" | "COMPLETED" | "EXPIRED";

function getDisplayStatus(slot: Slot, dateStr: string): DisplayStatus {
  const d = new Date(dateStr + "T00:00:00");
  const [h, m] = slot.end.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  if (d < new Date()) return slot.status === "BOOKED" ? "COMPLETED" : "EXPIRED";
  return slot.status;
}

function localDate(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function makeDayTabs() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const key = localDate(i);
    return {
      key,
      short:   d.toLocaleDateString("en-IN", { weekday: "short" }),
      num:     d.getDate(),
      mon:     d.toLocaleDateString("en-IN", { month: "short" }),
      isToday: i === 0,
    };
  });
}

const DAY_TABS = makeDayTabs();

const DURATIONS = [
  { value: 30,  label: "30 min" },
  { value: 60,  label: "1 hr" },
  { value: 90,  label: "1.5 hr" },
  { value: 120, label: "2 hr" },
];

const statusCfg: Record<DisplayStatus, { label: string; cls: string; btnAction: "block" | "unblock" | null; btnCls: string }> = {
  AVAILABLE: { label: "Available", cls: "border-green-400/30 bg-green-400/10 text-green-400",    btnAction: "block",   btnCls: "border-orange-400/40 text-orange-400 hover:bg-orange-400/10" },
  BOOKED:    { label: "Booked",    cls: "border-blue-400/30 bg-blue-400/10 text-blue-400",        btnAction: null,      btnCls: "" },
  BLOCKED:   { label: "Blocked",   cls: "border-orange-400/30 bg-orange-400/10 text-orange-400",  btnAction: "unblock", btnCls: "border-green-400/40 text-green-400 hover:bg-green-400/10" },
  COMPLETED: { label: "Completed", cls: "border-purple-400/30 bg-purple-400/10 text-purple-400",  btnAction: null,      btnCls: "" },
  EXPIRED:   { label: "Expired",   cls: "border-border/40 bg-secondary/30 text-muted-foreground", btnAction: null,      btnCls: "" },
};

export default function OwnerSlotsPage() {
  const [venues,      setVenues]      = useState<Venue[]>([]);
  const [venueId,     setVenueId]     = useState("");
  const [courtId,     setCourtId]     = useState("");
  const [date,        setDate]        = useState(localDate(0));
  const [slots,       setSlots]       = useState<Slot[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [fetching,    setFetching]    = useState(true);
  const [toggling,    setToggling]    = useState<string | null>(null);
  const [error,       setError]       = useState("");
  const [lastSync,    setLastSync]    = useState<Date | null>(null);

  // Court settings editor
  const [showSettings,  setShowSettings]  = useState(false);
  const [courtCfg,      setCourtCfg]      = useState<CourtCfg | null>(null);
  const [editDuration,  setEditDuration]  = useState(30);
  const [editPrice,     setEditPrice]     = useState("");
  const [editOpen,      setEditOpen]      = useState("05:00");
  const [editClose,     setEditClose]     = useState("23:00");
  const [savingCfg,     setSavingCfg]     = useState(false);
  const [cfgMsg,        setCfgMsg]        = useState("");

  const courtRef = useRef(courtId);
  const dateRef  = useRef(date);
  useEffect(() => { courtRef.current = courtId; }, [courtId]);
  useEffect(() => { dateRef.current  = date; },    [date]);

  useEffect(() => {
    fetch("/api/owner/venues", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const vs: Venue[] = d.venues ?? [];
        setVenues(vs);
        if (vs.length > 0) { setVenueId(vs[0].id); setCourtId(vs[0].courts[0]?.id ?? ""); }
      })
      .finally(() => setFetching(false));
  }, []);

  const courts = venues.find((v) => v.id === venueId)?.courts ?? [];

  const loadSlots = useCallback(async (cid: string, dt: string, showSpinner = false) => {
    if (!cid || !dt) return;
    if (showSpinner) setLoading(true);
    setError("");
    try {
      const res  = await fetch(`/api/owner/slots?courtId=${cid}&date=${dt}&_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      setSlots(data.slots ?? []);
      setLastSync(new Date());
    } catch { setError("Failed to load slots."); }
    finally { if (showSpinner) setLoading(false); }
  }, []);

  useEffect(() => {
    if (courtId && date) loadSlots(courtId, date, true);
  }, [courtId, date, loadSlots]);

  useEffect(() => {
    const id = setInterval(() => {
      if (courtRef.current && dateRef.current) loadSlots(courtRef.current, dateRef.current, false);
    }, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible" && courtRef.current && dateRef.current)
        loadSlots(courtRef.current, dateRef.current, false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [loadSlots]);

  // Load court config when court changes
  useEffect(() => {
    if (!courtId) return;
    setShowSettings(false);
    fetch(`/api/owner/courts/${courtId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.config) {
          setCourtCfg(d.config);
          setEditDuration(d.config.slotDuration);
          setEditPrice(String(d.config.pricePerSlot));
          setEditOpen(d.config.openTime);
          setEditClose(d.config.closeTime);
        }
      });
  }, [courtId]);

  async function saveCourtSettings() {
    setSavingCfg(true); setCfgMsg("");
    const res = await fetch(`/api/owner/courts/${courtId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotDuration: editDuration,
        pricePerSlot: parseFloat(editPrice),
        openTime:     editOpen,
        closeTime:    editClose,
      }),
    });
    if (res.ok) {
      setCfgMsg("Saved! Reloading slots…");
      setCourtCfg({ slotDuration: editDuration, pricePerSlot: parseFloat(editPrice), openTime: editOpen, closeTime: editClose });
      await loadSlots(courtId, date, true);
      setTimeout(() => { setCfgMsg(""); setShowSettings(false); }, 1200);
    } else {
      const d = await res.json(); setCfgMsg(d.error ?? "Save failed.");
    }
    setSavingCfg(false);
  }

  async function toggleSlot(slot: Slot & { ds: DisplayStatus }) {
    if (slot.ds === "COMPLETED" || slot.ds === "EXPIRED" || slot.ds === "BOOKED") return;
    const action = slot.ds === "BLOCKED" ? "UNBLOCK" : "BLOCK";
    setToggling(slot.start); setError("");
    try {
      const res = await fetch("/api/owner/slots", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ courtId, date, startTime: slot.start, endTime: slot.end, price: slot.price, action }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Action failed."); }
      else { await loadSlots(courtId, date, false); }
    } catch { setError("Network error."); }
    setToggling(null);
  }

  const slotsWithStatus = slots.map((s) => ({ ...s, ds: getDisplayStatus(s, date) }));
  const counts = {
    available: slotsWithStatus.filter((s) => s.ds === "AVAILABLE").length,
    booked:    slotsWithStatus.filter((s) => s.ds === "BOOKED").length,
    completed: slotsWithStatus.filter((s) => s.ds === "COMPLETED").length,
    blocked:   slotsWithStatus.filter((s) => s.ds === "BLOCKED").length,
    expired:   slotsWithStatus.filter((s) => s.ds === "EXPIRED").length,
  };

  if (fetching) return <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Slot Management</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Block/unblock · auto-refreshes every 15 s</p>
        </div>
        <button onClick={() => loadSlots(courtId, date, true)} disabled={loading}
          className="flex items-center gap-2 text-sm text-muted-foreground border border-border/50 px-3 py-1.5 rounded-lg hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Venue + Court */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Venue</label>
          <select value={venueId} onChange={(e) => {
            setVenueId(e.target.value);
            const v = venues.find((v) => v.id === e.target.value);
            setCourtId(v?.courts[0]?.id ?? "");
          }} className="w-full rounded-lg border border-border/60 bg-secondary/50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary">
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Court</label>
          <div className="flex gap-2">
            <select value={courtId} onChange={(e) => setCourtId(e.target.value)}
              className="flex-1 rounded-lg border border-border/60 bg-secondary/50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary">
              {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {/* Court settings toggle */}
            <button onClick={() => { setShowSettings((v) => !v); setCfgMsg(""); }}
              className={`px-3 rounded-lg border text-sm transition-colors ${showSettings ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
              title="Court settings">
              {showSettings ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Court settings editor */}
      {showSettings && (
        <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Court Settings</h3>
            {courtCfg && (
              <span className="text-xs text-muted-foreground">
                Current: {courtCfg.slotDuration} min slots · ₹{courtCfg.pricePerSlot} · {courtCfg.openTime}–{courtCfg.closeTime}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Slot duration */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block font-medium">Slot Duration</label>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button key={d.value} onClick={() => setEditDuration(d.value)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      editDuration === d.value ? "bg-primary border-primary text-primary-foreground" : "border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price per slot */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block font-medium">Price per Slot (₹)</label>
              <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} min={0}
                className="w-full rounded-lg border border-border/60 bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. 1000" />
            </div>

            {/* Open time */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block font-medium">Open Time</label>
              <input type="time" value={editOpen} onChange={(e) => setEditOpen(e.target.value)}
                className="w-full rounded-lg border border-border/60 bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>

            {/* Close time */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block font-medium">Close Time</label>
              <input type="time" value={editClose} onChange={(e) => setEditClose(e.target.value)}
                className="w-full rounded-lg border border-border/60 bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>

          {cfgMsg && (
            <p className={`text-xs mb-3 ${cfgMsg.startsWith("Saved") ? "text-green-400" : "text-destructive"}`}>{cfgMsg}</p>
          )}

          <div className="flex gap-2">
            <button onClick={saveCourtSettings} disabled={savingCfg || !editPrice}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {savingCfg ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {savingCfg ? "Saving…" : "Save & Apply"}
            </button>
            <button onClick={() => setShowSettings(false)} className="text-sm px-4 py-2 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Changes apply to all 7 days for this court. Existing bookings are not affected.</p>
        </div>
      )}

      {/* 7-day tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {DAY_TABS.map((tab) => {
          const active = date === tab.key;
          return (
            <button key={tab.key} onClick={() => setDate(tab.key)}
              className={`flex flex-col items-center px-4 py-2.5 rounded-xl border text-sm flex-shrink-0 transition-all min-w-[64px] ${
                active
                  ? "bg-primary border-primary text-primary-foreground font-semibold"
                  : tab.isToday
                  ? "border-primary/40 text-primary hover:bg-primary/10"
                  : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}>
              <span className="text-[10px] opacity-70">{tab.mon}</span>
              <span className="font-bold leading-tight">{tab.short}</span>
              <span className="text-xs">{tab.num}</span>
              {tab.isToday && <span className="text-[9px] mt-0.5 opacity-75">Today</span>}
            </button>
          );
        })}
      </div>

      {/* Status summary */}
      {slots.length > 0 && (
        <div className="grid grid-cols-5 gap-2 mb-5">
          {[
            { label: "Available", count: counts.available, cls: "border-green-400/20 bg-green-400/5 text-green-400" },
            { label: "Booked",    count: counts.booked,    cls: "border-blue-400/20 bg-blue-400/5 text-blue-400" },
            { label: "Completed", count: counts.completed, cls: "border-purple-400/20 bg-purple-400/5 text-purple-400" },
            { label: "Blocked",   count: counts.blocked,   cls: "border-orange-400/20 bg-orange-400/5 text-orange-400" },
            { label: "Expired",   count: counts.expired,   cls: "border-border/30 bg-secondary/30 text-muted-foreground" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-3 text-center ${s.cls}`}>
              <div className="text-lg font-bold">{s.count}</div>
              <div className="text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive mb-4 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>}
      {lastSync && (
        <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
          <RefreshCw className="h-2.5 w-2.5" /> {lastSync.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : slots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 p-12 text-center text-muted-foreground">
          No slots configured for this court on this day.
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/40 overflow-hidden">
          <div className="divide-y divide-border/30">
            {slotsWithStatus.map((slot) => {
              const cfg    = statusCfg[slot.ds];
              const isBusy = toggling === slot.start;
              const isPast = slot.ds === "COMPLETED" || slot.ds === "EXPIRED";

              return (
                <div key={slot.start} className={`flex items-center gap-4 px-4 py-3 transition-colors ${isPast ? "opacity-55" : "hover:bg-secondary/20"}`}>
                  <div className="w-36 flex-shrink-0">
                    <span className={`text-sm font-medium tabular-nums flex items-center gap-1.5 ${isPast ? "line-through text-muted-foreground" : ""}`}>
                      <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      {slot.start} – {slot.end}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-xs text-muted-foreground">
                    {(slot.ds === "BOOKED" || slot.ds === "COMPLETED") && slot.playerName && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${slot.ds === "COMPLETED" ? "text-purple-400" : "text-blue-400"}`} />
                        {slot.playerName}{slot.ds === "COMPLETED" && <span className="text-purple-400 ml-1">· done</span>}
                      </span>
                    )}
                    {slot.ds === "BLOCKED" && <span className="flex items-center gap-1 text-orange-400"><Lock className="h-3 w-3" /> Blocked by you</span>}
                    {slot.ds === "EXPIRED" && <span className="flex items-center gap-1"><Ban className="h-3 w-3" /> No booking · time passed</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-medium text-muted-foreground tabular-nums">₹{slot.price}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border w-20 text-center ${cfg.cls}`}>{cfg.label}</span>
                    {cfg.btnAction ? (
                      <button onClick={() => toggleSlot(slot)} disabled={isBusy}
                        className={`flex items-center justify-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 w-20 ${cfg.btnCls}`}>
                        {isBusy ? <Loader2 className="h-3 w-3 animate-spin" />
                          : slot.ds === "BLOCKED" ? <><Unlock className="h-3 w-3" /> Unblock</> : <><Lock className="h-3 w-3" /> Block</>}
                      </button>
                    ) : <div className="w-20" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
