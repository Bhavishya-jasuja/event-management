"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ChevronRight, ChevronLeft, Check, Upload, X, Plus, Trash2,
  Loader2, Building2, MapPin, Image as ImageIcon, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const SPORTS: { label: string; value: string }[] = [
  { label: "Cricket",    value: "CRICKET"    },
  { label: "Football",   value: "FOOTBALL"   },
  { label: "Badminton",  value: "BADMINTON"  },
  { label: "Tennis",     value: "TENNIS"     },
  { label: "Basketball", value: "BASKETBALL" },
  { label: "Volleyball", value: "VOLLEYBALL" },
  { label: "Turf",       value: "TURF"       },
];

const AMENITIES = [
  "Parking", "Changing Rooms", "Showers", "Floodlights",
  "Drinking Water", "First Aid", "Cafeteria", "WiFi",
  "Equipment Rental", "Scoreboard", "Spectator Seating", "CCTV",
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Delhi","Jammu and Kashmir","Ladakh","Puducherry","Chandigarh",
];

const SLOT_DURATIONS = [
  { value: 30,  label: "30 min" },
  { value: 60,  label: "1 hr" },
  { value: 90,  label: "1.5 hr" },
  { value: 120, label: "2 hr" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return { value: `${h}:00`, label: i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM` };
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface Court {
  name: string;
  sportType: string;
  pricePerSlot: string;
  slotDurationMinutes: number;
  openTime: string;
  closeTime: string;
}

interface FormData {
  name: string;
  description: string;
  sportTypes: string[];
  amenities: string[];
  address: string;
  city: string;
  state: string;
  pincode: string;
  photos: string[];
  courts: Court[];
}

const defaultCourt = (): Court => ({
  name: "",
  sportType: "",
  pricePerSlot: "",
  slotDurationMinutes: 30,
  openTime: "05:00",
  closeTime: "23:00",
});

// ─── Step indicator ───────────────────────────────────────────────────────────

const steps = [
  { label: "Basics",   icon: Building2 },
  { label: "Location", icon: MapPin },
  { label: "Photos",   icon: ImageIcon },
  { label: "Courts",   icon: Layers },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function VenueCreateForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    name: "", description: "", sportTypes: [], amenities: [],
    address: "", city: "", state: "", pincode: "",
    photos: [], courts: [defaultCourt()],
  });

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSport(value: string) {
    set("sportTypes", form.sportTypes.includes(value)
      ? form.sportTypes.filter((s) => s !== value)
      : [...form.sportTypes, value]
    );
  }

  function toggleAmenity(a: string) {
    set("amenities", form.amenities.includes(a)
      ? form.amenities.filter((x) => x !== a)
      : [...form.amenities, a]
    );
  }

  // Photo upload
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setError("");
    const uploaded: string[] = [...form.photos];
    for (let i = 0; i < files.length; i++) {
      if (uploaded.length >= 8) break;
      setUploadingIdx(uploaded.length);
      try {
        const fd = new FormData();
        fd.append("file", files[i]);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error ?? "Upload failed. Please try again.");
          break;
        }
        if (data.url) uploaded.push(data.url);
      } catch {
        setError("Network error during upload. Please try again.");
        break;
      }
    }
    set("photos", uploaded);
    setUploadingIdx(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(idx: number) {
    set("photos", form.photos.filter((_, i) => i !== idx));
  }

  // Courts
  function addCourt() {
    set("courts", [...form.courts, defaultCourt()]);
  }

  function removeCourt(idx: number) {
    set("courts", form.courts.filter((_, i) => i !== idx));
  }

  function updateCourt<K extends keyof Court>(idx: number, key: K, value: Court[K]) {
    set("courts", form.courts.map((c, i) => i === idx ? { ...c, [key]: value } : c));
  }

  // Validation per step
  function validateStep(): string | null {
    if (step === 0) {
      if (!form.name.trim() || form.name.length < 3) return "Venue name must be at least 3 characters.";
      if (!form.description.trim() || form.description.length < 20) return "Description must be at least 20 characters.";
      if (form.sportTypes.length === 0) return "Select at least one sport.";
    }
    if (step === 1) {
      if (!form.address.trim()) return "Address is required.";
      if (!form.city.trim()) return "City is required.";
      if (!form.state) return "Select your state.";
      if (!/^\d{6}$/.test(form.pincode)) return "Enter a valid 6-digit pincode.";
    }
    if (step === 2) {
      if (form.photos.length === 0) return "Upload at least one photo.";
    }
    if (step === 3) {
      for (let i = 0; i < form.courts.length; i++) {
        const c = form.courts[i];
        if (!c.name.trim()) return `Court ${i + 1}: name is required.`;
        if (!c.sportType) return `Court ${i + 1}: select a sport.`;
        if (!c.pricePerSlot || isNaN(Number(c.pricePerSlot)) || Number(c.pricePerSlot) <= 0)
          return `Court ${i + 1}: enter a valid price.`;
      }
    }
    return null;
  }

  function nextStep() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/owner/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          courts: form.courts.map((c) => ({
            ...c,
            pricePerSlot: Number(c.pricePerSlot),
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Something went wrong.");
        setSubmitting(false);
        return;
      }

      router.push("/owner/dashboard");
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Step progress */}
      <div className="flex items-center gap-0 mb-10">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              i === step ? "text-primary" : i < step ? "text-green-400" : "text-muted-foreground"
            )}>
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 text-xs font-bold transition-all",
                i === step ? "border-primary bg-primary/15 text-primary" :
                i < step  ? "border-green-400 bg-green-400/15 text-green-400" :
                             "border-border text-muted-foreground"
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className={cn("flex-1 h-px mx-2", i < step ? "bg-green-400/40" : "bg-border/50")} />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive mb-6">
          {error}
        </div>
      )}

      {/* ── Step 0: Basics ─────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-6">
          <Field label="Venue name" required>
            <input
              className={inputCls}
              placeholder="e.g. Champions Cricket Ground"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>

          <Field label="Description" required hint={`${form.description.length}/500 chars`}>
            <textarea
              className={cn(inputCls, "resize-none")}
              rows={4}
              maxLength={500}
              placeholder="Tell players what makes your venue special — surface type, facilities, experience..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>

          <Field label="Sports available" required>
            <div className="flex flex-wrap gap-2 mt-1">
              {SPORTS.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleSport(value)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all",
                    form.sportTypes.includes(value)
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Amenities">
            <div className="grid grid-cols-3 gap-2 mt-1">
              {AMENITIES.map((a) => (
                <label key={a} className="flex items-center gap-2 cursor-pointer group">
                  <div className={cn(
                    "h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-all",
                    form.amenities.includes(a) ? "bg-primary border-primary" : "border-border/60 group-hover:border-primary/40"
                  )} onClick={() => toggleAmenity(a)}>
                    {form.amenities.includes(a) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{a}</span>
                </label>
              ))}
            </div>
          </Field>
        </div>
      )}

      {/* ── Step 1: Location ───────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          <Field label="Street address" required>
            <input
              className={inputCls}
              placeholder="e.g. 42, MG Road, Koramangala"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="City" required>
              <input
                className={inputCls}
                placeholder="e.g. Bengaluru"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </Field>
            <Field label="Pincode" required>
              <input
                className={inputCls}
                placeholder="560001"
                maxLength={6}
                value={form.pincode}
                onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))}
              />
            </Field>
          </div>

          <Field label="State" required>
            <select
              className={cn(inputCls, "bg-secondary/50")}
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      )}

      {/* ── Step 2: Photos ─────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Venue photos <span className="text-destructive">*</span></label>
              <span className="text-xs text-muted-foreground">{form.photos.length}/8 uploaded</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Upload clear photos of courts, facilities, and surroundings. Better photos = more bookings.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {form.photos.map((url, i) => (
                <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-border/50 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="h-8 w-8 rounded-full bg-destructive flex items-center justify-center"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                  {i === 0 && (
                    <div className="absolute top-2 left-2 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-semibold">
                      Cover
                    </div>
                  )}
                </div>
              ))}

              {uploadingIdx !== null && (
                <div className="aspect-video rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {form.photos.length < 8 && uploadingIdx === null && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 bg-secondary/20 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-all text-muted-foreground hover:text-primary"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-xs font-medium">Upload photo</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>
      )}

      {/* ── Step 3: Courts ─────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Add each court or playing surface. You can set different prices and timings per court.
          </p>

          {form.courts.map((court, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Court {i + 1}</h3>
                {form.courts.length > 1 && (
                  <button type="button" onClick={() => removeCourt(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Court name" required>
                  <input
                    className={inputCls}
                    placeholder="e.g. Main Court, Pitch A"
                    value={court.name}
                    onChange={(e) => updateCourt(i, "name", e.target.value)}
                  />
                </Field>
                <Field label="Sport" required>
                  <select
                    className={cn(inputCls, "bg-secondary/50")}
                    value={court.sportType}
                    onChange={(e) => updateCourt(i, "sportType", e.target.value)}
                  >
                    <option value="">Select sport</option>
                    {SPORTS.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Price per slot (₹)" required>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <input
                      className={cn(inputCls, "pl-7")}
                      placeholder="500"
                      type="number"
                      min={0}
                      value={court.pricePerSlot}
                      onChange={(e) => updateCourt(i, "pricePerSlot", e.target.value)}
                    />
                  </div>
                </Field>
                <Field label="Slot duration">
                  <div className="flex gap-2">
                    {SLOT_DURATIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => updateCourt(i, "slotDurationMinutes", d.value)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                          court.slotDurationMinutes === d.value
                            ? "bg-primary/20 border-primary text-primary"
                            : "border-border/60 text-muted-foreground hover:border-primary/40"
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Opening time">
                  <select
                    className={cn(inputCls, "bg-secondary/50")}
                    value={court.openTime}
                    onChange={(e) => updateCourt(i, "openTime", e.target.value)}
                  >
                    {HOURS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </select>
                </Field>
                <Field label="Closing time">
                  <select
                    className={cn(inputCls, "bg-secondary/50")}
                    value={court.closeTime}
                    onChange={(e) => updateCourt(i, "closeTime", e.target.value)}
                  >
                    {HOURS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          ))}

          {form.courts.length < 6 && (
            <button
              type="button"
              onClick={addCourt}
              className="w-full py-3 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 text-muted-foreground hover:text-primary text-sm font-medium flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="h-4 w-4" />
              Add another court
            </button>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/30">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={() => { setError(""); setStep((s) => s - 1); }} className="gap-2">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        ) : <div />}

        {step < steps.length - 1 ? (
          <Button type="button" onClick={nextStep} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 min-w-[160px]">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : <>Submit for Review <Check className="h-4 w-4" /></>}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-border/60 bg-secondary/50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground transition-colors";

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
