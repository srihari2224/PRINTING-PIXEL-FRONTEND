"use client"

import { useState, useRef } from "react"

const KIOSK_BACKEND = "https://kiosk-backend-t1mi.onrender.com"

interface FormData {
  serviceType: "KSS" | "MKS" | ""
  kioskType: "SX-Series" | "DX-Series" | ""
  ipAddress: string
  cpuUsername: string
  cpuPassword: string
  printer1Capacity: string
  printer2Capacity: string
  kioskId: string
  ownerName: string
  ownerPhone: string
  ownerEmail: string
  address: string
  lat: string
  lng: string
  password: string
  confirmPassword: string
}

const STEPS = [
  { num: "01", label: "Service" },
  { num: "02", label: "Hardware" },
  { num: "03", label: "Owner" },
  { num: "04", label: "Confirm" },
]

const empty = (): FormData => ({
  serviceType: "", kioskType: "",
  ipAddress: "", cpuUsername: "", cpuPassword: "",
  printer1Capacity: "", printer2Capacity: "",
  kioskId: "", ownerName: "", ownerPhone: "", ownerEmail: "",
  address: "", lat: "", lng: "",
  password: "", confirmPassword: "",
})

function Field({
  label, value, onChange, placeholder = "", type = "text", hint, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div
      onClick={() => ref.current?.focus()}
      style={{
        background: focused ? "rgba(255,107,71,0.05)" : "var(--field-bg)",
        border: `1px solid ${focused ? "rgba(255,107,71,0.55)" : "var(--field-border)"}`,
        padding: "13px 16px 11px",
        cursor: "text",
        transition: "border-color 0.2s, background 0.2s",
        marginBottom: 10,
      }}
    >
      <label style={{
        display: "block",
        fontFamily: "'Space Mono', monospace",
        fontSize: "0.5rem", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.22em",
        color: focused ? "#ff6b47" : "var(--label-muted)",
        marginBottom: 7,
        transition: "color 0.2s",
        pointerEvents: "none",
      }}>
        {label}
      </label>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoComplete={autoComplete || (type === "password" ? "new-password" : "off")}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.95rem",
          fontWeight: 600,
          color: "var(--text-primary)",
          caretColor: "#ff6b47",
          letterSpacing: "-0.01em",
          display: "block",
        }}
      />
      {hint && (
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "0.48rem", fontWeight: 700,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--label-muted)", marginTop: 5,
        }}>
          {hint}
        </p>
      )}
    </div>
  )
}

export default function KioskRegistration() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState<FormData>(empty())

  const set = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const validate = (): string => {
    if (step === 1 && !form.serviceType) return "Please select a service type."
    if (step === 2) {
      if (!form.kioskType) return "Please select a kiosk type."
      if (!form.ipAddress.trim()) return "IP Address is required."
      if (!form.cpuUsername.trim()) return "CPU Username is required."
      if (!form.cpuPassword.trim()) return "CPU Password is required."
      if (!form.printer1Capacity) return "Printer 1 paper capacity is required."
      if (form.kioskType === "DX-Series" && !form.printer2Capacity)
        return "Printer 2 paper capacity is required for DX-Series."
    }
    if (step === 3) {
      if (!form.kioskId.trim()) return "Kiosk ID is required."
      if (!/^[a-zA-Z0-9_-]+$/.test(form.kioskId)) return "Kiosk ID: letters, numbers, dash, underscore only."
      if (!form.ownerName.trim()) return "Owner name is required."
      if (!form.ownerPhone.trim()) return "Phone number is required."
      if (!form.ownerEmail.trim() || !form.ownerEmail.includes("@")) return "Enter a valid email address."
      if (!form.address.trim()) return "Address is required."
      if (!form.lat.trim() || !form.lng.trim()) return "Latitude and longitude are required."
      if (isNaN(parseFloat(form.lat)) || isNaN(parseFloat(form.lng))) return "Lat/Lng must be valid numbers."
      if (!form.password || form.password.length < 6) return "Password must be at least 6 characters."
      if (form.password !== form.confirmPassword) return "Passwords do not match."
    }
    return ""
  }

  const goNext = () => { const e = validate(); if (e) { setError(e); return; } setError(""); setStep(s => s + 1) }
  const goBack = () => { setError(""); setStep(s => s - 1) }
  const resetForm = () => { setForm(empty()); setStep(1); setError(""); setSuccess(false) }

  const handleSubmit = async () => {
    const e = validate(); if (e) { setError(e); return; }
    setLoading(true); setError("")
    try {
      const body = {
        username: form.kioskId.trim(), password: form.password,
        kioskType: form.kioskType, serviceType: form.serviceType,
        ipAddress: form.ipAddress.trim(), cpuUsername: form.cpuUsername.trim(),
        cpuPassword: form.cpuPassword, printer1Capacity: form.printer1Capacity,
        printer2Capacity: form.kioskType === "DX-Series" ? form.printer2Capacity : undefined,
        ownerName: form.ownerName.trim(), ownerPhone: form.ownerPhone.trim(),
        ownerEmail: form.ownerEmail.trim(), address: form.address.trim(),
        lat: form.lat.trim(), lng: form.lng.trim(),
      }
      const res = await fetch(`${KIOSK_BACKEND}/api/kiosk/register`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Registration failed")
      setSuccess(true)
    } catch (e: any) { setError(e.message || "Registration failed.") }
    finally { setLoading(false) }
  }

  if (success) return (
    <div style={wrap}>
      <style>{styles}</style>
      <div style={{ ...mainCard, textAlign: "center", padding: "64px 52px" }}>
        <div style={{ width: 58, height: 58, background: "#ff6b47", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="square"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <div style={monoTag}>Registration Submitted</div>
        <h2 style={{ ...bigHead, fontSize: "clamp(1.8rem,4vw,2.8rem)", margin: "10px 0 18px" }}>
          Waiting for<br />Approval
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.8, maxWidth: 380, margin: "0 auto 36px" }}>
          Approval request dispatched to <strong style={{ color: "var(--text-primary)" }}>msrihari2224@gmail.com</strong>.
          Certificate sent to <strong style={{ color: "#ff6b47" }}>{form.ownerEmail}</strong> once approved.
        </p>
        <button onClick={resetForm} className="cta-btn" style={ctaBtn}>Register Another Kiosk</button>
      </div>
    </div>
  )

  return (
    <div style={wrap}>
      <style>{styles}</style>

      {/* Page title */}
      <div style={{ width: "100%", maxWidth: 760, marginBottom: 24 }}>
        <div style={monoTag}>Admin Panel</div>
        <h1 style={{ ...bigHead, fontSize: "clamp(2rem,4vw,3rem)", marginTop: 8 }}>Register Kiosk</h1>
      </div>

      <div style={mainCard}>

        {/* ── Step tabs ── */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
          {STEPS.map((s, i) => {
            const n = i + 1; const active = step === n; const done = step > n
            return (
              <div key={s.num} style={{
                flex: 1, padding: "12px 8px",
                borderRight: i < 3 ? "1px solid var(--border)" : undefined,
                background: active ? "rgba(255,107,71,0.06)" : "transparent",
                position: "relative", transition: "background 0.3s",
              }}>
                {active && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#ff6b47" }} />}
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.2em", color: active ? "#ff6b47" : done ? "var(--step-done-num)" : "var(--step-idle-num)", marginBottom: 3 }}>{s.num}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: active ? "var(--text-primary)" : done ? "var(--step-done-label)" : "var(--step-idle-label)" }}>{s.label}</div>
              </div>
            )
          })}
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "30px 36px" }}>

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <p style={desc}>Choose how this kiosk will be managed.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  {
                    type: "KSS" as const, tag: "KSS — Kiosk Sale Service",
                    title: "Owner-Operated",
                    subtitle: "Buy once, operate independently",
                    desc: "Owner purchases the hardware outright. Full ownership — the owner operates and retains all revenue with no ongoing Innvera involvement.",
                    points: ["One-time hardware purchase", "Owner retains full revenue", "Self-operated independently"],
                  },
                  {
                    type: "MKS" as const, tag: "MKS — Managed Kiosk Service",
                    title: "Innvera-Managed",
                    subtitle: "Full service, no hardware cost",
                    desc: "Innvera provides the kiosk and manages operations end-to-end as a service to companies. No upfront cost, Innvera handles everything.",
                    points: ["No upfront hardware cost", "Innvera manages operations", "Service-as-a-subscription"],
                  },
                ].map(opt => {
                  const sel = form.serviceType === opt.type
                  return (
                    <button key={opt.type} onClick={() => set("serviceType", opt.type)}
                      style={{
                        padding: "22px 20px 20px", textAlign: "left",
                        border: `1px solid ${sel ? "#ff6b47" : "var(--card-border)"}`,
                        background: sel ? "rgba(255,107,71,0.07)" : "var(--card-bg)",
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif", width: "100%",
                        position: "relative", overflow: "hidden",
                      }}>
                      {sel && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#ff6b47" }} />}
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.48rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: sel ? "#ff6b47" : "var(--label-muted)", marginBottom: 9 }}>{opt.tag}</div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", color: sel ? "var(--text-primary)" : "var(--text-secondary)", lineHeight: 1.1, marginBottom: 4 }}>{opt.title}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: sel ? "rgba(255,107,71,0.8)" : "var(--label-muted)", marginBottom: 12 }}>{opt.subtitle}</div>
                      <p style={{ fontSize: "0.74rem", color: sel ? "var(--text-muted)" : "var(--label-muted)", lineHeight: 1.65, marginBottom: 14 }}>{opt.desc}</p>
                      {opt.points.map(b => (
                        <div key={b} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <div style={{ width: 4, height: 4, background: sel ? "#ff6b47" : "var(--bullet-idle)", flexShrink: 0 }} />
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: sel ? "var(--text-muted)" : "var(--label-muted)" }}>{b}</span>
                        </div>
                      ))}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <p style={desc}>Select hardware model — click to expand and configure.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {[
                  { type: "SX-Series" as const, tag: "Single Printer", desc: "Standard kiosk with one printer. Ideal for moderate-volume locations and general use." },
                  { type: "DX-Series" as const, tag: "Dual Printer", desc: "High-capacity kiosk with two independent printers. Built for busy locations with high print demand." },
                ].map(opt => {
                  const sel = form.kioskType === opt.type
                  return (
                    <div key={opt.type} style={{
                      border: `1px solid ${sel ? "#ff6b47" : "var(--card-border)"}`,
                      background: sel ? "rgba(255,107,71,0.04)" : "var(--card-bg)",
                      transition: "border-color 0.25s, background 0.25s",
                      overflow: "hidden",
                      position: "relative",
                    }}>
                      {sel && <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 2, background: "#ff6b47" }} />}
                      <button
                        onClick={() => { set("kioskType", opt.type); if (opt.type === "SX-Series") set("printer2Capacity", "") }}
                        style={{ width: "100%", padding: "16px 20px 16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{
                            width: 20, height: 20, flexShrink: 0,
                            border: `1.5px solid ${sel ? "#ff6b47" : "var(--checkbox-border)"}`,
                            background: sel ? "#ff6b47" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.2s",
                          }}>
                            {sel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="square"><polyline points="20 6 9 17 4 12" /></svg>}
                          </div>
                          <div>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: sel ? "#ff6b47" : "var(--label-muted)", marginBottom: 3 }}>{opt.tag}</div>
                            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", color: sel ? "var(--text-primary)" : "var(--text-secondary)", transition: "color 0.2s" }}>{opt.type}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: sel ? "rgba(255,107,71,0.6)" : "var(--label-muted)" }}>
                          {sel ? "Configured" : "Select"}
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"
                            style={{ transform: sel ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </div>
                      </button>

                      {sel && (
                        <div style={{ padding: "4px 22px 22px", borderTop: "1px solid rgba(255,107,71,0.12)", animation: "slideDown 0.25s cubic-bezier(0.4,0,0.2,1) both" }}>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.65, margin: "14px 0 18px" }}>{opt.desc}</p>
                          <div style={{ display: "grid", gridTemplateColumns: opt.type === "DX-Series" ? "1fr 1fr" : "1fr 1fr", gap: 10 }}>
                            <CapacityInput
                              label="Printer 1 — Paper Capacity"
                              value={form.printer1Capacity}
                              onChange={v => set("printer1Capacity", v)}
                            />
                            {opt.type === "DX-Series" && (
                              <CapacityInput
                                label="Printer 2 — Paper Capacity"
                                value={form.printer2Capacity}
                                onChange={v => set("printer2Capacity", v)}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Access section */}
              <SectionDivider label="Access Configuration" />
              <Field label="IP Address" value={form.ipAddress} onChange={v => set("ipAddress", v)} placeholder="192.168.1.100" hint="SSH IP address of the kiosk device" />
              <Field label="CPU Username" value={form.cpuUsername} onChange={v => set("cpuUsername", v)} placeholder="innvera-printit-01" />
              <Field label="CPU Password" value={form.cpuPassword} onChange={v => set("cpuPassword", v)} type="password" placeholder="Device access password" hint="Used to build the SSH command" />

              {form.cpuUsername && form.ipAddress && (
                <div style={{ marginTop: 12, padding: "11px 16px", background: "var(--ssh-bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14, animation: "slideDown 0.2s ease both" }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.48rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--label-muted)", flexShrink: 0 }}>SSH</span>
                  <div style={{ width: 1, height: 14, background: "var(--border)" }} />
                  <code style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#ff6b47", fontWeight: 700 }}>ssh {form.cpuUsername}@{form.ipAddress}</code>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <p style={desc}>Enter owner contact and location details.</p>
              <SectionDivider label="Kiosk Identity" />
              <Field label="Kiosk ID (Login Username)" value={form.kioskId} onChange={v => set("kioskId", v)} placeholder="e.g. mumbai-01" hint="Letters, numbers, dash, underscore only — becomes the login ID" />

              <SectionDivider label="Owner Information" />
              <Field label="Owner Full Name" value={form.ownerName} onChange={v => set("ownerName", v)} placeholder="e.g. Ravi Kumar" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Phone Number" value={form.ownerPhone} onChange={v => set("ownerPhone", v)} placeholder="+91 9000000000" type="tel" />
                <Field label="Email Address" value={form.ownerEmail} onChange={v => set("ownerEmail", v)} placeholder="owner@gmail.com" type="email" hint="Certificate will be sent here" />
              </div>

              <SectionDivider label="Location" />
              <Field label="Physical Address" value={form.address} onChange={v => set("address", v)} placeholder="Full address including city and state" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Latitude" value={form.lat} onChange={v => set("lat", v)} placeholder="17.3850" type="number" />
                <Field label="Longitude" value={form.lng} onChange={v => set("lng", v)} placeholder="78.4867" type="number" />
              </div>

              <SectionDivider label="Security" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Password" value={form.password} onChange={v => set("password", v)} placeholder="Min. 6 characters" type="password" autoComplete="new-password" />
                <Field label="Confirm Password" value={form.confirmPassword} onChange={v => set("confirmPassword", v)} placeholder="Re-enter password" type="password" autoComplete="new-password" />
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div>
              <p style={desc}>Review all details before submitting.</p>
              <div style={{ marginBottom: 20 }}>
                {[
                  { label: "Service Type", value: form.serviceType },
                  { label: "Kiosk Type", value: form.kioskType },
                  { label: "IP Address", value: form.ipAddress },
                  { label: "CPU Username", value: form.cpuUsername },
                  { label: "CPU Password", value: "•".repeat(form.cpuPassword.length) },
                  { label: "Printer 1 Capacity", value: `${form.printer1Capacity} sheets` },
                  ...(form.kioskType === "DX-Series" ? [{ label: "Printer 2 Capacity", value: `${form.printer2Capacity} sheets` }] : []),
                  { label: "Kiosk ID", value: form.kioskId },
                  { label: "Owner Name", value: form.ownerName },
                  { label: "Phone", value: form.ownerPhone },
                  { label: "Email", value: form.ownerEmail },
                  { label: "Address", value: form.address },
                  { label: "Location", value: `${form.lat}, ${form.lng}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0", borderBottom: "1px solid var(--border)", gap: 20 }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--label-muted)", flexShrink: 0 }}>{label}</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "62%" }}>{value || "—"}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "12px 16px", background: "var(--ssh-bg)", border: "1px solid var(--border)", marginBottom: 14 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.48rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--label-muted)", marginBottom: 7 }}>SSH Command</div>
                <code style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#ff6b47", fontWeight: 700 }}>ssh {form.cpuUsername}@{form.ipAddress}</code>
              </div>
              <div style={{ padding: "14px 16px", borderLeft: "2px solid #ff6b47", background: "rgba(255,107,71,0.06)" }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
                  Submitting sends approval to <strong style={{ color: "var(--text-primary)" }}>msrihari2224@gmail.com</strong>. Certificate goes to <strong style={{ color: "#ff6b47" }}>{form.ownerEmail}</strong> once approved.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 18, padding: "12px 16px", border: "1px solid rgba(255,107,71,0.35)", background: "rgba(255,107,71,0.07)", display: "flex", alignItems: "flex-start", gap: 10, animation: "slideDown 0.2s ease both" }}>
              <div style={{ width: 5, height: 5, background: "#ff6b47", flexShrink: 0, marginTop: 3 }} />
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#ff6b47", margin: 0 }}>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 36px", borderTop: "1px solid var(--border)", background: "var(--footer-bg)" }}>
          {step > 1 ? (
            <button onClick={goBack} className="back-btn" style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--label-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, padding: "8px 0", transition: "color 0.2s" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              Back
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 5, height: 5, background: "#ff6b47", animation: "blink 2s ease-in-out infinite" }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.48rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--label-muted)" }}>Step {step} of 4</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {[1, 2, 3, 4].map(n => (
                <div key={n} style={{ height: 3, width: n === step ? 20 : 4, background: n === step ? "#ff6b47" : n < step ? "var(--progress-done)" : "var(--progress-idle)", transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)" }} />
              ))}
            </div>
            {step < 4 ? (
              <button onClick={goNext} className="cta-btn" style={ctaBtn}>
                Next Step
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className={loading ? "" : "cta-btn"} style={{ ...ctaBtn, background: loading ? "var(--btn-loading-bg)" : "#ff6b47", color: loading ? "var(--btn-loading-text)" : "#000", borderColor: loading ? "var(--border)" : "#ff6b47", cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? (
                  <><span style={{ width: 11, height: 11, border: "2px solid rgba(255,255,255,0.12)", borderTopColor: "rgba(255,255,255,0.45)", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> Submitting</>
                ) : (
                  <>Confirm<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><polyline points="20 6 9 17 4 12" /></svg></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0 14px" }}>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--label-muted)", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  )
}

function CapacityInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div onClick={() => ref.current?.focus()} style={{ background: focused ? "rgba(255,107,71,0.06)" : "var(--field-bg)", border: `1px solid ${focused ? "rgba(255,107,71,0.5)" : "var(--field-border)"}`, padding: "11px 14px 10px", cursor: "text", transition: "all 0.2s" }}>
      <label style={{ display: "block", fontFamily: "'Space Mono', monospace", fontSize: "0.48rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: focused ? "#ff6b47" : "var(--label-muted)", marginBottom: 6, transition: "color 0.2s", pointerEvents: "none" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input ref={ref} type="number" value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="e.g. 250" style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)", caretColor: "#ff6b47" }} />
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--label-muted)", flexShrink: 0 }}>sheets</span>
      </div>
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const wrap: React.CSSProperties = {
  minHeight: "60vh",
  background: "var(--page-bg)",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  padding: "48px 20px",
  fontFamily: "'Inter', sans-serif",
  color: "var(--text-primary)",
}
const mainCard: React.CSSProperties = {
  width: "100%", maxWidth: 760,
  background: "var(--card-surface)",
  border: "1px solid var(--border)",
}
const bigHead: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif", fontWeight: 900,
  textTransform: "uppercase", letterSpacing: "-0.04em",
  lineHeight: 0.92, color: "var(--text-primary)", margin: 0,
}
const monoTag: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace", fontSize: "0.52rem",
  fontWeight: 700, letterSpacing: "0.3em",
  textTransform: "uppercase", color: "#ff6b47",
}
const desc: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace", fontSize: "0.56rem",
  fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
  color: "var(--label-muted)", marginBottom: 22,
}
const ctaBtn: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif", fontWeight: 800,
  fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase",
  background: "#ff6b47", color: "#000",
  border: "1px solid #ff6b47",
  padding: "12px 22px", cursor: "pointer",
  display: "flex", alignItems: "center", gap: 8,
  transition: "all 0.2s",
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Space+Mono:wght@400;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  ::selection { background: #ff6b47; color: #000; }

  /* ── Dark theme (default) ── */
  :root,
  [data-theme="dark"] {
    --page-bg: #000000;
    --card-surface: #050505;
    --footer-bg: #030303;
    --border: rgba(255,255,255,0.08);
    --field-bg: rgba(255,255,255,0.025);
    --field-border: rgba(255,255,255,0.1);
    --card-bg: rgba(255,255,255,0.02);
    --card-border: rgba(255,255,255,0.08);
    --ssh-bg: rgba(255,255,255,0.02);
    --checkbox-border: rgba(255,255,255,0.2);
    --text-primary: #ffffff;
    --text-secondary: rgba(255,255,255,0.5);
    --text-muted: rgba(255,255,255,0.45);
    --label-muted: rgba(255,255,255,0.25);
    --bullet-idle: rgba(255,255,255,0.15);
    --step-done-num: #3a3a3a;
    --step-done-label: #444;
    --step-idle-num: #1e1e1e;
    --step-idle-label: #1e1e1e;
    --progress-done: rgba(255,255,255,0.22);
    --progress-idle: rgba(255,255,255,0.07);
    --btn-loading-bg: #111;
    --btn-loading-text: rgba(255,255,255,0.3);
  }

  /* ── Light theme ── */
  [data-theme="light"] {
    --page-bg: #f5f5f5;
    --card-surface: #ffffff;
    --footer-bg: #fafafa;
    --border: rgba(0,0,0,0.1);
    --field-bg: rgba(0,0,0,0.03);
    --field-border: rgba(0,0,0,0.12);
    --card-bg: rgba(0,0,0,0.02);
    --card-border: rgba(0,0,0,0.1);
    --ssh-bg: rgba(0,0,0,0.03);
    --checkbox-border: rgba(0,0,0,0.25);
    --text-primary: #0a0a0a;
    --text-secondary: rgba(0,0,0,0.55);
    --text-muted: rgba(0,0,0,0.45);
    --label-muted: rgba(0,0,0,0.35);
    --bullet-idle: rgba(0,0,0,0.18);
    --step-done-num: #c0c0c0;
    --step-done-label: #b0b0b0;
    --step-idle-num: #d4d4d4;
    --step-idle-label: #d4d4d4;
    --progress-done: rgba(0,0,0,0.25);
    --progress-idle: rgba(0,0,0,0.1);
    --btn-loading-bg: #e8e8e8;
    --btn-loading-text: rgba(0,0,0,0.3);
  }

  /* Input placeholder colors per theme */
  [data-theme="dark"] input::placeholder { color: rgba(255,255,255,0.16) !important; font-family: 'Inter', sans-serif; font-weight: 400; }
  [data-theme="light"] input::placeholder { color: rgba(0,0,0,0.2) !important; font-family: 'Inter', sans-serif; font-weight: 400; }
  input::placeholder { color: rgba(255,255,255,0.16) !important; font-family: 'Inter', sans-serif; font-weight: 400; }

  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
  @keyframes slideDown {
    from { opacity:0; transform:translateY(-8px); }
    to   { opacity:1; transform:translateY(0); }
  }

  /* CTA button: only color change, no transform/movement */
  .cta-btn:hover { background: #e05c3a !important; border-color: #e05c3a !important; }
  .cta-btn:active { opacity: 0.85; }

  /* Back button: only color change */
  .back-btn:hover { color: var(--text-secondary) !important; }
`