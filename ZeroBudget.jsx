import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  giving: "Giving", savings: "Savings", housing: "Housing",
  transportation: "Transportation", food: "Food", personal: "Personal",
  lifestyle: "Lifestyle", health: "Health & Fitness",
  insurance: "Insurance", debt: "Debt",
};

const CATEGORY_ICONS = {
  giving: "🙏", savings: "💰", housing: "🏠", transportation: "🚗",
  food: "🍽️", personal: "👤", lifestyle: "🎭", health: "💪",
  insurance: "🛡️", debt: "💳",
};

const DEFAULT_SUBCATEGORIES = {
  giving: ["Charitable Donations", "Offerings"],
  savings: ["Emergency Fund", "Retirement", "College Fund", "Investment", "Sinking Funds"],
  housing: ["Mortgage/Rent", "Property Tax", "HOA Fees", "Home Insurance", "Utilities", "Internet/Cable", "Phone", "Maintenance/Repairs", "Furnishings"],
  transportation: ["Car Payment", "Auto Insurance", "Gas/Fuel", "Maintenance/Repairs", "Registration/DMV", "Public Transit", "Parking", "Rideshare"],
  food: ["Groceries", "Restaurants", "Coffee Shops", "Meal Delivery", "Work Lunches"],
  personal: ["Clothing", "Hair/Beauty", "Gym Membership", "Subscriptions", "Gifts", "Pet Care", "Child Care", "Education/Tuition", "Books/Supplies"],
  lifestyle: ["Entertainment", "Hobbies", "Vacation/Travel", "Streaming Services", "Shopping", "Alcohol/Bars"],
  health: ["Health Insurance Premium", "Prescriptions", "Doctor Visits", "Dental", "Vision", "Medical Supplies", "Therapy/Counseling"],
  insurance: ["Life Insurance", "Disability Insurance", "Umbrella Policy", "Renters Insurance"],
  debt: ["Credit Card Payment", "Student Loans", "Personal Loans", "Medical Debt", "Other Debt"],
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const storage = {
  get: (k) => { try { const v = localStorage.getItem(k); return v !== null ? { value: v } : null; } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => "$" + (n || 0).toFixed(2);
const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`;
const prevMonthKeyOf = (d) => { const p = new Date(d); p.setMonth(p.getMonth() - 1); return monthKey(p); };

function validatePassword(pwd) {
  const checks = {
    length: pwd.length >= 12,
    hasNumber: /\d/.test(pwd),
    hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    hasUpperCase: /[A-Z]/.test(pwd),
    hasLowerCase: /[a-z]/.test(pwd),
  };
  const score = Object.values(checks).filter(Boolean).length;
  let feedback = "";
  if (!checks.length) feedback = "Password must be at least 12 characters";
  else if (!checks.hasNumber) feedback = "Must include at least one number";
  else if (!checks.hasSymbol) feedback = "Must include at least one symbol (!@#$%^&*...)";
  else if (!checks.hasUpperCase) feedback = "Must include at least one uppercase letter";
  else if (!checks.hasLowerCase) feedback = "Must include at least one lowercase letter";
  else if (score === 5) feedback = "Strong password!";
  return { score, feedback, isValid: score === 5, checks };
}

function initializeMonth(prevData) {
  const base = {
    incomes: prevData ? prevData.incomes.map((i) => ({ ...i })) : [],
    paychecks: prevData ? prevData.paychecks || [] : [],
    categories: {},
  };
  Object.keys(CATEGORY_LABELS).forEach((catKey) => {
    const prev = prevData?.categories[catKey] || [];
    const defs = DEFAULT_SUBCATEGORIES[catKey] || [];
    const map = new Map();
    defs.forEach((name) => {
      const ex = prev.find((i) => i.name === name);
      map.set(name, { id: ex?.id || Date.now() + Math.random(), name, planned: ex?.planned || 0, spent: 0, isDefault: true });
    });
    prev.forEach((item) => { if (!map.has(item.name)) map.set(item.name, { ...item, spent: 0, isDefault: false }); });
    base.categories[catKey] = Array.from(map.values());
  });
  return base;
}

// ─── Styles (CSS-in-JS object) ────────────────────────────────────────────────

const S = {
  // Auth
  authScreen: { minHeight: "100vh", background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e1b4b 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, position: "relative", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" },
  authGrid: { position: "absolute", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='g' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 10' fill='none' stroke='rgba(255,255,255,0.03)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3C/svg%3E\")", opacity: 0.4, pointerEvents: "none" },
  authWrap: { position: "relative", zIndex: 10, width: "100%", maxWidth: 460 },
  authBox: { background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", borderRadius: 24, boxShadow: "0 25px 60px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", padding: 40 },
  authLogo: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 80, height: 80, background: "linear-gradient(135deg,#2563eb,#4f46e5)", borderRadius: 24, fontSize: 40, boxShadow: "0 8px 24px rgba(79,70,229,0.4)", marginBottom: 24 },
  authTitle: { fontSize: 36, fontWeight: 700, background: "linear-gradient(135deg,#2563eb,#4f46e5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 },
  authTabs: { display: "flex", gap: 8, background: "#f3f4f6", padding: 6, borderRadius: 14, marginBottom: 32 },
  authTab: (active) => ({ flex: 1, padding: "12px 16px", borderRadius: 10, border: "none", fontWeight: 600, fontSize: 15, cursor: "pointer", transition: "all .2s", color: active ? "#111827" : "#6b7280", background: active ? "#fff" : "transparent", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.12)" : "none" }),
  authError: { background: "#fef2f2", borderLeft: "4px solid #ef4444", borderRadius: "0 10px 10px 0", padding: "14px 16px", marginBottom: 24, fontSize: 13, fontWeight: 500, color: "#991b1b" },
  formGroup: { marginBottom: 20 },
  formLabel: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 },
  formInput: { width: "100%", padding: "14px 16px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: 15, outline: "none", color: "#111827", fontFamily: "inherit", boxSizing: "border-box" },
  btnAuth: { width: "100%", background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "#fff", padding: 16, borderRadius: 14, border: "none", fontWeight: 700, fontSize: 17, cursor: "pointer", boxShadow: "0 6px 20px rgba(79,70,229,0.4)", transition: "all .2s" },
  forgotBtn: { width: "100%", textAlign: "center", padding: 8, border: "none", background: "transparent", color: "#2563eb", fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 4 },
  termsBox: { marginTop: 24, padding: 16, background: "#f9fafb", borderRadius: 12 },
  termsBtn: { background: "none", border: "none", color: "#2563eb", fontSize: 12, fontWeight: 500, cursor: "pointer", padding: 0 },
  authFooter: { marginTop: 28, textAlign: "center" },
  authFooterLinks: { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 10 },
  authFooterLink: { background: "none", border: "none", color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 500, cursor: "pointer" },
  // App
  appScreen: { background: "linear-gradient(135deg,#f8fafc 0%,#eff6ff 50%,#eef2ff 100%)", minHeight: "100vh", padding: 16, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" },
  maxW: { maxWidth: 1152, margin: "0 auto" },
  headerCard: { background: "#fff", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)", border: "1px solid #f3f4f6", padding: "24px 32px", marginBottom: 32 },
  appLogoWrap: { width: 48, height: 48, background: "linear-gradient(135deg,#2563eb,#4f46e5)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 },
  btnLogout: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", border: "none", background: "transparent", color: "#4b5563", cursor: "pointer", borderRadius: 12, fontWeight: 600, fontSize: 14 },
  monthNav: { display: "flex", alignItems: "center", gap: 12, background: "#f9fafb", borderRadius: 14, padding: 8 },
  monthBtn: { padding: 8, background: "transparent", border: "none", cursor: "pointer", borderRadius: 10, fontSize: 20, color: "#374151" },
  monthLabel: { fontSize: 20, fontWeight: 700, minWidth: 190, textAlign: "center", color: "#111827" },
  btnAction: (grad) => ({ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", border: "none", borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#fff", background: grad, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }),
  banner: (success) => ({ padding: "14px 16px", borderRadius: 10, borderLeft: `4px solid ${success ? "#22c55e" : "#ef4444"}`, marginBottom: 24, fontSize: 13, fontWeight: 500, background: success ? "#f0fdf4" : "#fef2f2", color: success ? "#166534" : "#991b1b" }),
  incomeItem: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right,#f9fafb,#fff)", padding: 16, borderRadius: 12, border: "1px solid #e5e7eb", marginBottom: 10 },
  incomeInput: { width: 144, padding: "8px 16px", border: "1px solid #d1d5db", borderRadius: 8, fontWeight: 600, fontSize: 14, outline: "none" },
  incomeTotalBox: { marginTop: 24, padding: 24, background: "linear-gradient(135deg,#eff6ff,#eef2ff)", borderRadius: 14, border: "2px solid #bfdbfe" },
  incomeTotalAmt: { fontSize: 30, fontWeight: 700, background: "linear-gradient(135deg,#2563eb,#4f46e5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 },
  statCard: (scheme) => {
    const schemes = { blue: ["linear-gradient(135deg,#eff6ff,#dbeafe)","#bfdbfe","#1d4ed8"], green: ["linear-gradient(135deg,#f0fdf4,#d1fae5)","#a7f3d0","#15803d"], orange: ["linear-gradient(135deg,#fff7ed,#fef3c7)","#fed7aa","#c2410c"], emerald: ["linear-gradient(135deg,#ecfdf5,#d1fae5)","#6ee7b7","#047857"], red: ["linear-gradient(135deg,#fef2f2,#fee2e2)","#fca5a5","#b91c1c"] };
    const [bg, border, color] = schemes[scheme];
    return { borderRadius: 14, padding: 20, border: `2px solid ${border}`, background: bg, color };
  },
  addRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  addInput: { flex: 1, minWidth: 200, padding: "12px 16px", border: "2px solid #d1d5db", borderRadius: 12, fontSize: 14, outline: "none", fontFamily: "inherit" },
  btnBlueAdd: { background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 12, fontWeight: 600, cursor: "pointer", fontSize: 14, whiteSpace: "nowrap" },
  btnIconRed: { padding: 8, border: "2px solid transparent", borderRadius: 8, background: "transparent", cursor: "pointer", color: "#dc2626", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" },
  catCard: { background: "#fff", borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid #f3f4f6", overflow: "hidden", marginBottom: 16 },
  catHeader: { width: "100%", padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" },
  itemCard: { border: "2px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 12, background: "linear-gradient(to right,#fff,#f9fafb)" },
  itemGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 },
  valueDisplay: { fontSize: 18, fontWeight: 700, color: "#111827", cursor: "pointer", padding: "4px 8px", borderRadius: 6, display: "inline-block" },
  editInput: { width: "100%", padding: "8px 12px", border: "2px solid #60a5fa", borderRadius: 8, fontSize: 14, fontWeight: 600, outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  itemProgress: { height: 6, background: "#e5e7eb", borderRadius: 9999, overflow: "hidden", marginTop: 12 },
  // Modal
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, zIndex: 50, overflowY: "auto" },
  modalBox: { background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", width: "100%", padding: 32, margin: "auto" },
  modalClose: { padding: "6px 10px", border: "none", background: "#f3f4f6", borderRadius: 8, fontSize: 18, cursor: "pointer", color: "#374151", lineHeight: 1 },
  uploadTypeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  uploadTypeBtn: (sel) => ({ padding: 16, borderRadius: 14, border: `2px solid ${sel ? "#9333ea" : "#e5e7eb"}`, background: sel ? "#faf5ff" : "transparent", cursor: "pointer", textAlign: "center" }),
  uploadTrigger: (disabled) => ({ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 24px", background: "linear-gradient(135deg,#9333ea,#db2777)", color: "#fff", borderRadius: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }),
  paycheckItem: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f9fafb", padding: 16, borderRadius: 12, marginBottom: 8 },
  cashFlowBox: { background: "linear-gradient(135deg,#eff6ff,#eef2ff)", borderRadius: 14, padding: 16, border: "2px solid #bfdbfe" },
  cashFlowItem: { background: "#fff", borderRadius: 10, padding: 16, marginBottom: 10 },
  btnCancel: { width: "100%", padding: 12, background: "#f3f4f6", border: "none", borderRadius: 12, fontWeight: 600, color: "#374151", cursor: "pointer", marginTop: 16, fontSize: 15 },
  flowSummaryGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 },
  insightsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  // Info modal
  infoOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 200 },
  infoBox: { background: "#fff", borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.25)", width: "100%", maxWidth: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  infoHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px 20px", borderBottom: "1px solid #f3f4f6" },
  infoBody: { padding: "24px 28px", overflowY: "auto", flex: 1 },
  infoFooter: { padding: "16px 28px", borderTop: "1px solid #f3f4f6" },
  infoFooterBtn: { width: "100%", padding: 12, background: "linear-gradient(135deg,#2563eb,#4f46e5)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: "pointer" },
  contactField: { display: "flex", flexDirection: "column", marginBottom: 16 },
  contactInput: { padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit" },
  contactTextarea: { padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical", minHeight: 100 },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ pct, style }) {
  const color = pct > 100 ? "#ef4444" : pct > 80 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ height: style?.height || 8, width: style?.width || "100%", background: "#e5e7eb", borderRadius: 9999, overflow: "hidden", ...style }}>
      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 9999, transition: "width .3s" }} />
    </div>
  );
}

function InfoModal({ type, onClose }) {
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const titles = { tos: "📋 Terms of Service", privacy: "🔒 Privacy Policy", contact: "✉️ Contact Us" };

  const handleSend = () => {
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      alert("Please fill in your name, email, and message."); return;
    }
    setSent(true);
  };

  return (
    <div style={S.infoOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.infoBox}>
        <div style={S.infoHeader}>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{titles[type]}</span>
          <button style={S.modalClose} onClick={onClose}>✕</button>
        </div>
        <div style={S.infoBody}>
          {type === "tos" && (
            <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>1. Acceptance of Terms</h3>
              <p style={{ marginBottom: 12 }}>By accessing or using Zero Budget ("the App"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the App.</p>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "20px 0 8px" }}>2. Description of Service</h3>
              <p style={{ marginBottom: 12 }}>Zero Budget is a personal budgeting tool that helps you track income, expenses, and financial goals. All data is stored locally on your device.</p>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "20px 0 8px" }}>3. User Responsibilities</h3>
              <ul style={{ marginLeft: 20, marginBottom: 12 }}>
                <li>You are responsible for maintaining the confidentiality of your credentials.</li>
                <li>You agree to provide accurate information when using the App.</li>
                <li>You will not use the App for any unlawful purpose.</li>
              </ul>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "20px 0 8px" }}>4. Data & Privacy</h3>
              <p style={{ marginBottom: 12 }}>All budget data is stored locally in your browser's localStorage. The AI statement-parsing feature sends document content to Anthropic's API; please review their privacy policy for details.</p>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "20px 0 8px" }}>5. Disclaimer of Warranties</h3>
              <p style={{ marginBottom: 12 }}>The App is provided "as is" without warranties of any kind. Zero Budget is not a licensed financial advisor.</p>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "20px 0 8px" }}>6. Limitation of Liability</h3>
              <p style={{ marginBottom: 12 }}>To the fullest extent permitted by law, Zero Budget shall not be liable for any indirect, incidental, or consequential damages.</p>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "20px 0 8px" }}>7. Changes to Terms</h3>
              <p>We reserve the right to modify these terms at any time. Continued use constitutes acceptance.</p>
            </div>
          )}
          {type === "privacy" && (
            <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Our Commitment to Privacy</h3>
              <p style={{ marginBottom: 12 }}>Zero Budget is built with privacy as a core principle. Your financial data belongs to you and only you.</p>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "20px 0 8px" }}>Data We Collect</h3>
              <ul style={{ marginLeft: 20, marginBottom: 12 }}>
                <li><strong>Account credentials:</strong> Stored only in your browser's localStorage — never on our servers.</li>
                <li><strong>Budget data:</strong> All entries are stored entirely on your device.</li>
                <li><strong>Uploaded statements:</strong> Sent to Anthropic's API for processing only; we retain no copies.</li>
              </ul>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "20px 0 8px" }}>Data We Do NOT Collect</h3>
              <ul style={{ marginLeft: 20, marginBottom: 12 }}>
                <li>We do not use analytics or tracking cookies.</li>
                <li>We do not sell or share your data with third parties.</li>
                <li>We do not have access to your financial data stored in your browser.</li>
              </ul>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "20px 0 8px" }}>Third-Party Services</h3>
              <p>The AI-powered statement parsing uses Anthropic's Claude API. Please refer to <a href="https://www.anthropic.com/privacy" target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>Anthropic's Privacy Policy</a> for details.</p>
            </div>
          )}
          {type === "contact" && !sent && (
            <div>
              <p style={{ color: "#4b5563", fontSize: 14, marginBottom: 20 }}>Have a question, suggestion, or found a bug? We'd love to hear from you.</p>
              {[["name","text","Your Name","Jane Smith"],["email","email","Email Address","jane@example.com"],["subject","text","Subject","e.g. Feature request, Bug report…"]].map(([field,type2,label,ph]) => (
                <div key={field} style={S.contactField}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{label}</label>
                  <input type={type2} style={S.contactInput} placeholder={ph} value={contactForm[field]} onChange={(e) => setContactForm({ ...contactForm, [field]: e.target.value })} />
                </div>
              ))}
              <div style={S.contactField}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Message</label>
                <textarea style={S.contactTextarea} placeholder="Tell us what's on your mind…" value={contactForm.message} onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })} />
              </div>
            </div>
          )}
          {type === "contact" && sent && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Message Received!</p>
              <p style={{ fontSize: 14, color: "#4b5563" }}>Thanks, <strong>{contactForm.name}</strong>! We'll get back to you at <strong>{contactForm.email}</strong> soon.</p>
            </div>
          )}
        </div>
        <div style={S.infoFooter}>
          <button style={S.infoFooterBtn} onClick={type === "contact" && !sent ? handleSend : onClose}>
            {type === "contact" && !sent ? "Send Message" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pwdStrength, setPwdStrength] = useState({ score: 0, feedback: "", isValid: false, checks: {} });
  const [infoModal, setInfoModal] = useState(null);

  useEffect(() => {
    if (mode === "signup" && password) setPwdStrength(validatePassword(password));
    else setPwdStrength({ score: 0, feedback: "", isValid: false, checks: {} });
  }, [password, mode]);

  const switchMode = (m) => { setMode(m); setError(""); setPassword(""); setConfirm(""); };

  const handleAuth = () => {
    setError("");
    if (!email || !password) { setError("Please enter email and password"); return; }
    if (mode === "signup") {
      const v = validatePassword(password);
      if (!v.isValid) { setError(v.feedback); return; }
      if (password !== confirm) { setError("Passwords do not match"); return; }
      if (storage.get(`user_${email}`)) { setError("User already exists. Please login."); return; }
      const u = { email, password };
      storage.set(`user_${email}`, JSON.stringify(u));
      storage.set("current_user", JSON.stringify(u));
      onLogin(u, {});
    } else {
      const res = storage.get(`user_${email}`);
      if (!res) { setError("User not found. Please sign up."); return; }
      const u = JSON.parse(res.value);
      if (u.password !== password) { setError("Incorrect password"); return; }
      storage.set("current_user", JSON.stringify(u));
      const b = storage.get(`budget_${email}`);
      onLogin(u, b ? JSON.parse(b.value) : {});
    }
  };

  const barColor = pwdStrength.score <= 2 ? "#ef4444" : pwdStrength.score <= 4 ? "#f59e0b" : "#22c55e";

  return (
    <div style={S.authScreen}>
      <div style={S.authGrid} />
      <div style={S.authWrap}>
        <div style={S.authBox}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={S.authLogo}>💰</div>
            <div style={S.authTitle}>Zero Budget</div>
            <p style={{ color: "#4b5563", fontSize: 18, fontWeight: 500 }}>Financial Planner</p>
            <p style={{ color: "#6b7280", fontSize: 14, marginTop: 6 }}>Take control of your financial future</p>
          </div>

          <div style={S.authTabs}>
            <button style={S.authTab(mode === "login")} onClick={() => switchMode("login")}>Login</button>
            <button style={S.authTab(mode === "signup")} onClick={() => switchMode("signup")}>Sign Up</button>
          </div>

          {error && <div style={S.authError}>{error}</div>}

          <div style={S.formGroup}>
            <label style={S.formLabel}>Email Address</label>
            <input type="email" style={S.formInput} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div style={S.formGroup}>
            <label style={S.formLabel}>Password</label>
            <input type="password" style={S.formInput} placeholder="••••••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()} />
            {mode === "signup" && password && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {[1,2,3,4,5].map((l) => (
                    <div key={l} style={{ flex: 1, height: 6, borderRadius: 9999, background: l <= pwdStrength.score ? barColor : "#e5e7eb", transition: "background .3s" }} />
                  ))}
                </div>
                <p style={{ fontSize: 12, fontWeight: 500, color: pwdStrength.isValid ? "#16a34a" : "#ea580c" }}>{pwdStrength.feedback}</p>
                {!pwdStrength.isValid && (
                  <div style={{ marginTop: 12, padding: 12, background: "#eff6ff", borderRadius: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 8 }}>Password must contain:</p>
                    {[["length","At least 12 characters",pwdStrength.checks.length],["hasNumber","At least one number",pwdStrength.checks.hasNumber],["hasSymbol","At least one symbol (!@#$%...)",pwdStrength.checks.hasSymbol],["hasUpperCase","At least one uppercase letter",pwdStrength.checks.hasUpperCase],["hasLowerCase","At least one lowercase letter",pwdStrength.checks.hasLowerCase]].map(([k,label,ok]) => (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: ok ? "#16a34a" : "#4b5563", marginBottom: 4 }}>
                        <span>{ok ? "✓" : "○"}</span>{label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {mode === "signup" && (
            <div style={S.formGroup}>
              <label style={S.formLabel}>Confirm Password</label>
              <input type="password" style={S.formInput} placeholder="••••••••••••" value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()} />
              {confirm && password !== confirm && <p style={{ fontSize: 12, color: "#dc2626", fontWeight: 500, marginTop: 6 }}>Passwords do not match</p>}
            </div>
          )}

          <button style={S.btnAuth} onClick={handleAuth}>{mode === "login" ? "Sign In" : "Create Account"}</button>

          {mode === "login" && <button style={S.forgotBtn}>Forgot password?</button>}

          {mode === "signup" && (
            <div style={S.termsBox}>
              <p style={{ fontSize: 12, color: "#6b7280", textAlign: "center", lineHeight: 1.6 }}>
                By creating an account, you agree to our{" "}
                <button style={S.termsBtn} onClick={() => setInfoModal("tos")}>Terms of Service</button>{" "}and{" "}
                <button style={S.termsBtn} onClick={() => setInfoModal("privacy")}>Privacy Policy</button>
              </p>
            </div>
          )}
        </div>

        <div style={S.authFooter}>
          <div style={S.authFooterLinks}>
            <button style={S.authFooterLink} onClick={() => setInfoModal("tos")}>Terms of Service</button>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>•</span>
            <button style={S.authFooterLink} onClick={() => setInfoModal("privacy")}>Privacy Policy</button>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>•</span>
            <button style={S.authFooterLink} onClick={() => setInfoModal("contact")}>Contact</button>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>© 2024 Zero Budget Financial Planner. All rights reserved.</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Secure budgeting platform for managing your finances</p>
        </div>
      </div>

      {infoModal && <InfoModal type={infoModal} onClose={() => setInfoModal(null)} />}
    </div>
  );
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({ catKey, label, items, editingItem, onToggleExpand, isExpanded, onStartEdit, onSaveEdit, onDeleteItem, onAddItem }) {
  const [newItemName, setNewItemName] = useState("");
  const editRef = useRef(null);
  const [editVals, setEditVals] = useState({ planned: 0, spent: 0 });

  useEffect(() => {
    if (editingItem?.category === catKey) {
      const item = items.find((i) => i.id === editingItem.id);
      if (item) setEditVals({ planned: item.planned, spent: item.spent });
    }
  }, [editingItem]);

  useEffect(() => {
    if (editRef.current) { editRef.current.focus(); editRef.current.select(); }
  }, [editingItem]);

  const catTotal = items.reduce((s, i) => s + i.planned, 0);
  const catSpent = items.reduce((s, i) => s + i.spent, 0);
  const pct = catTotal > 0 ? (catSpent / catTotal) * 100 : 0;
  const remColor = catTotal - catSpent >= 0 ? "#16a34a" : "#dc2626";

  const handleAdd = () => {
    if (!newItemName.trim()) return;
    onAddItem(catKey, newItemName.trim());
    setNewItemName("");
  };

  const saveEdit = () => onSaveEdit(catKey, editingItem?.id, editVals);
  const handleKey = (e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") onSaveEdit(null, null, null); };

  return (
    <div style={S.catCard}>
      <button style={S.catHeader} onClick={() => onToggleExpand(catKey)}>
        <span style={{ fontSize: 32, flexShrink: 0 }}>{CATEGORY_ICONS[catKey]}</span>
        <div style={{ flex: 1, marginLeft: 16, textAlign: "left" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{label}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 14 }}>
            <span style={{ color: "#4b5563" }}><span style={{ fontWeight: 700, color: "#111827" }}>{fmt(catSpent)}</span> of {fmt(catTotal)}</span>
            <ProgressBar pct={pct} style={{ height: 8, width: 128 }} />
          </div>
        </div>
        <div style={{ textAlign: "right", marginRight: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#4b5563", marginBottom: 4 }}>Remaining</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: remColor }}>{fmt(catTotal - catSpent)}</div>
        </div>
        <span style={{ fontSize: 22, color: "#6b7280", transition: "transform .2s", transform: isExpanded ? "rotate(180deg)" : "none" }}>⌄</span>
      </button>

      {isExpanded && (
        <div style={{ padding: "0 24px 24px", borderTop: "1px solid #f3f4f6" }}>
          <div style={{ marginTop: 16 }}>
            {items.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#6b7280", fontSize: 14 }}>No items yet — add one below</div>}
            {items.map((item) => {
              const isEditP = editingItem?.category === catKey && editingItem?.id === item.id && editingItem?.field === "planned";
              const isEditS = editingItem?.category === catKey && editingItem?.id === item.id && editingItem?.field === "spent";
              const iPct = item.planned > 0 ? (item.spent / item.planned) * 100 : 0;
              return (
                <div key={item.id} style={S.itemCard}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "#111827" }}>{item.name}</div>
                      <div style={S.itemGrid}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>Planned</label>
                          {isEditP
                            ? <input ref={editRef} type="number" style={S.editInput} value={editVals.planned} onChange={(e) => setEditVals({ ...editVals, planned: Number(e.target.value) })} onKeyDown={handleKey} onBlur={saveEdit} />
                            : <div style={S.valueDisplay} onDoubleClick={() => { onStartEdit(catKey, item, "planned"); setEditVals({ planned: item.planned, spent: item.spent }); }} title="Double-click to edit">{fmt(item.planned)}</div>}
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>Spent</label>
                          {isEditS
                            ? <input ref={editRef} type="number" style={S.editInput} value={editVals.spent} onChange={(e) => setEditVals({ ...editVals, spent: Number(e.target.value) })} onKeyDown={handleKey} onBlur={saveEdit} />
                            : <div style={S.valueDisplay} onDoubleClick={() => { onStartEdit(catKey, item, "spent"); setEditVals({ planned: item.planned, spent: item.spent }); }} title="Double-click to edit">{fmt(item.spent)}</div>}
                        </div>
                      </div>
                      {!isEditP && !isEditS && item.planned > 0 && <ProgressBar pct={iPct} style={{ height: 6, marginTop: 12 }} />}
                    </div>
                    <div style={{ marginLeft: 24, flexShrink: 0 }}>
                      <button style={S.btnIconRed} onClick={() => onDeleteItem(catKey, item.id)} title="Delete">🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={S.addRow}>
            <input type="text" style={S.addInput} placeholder={`Add item to ${label}`} value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
            <button style={S.btnBlueAdd} onClick={handleAdd}>+ Add</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSuccess }) {
  const [uploadType, setUploadType] = useState("bill");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const fileType = file.type;
      const base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
      const contentBlock = fileType === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
        : { type: "image", source: { type: "base64", media_type: fileType, data: base64 } };
      const prompt = uploadType === "bill"
        ? 'Analyze this credit card bill and extract all transactions. Return ONLY a JSON array with no markdown: [{"description":"Store Name","amount":45.99,"category":"food"}]. Categories: giving, savings, housing, transportation, food, personal, lifestyle, health, insurance, debt'
        : 'Analyze this bank or credit card statement and extract ALL transactions. Return ONLY a JSON array: [{"description":"Store Name","amount":45.99,"date":"2024-01-15","category":"food"}]. Categories: giving, savings, housing, transportation, food, personal, lifestyle, health, insurance, debt';
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 8000, messages: [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }] }),
      });
      const data = await resp.json();
      const text = data.content.map((i) => i.text || "").join("\n");
      const transactions = JSON.parse(text.replace(/```json|```/g, "").trim());
      if (!Array.isArray(transactions)) throw new Error("Invalid format");
      onSuccess(transactions);
      onClose();
    } catch {
      alert("Error processing file. Please ensure it is a valid statement.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div style={S.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...S.modalBox, maxWidth: 480, marginTop: 40 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 24 }}>Upload Statement</h2>
        <div style={{ marginBottom: 24 }}>
          <label style={{ ...S.formLabel, marginBottom: 12, display: "block" }}>Select Upload Type</label>
          <div style={S.uploadTypeGrid}>
            {[["bill","🧾","Single Bill","Credit card bill"],["statement","📄","Full Statement","Bank/CC statement"]].map(([t,icon,title,sub]) => (
              <button key={t} style={S.uploadTypeBtn(uploadType === t)} onClick={() => setUploadType(t)}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{sub}</div>
              </button>
            ))}
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: "none" }} onChange={handleFile} />
        <div style={S.uploadTrigger(uploading)} onClick={() => !uploading && fileRef.current.click()}>
          {uploading ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Processing…</> : <>↑ Choose File to Upload</>}
        </div>
        <button style={S.btnCancel} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Paycheck Modal ───────────────────────────────────────────────────────────

function PaycheckModal({ paychecks, totalPlanned, onAdd, onDelete, onClose }) {
  const [form, setForm] = useState({ date: "", amount: "", source: "" });

  const handleAdd = () => {
    if (!form.date || !form.amount) return;
    onAdd({ id: Date.now(), date: form.date, amount: Number(form.amount), source: form.source || "Paycheck" });
    setForm({ date: "", amount: "", source: "" });
  };

  const getCashFlow = () => {
    const sorted = [...paychecks].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!sorted.length) return [];
    const flow = []; let running = 0;
    sorted.forEach((pc, i) => {
      running += pc.amount;
      const exp = i === sorted.length - 1 ? totalPlanned - flow.reduce((s, f) => s + f.expenses, 0) : totalPlanned / sorted.length;
      running -= exp;
      flow.push({ id: pc.id, date: pc.date, source: pc.source, income: pc.amount, expenses: exp, balance: running });
    });
    return flow;
  };

  return (
    <div style={S.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...S.modalBox, maxWidth: 720, marginTop: 40 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 24 }}>💰 Paycheck Planning</h2>
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 12 }}>Add Paycheck</h3>
          <div style={S.addRow}>
            <input type="date" style={{ ...S.addInput, minWidth: "auto", flex: "none" }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <input type="number" style={{ ...S.addInput, maxWidth: 144 }} placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <input type="text" style={S.addInput} placeholder="Source (optional)" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            <button style={S.btnBlueAdd} onClick={handleAdd}>+ Add</button>
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 12 }}>Your Paychecks</h3>
          {paychecks.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No paychecks added yet</div>}
          {[...paychecks].sort((a, b) => new Date(a.date) - new Date(b.date)).map((pc) => (
            <div key={pc.id} style={S.paycheckItem}>
              <div>
                <div style={{ fontWeight: 600, color: "#111827" }}>{pc.source}</div>
                <div style={{ fontSize: 13, color: "#4b5563" }}>{new Date(pc.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontWeight: 700, color: "#16a34a" }}>{fmt(pc.amount)}</span>
                <button style={S.btnIconRed} onClick={() => onDelete(pc.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
        {paychecks.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 12 }}>Cash Flow Forecast</h3>
            <div style={S.cashFlowBox}>
              {getCashFlow().map((f) => (
                <div key={f.id} style={S.cashFlowItem}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "#111827" }}>{f.source}</div>
                      <div style={{ fontSize: 12, color: "#4b5563" }}>{new Date(f.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, color: "#4b5563" }}>Balance After</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: f.balance >= 0 ? "#16a34a" : "#dc2626" }}>{fmt(f.balance)}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, marginTop: 8 }}>
                    <div style={{ color: "#16a34a" }}>+ {fmt(f.income)} income</div>
                    <div style={{ color: "#ea580c" }}>− {fmt(f.expenses)} expenses</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <button style={S.btnCancel} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ─── Flow Diagram Modal ───────────────────────────────────────────────────────

function FlowModal({ currentData, totalIncome, totalSpent, monthLabel, onClose }) {
  const balance = totalIncome - totalSpent;
  const breakdown = Object.entries(CATEGORY_LABELS).map(([key, label]) => {
    const items = currentData.categories[key] || [];
    return { category: label, spent: items.reduce((s, i) => s + i.spent, 0), planned: items.reduce((s, i) => s + i.planned, 0) };
  }).filter((c) => c.spent > 0 || c.planned > 0).sort((a, b) => b.spent - a.spent);
  const topIncome = currentData.incomes.length > 0 ? [...currentData.incomes].sort((a, b) => b.amount - a.amount)[0] : null;
  const topExp = breakdown[0] || null;
  const balColor = balance >= 0 ? "#3b82f6" : "#ef4444";

  return (
    <div style={S.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...S.modalBox, maxWidth: 900, marginTop: 40, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>📊 Money Flow – {monthLabel}</h2>
          <button style={S.modalClose} onClick={onClose}>✕</button>
        </div>

        {/* Summary */}
        <div style={{ background: "linear-gradient(135deg,#3b82f6,#4f46e5)", borderRadius: 16, padding: 24, color: "#fff", marginBottom: 24 }}>
          <div style={S.flowSummaryGrid}>
            {[["Total Income", totalIncome], ["Total Spent", totalSpent], ["Remaining", balance]].map(([l, v]) => (
              <div key={l}><div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>{l}</div><div style={{ fontSize: 30, fontWeight: 700 }}>{fmt(v)}</div></div>
            ))}
          </div>
        </div>

        {/* Income bars */}
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Income Sources</h3>
        <div style={{ marginBottom: 32 }}>
          {currentData.incomes.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No income sources</div>}
          {currentData.incomes.map((inc) => {
            const pct = totalIncome > 0 ? (inc.amount / totalIncome) * 100 : 0;
            return (
              <div key={inc.id} style={{ background: "#dcfce7", borderRadius: 12, padding: 16, border: "2px solid #bbf7d0", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: "#111827" }}>{inc.name}</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#16a34a" }}>{fmt(inc.amount)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 12, background: "#e5e7eb", borderRadius: 9999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#22c55e", borderRadius: 9999 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>{pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expense bars */}
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Spending by Category</h3>
        <div style={{ marginBottom: 32 }}>
          {breakdown.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>No expenses yet</div>}
          {breakdown.map((cat) => {
            const pct = totalSpent > 0 ? (cat.spent / totalSpent) * 100 : 0;
            const over = cat.spent > cat.planned;
            return (
              <div key={cat.category} style={{ borderRadius: 12, padding: 16, border: `2px solid ${over ? "#fca5a5" : "#fed7aa"}`, background: over ? "#fef2f2" : "#fff7ed", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#111827" }}>{cat.category}</div>
                    <div style={{ fontSize: 13, color: "#4b5563" }}>
                      Planned: {fmt(cat.planned)}
                      {over && <span style={{ color: "#dc2626", fontWeight: 600, marginLeft: 8 }}>Over by {fmt(cat.spent - cat.planned)}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#ea580c" }}>{fmt(cat.spent)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, height: 12, background: "#e5e7eb", borderRadius: 9999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: over ? "#ef4444" : "#f97316", borderRadius: 9999 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#c2410c" }}>{pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Flow viz */}
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Money Flow Visualization</h3>
        <div style={{ background: "linear-gradient(135deg,#f8fafc,#f1f5f9)", borderRadius: 16, padding: 28, border: "2px solid #e5e7eb", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            {[
              { label: "Income", value: totalIncome, sub: "Money In", color: "#22c55e" },
              null,
              { label: "Expenses", value: totalSpent, sub: "Money Out", color: "#f97316" },
              null,
              { label: "Balance", value: balance, sub: balance >= 0 ? "Surplus" : "Deficit", color: balColor },
            ].map((item, idx) =>
              item === null ? (
                <div key={idx} style={{ flex: 1, minWidth: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", height: 8, borderRadius: 9999, background: idx === 1 ? "linear-gradient(to right,#22c55e,#f97316)" : "linear-gradient(to right,#f97316,#3b82f6)" }} />
                  <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{idx === 1 ? "Flow →" : "→ Result"}</span>
                </div>
              ) : (
                <div key={item.label} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ borderRadius: 16, padding: "20px 28px", background: item.color, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "inline-block", marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(item.value)}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#4b5563" }}>{item.sub}</div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Insights */}
        <div style={S.insightsGrid}>
          <div style={{ background: "linear-gradient(135deg,#f0fdf4,#ecfdf5)", border: "2px solid #bbf7d0", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#15803d", marginBottom: 8 }}>💚 Top Earning Source</div>
            {topIncome ? <><div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{topIncome.name}</div><div style={{ fontSize: 24, fontWeight: 700, color: "#16a34a" }}>{fmt(topIncome.amount)}</div></> : <div style={{ color: "#6b7280" }}>No income sources</div>}
          </div>
          <div style={{ background: "linear-gradient(135deg,#fff7ed,#fef9c3)", border: "2px solid #fed7aa", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#c2410c", marginBottom: 8 }}>🔥 Biggest Expense</div>
            {topExp ? <><div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{topExp.category}</div><div style={{ fontSize: 24, fontWeight: 700, color: "#ea580c" }}>{fmt(topExp.spent)}</div></> : <div style={{ color: "#6b7280" }}>No expenses yet</div>}
          </div>
        </div>

        <button style={S.btnCancel} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function AppScreen({ user, initialData, onLogout }) {
  const [monthlyData, setMonthlyData] = useState(initialData);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null); // {category, id, field}
  const [newIncome, setNewIncome] = useState({ name: "", amount: "" });
  const [banner, setBanner] = useState(null); // {msg, success}
  const [modal, setModal] = useState(null); // 'upload'|'paycheck'|'flow'|'tos'|'privacy'|'contact'

  const mKey = monthKey(currentMonth);
  const prevKey = prevMonthKeyOf(currentMonth);

  const getCurrentData = useCallback(() => {
    if (!monthlyData[mKey]) return { incomes: [], paychecks: [], categories: Object.fromEntries(Object.keys(CATEGORY_LABELS).map((c) => [c, []])) };
    return monthlyData[mKey];
  }, [monthlyData, mKey]);

  const updateMonth = (patch) => setMonthlyData((prev) => ({ ...prev, [mKey]: { ...getCurrentData(), ...patch } }));

  // Auto-save
  useEffect(() => {
    if (Object.keys(monthlyData).length > 0) storage.set(`budget_${user.email}`, JSON.stringify(monthlyData));
  }, [monthlyData]);

  // Auto-populate empty month
  useEffect(() => {
    const cd = getCurrentData();
    const isEmpty = cd.incomes.length === 0 && Object.values(cd.categories).every((a) => a.length === 0);
    if (isEmpty) {
      const prev = monthlyData[prevKey];
      setMonthlyData((d) => ({ ...d, [mKey]: initializeMonth(prev) }));
    }
  }, [mKey]);

  const cd = getCurrentData();
  const totalIncome = cd.incomes.reduce((s, i) => s + (i.earned || i.amount || 0), 0);
  const totalPlanned = Object.values(cd.categories).reduce((s, items) => s + items.reduce((ss, i) => ss + i.planned, 0), 0);
  const totalSpent = Object.values(cd.categories).reduce((s, items) => s + items.reduce((ss, i) => ss + i.spent, 0), 0);
  const remaining = totalIncome - totalPlanned;
  const prevExists = !!monthlyData[prevKey];
  const isEmpty = cd.incomes.length === 0 && Object.values(cd.categories).every((a) => a.length === 0);
  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const showBanner = (msg, success) => { setBanner({ msg, success }); setTimeout(() => setBanner(null), 4000); };

  // Income
  const addIncome = () => {
    if (!newIncome.name.trim() || !newIncome.amount) return;
    updateMonth({ incomes: [...cd.incomes, { id: Date.now(), name: newIncome.name, amount: Number(newIncome.amount) }] });
    setNewIncome({ name: "", amount: "" });
  };
  const deleteIncome = (id) => updateMonth({ incomes: cd.incomes.filter((i) => i.id !== id) });
  const editIncomeAmount = (id, val) => updateMonth({ incomes: cd.incomes.map((i) => i.id === id ? { ...i, amount: parseFloat(val) || 0 } : i) });

  // Category items
  const addItem = (cat, name) => {
    const cats = { ...cd.categories };
    cats[cat] = [...cats[cat], { id: Date.now(), name, planned: 0, spent: 0, isDefault: false }];
    updateMonth({ categories: cats });
  };
  const deleteItem = (cat, id) => {
    const cats = { ...cd.categories };
    cats[cat] = cats[cat].filter((i) => i.id !== id);
    updateMonth({ categories: cats });
  };
  const startEdit = (cat, item, field) => setEditingItem({ category: cat, id: item.id, field });
  const saveEdit = (cat, id, vals) => {
    if (!cat || !id) { setEditingItem(null); return; }
    const cats = { ...cd.categories };
    cats[cat] = cats[cat].map((i) => i.id === id ? { ...i, ...vals } : i);
    updateMonth({ categories: cats });
    setEditingItem(null);
  };
  const toggleCategory = (key) => setExpandedCategories((prev) => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  // Copy previous month
  const copyPrev = () => {
    const prev = monthlyData[prevKey];
    if (!prev) return;
    setMonthlyData((d) => ({ ...d, [mKey]: initializeMonth(prev) }));
  };

  // Paychecks
  const addPaycheck = (pc) => {
    const updated = [...(cd.paychecks || []), pc].sort((a, b) => new Date(a.date) - new Date(b.date));
    updateMonth({ paychecks: updated });
  };
  const deletePaycheck = (id) => updateMonth({ paychecks: (cd.paychecks || []).filter((p) => p.id !== id) });

  // Upload transactions
  const handleUploadSuccess = (transactions) => {
    const cats = { ...cd.categories };
    let count = 0;
    transactions.forEach(({ description, amount, category }) => {
      if (description && amount && category && cats[category]) {
        const ex = cats[category].find((i) => i.name.toLowerCase() === description.toLowerCase());
        if (ex) ex.spent += Number(amount);
        else cats[category].push({ id: Date.now() + count, name: description, planned: 0, spent: Number(amount), isDefault: false });
        count++;
      }
    });
    updateMonth({ categories: cats });
    showBanner(`Successfully added ${count} transactions!`, true);
  };

  const remScheme = remaining >= 0 ? "emerald" : "red";
  const remColor = remaining >= 0 ? "#047857" : "#b91c1c";

  return (
    <div style={S.appScreen}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @media(min-width:768px){.app-pad{padding:32px!important}} @media(min-width:768px){.stat-grid-resp{grid-template-columns:repeat(4,1fr)!important}}`}</style>
      <div style={S.maxW}>

        {/* Header */}
        <div style={S.headerCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={S.appLogoWrap}>💰</div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>Zero Budget</h1>
                <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{user.email}</p>
              </div>
            </div>
            <button style={S.btnLogout} onClick={onLogout}><span style={{ fontSize: 18 }}>↩</span> Logout</button>
          </div>

          {/* Month nav + actions */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
            <div style={S.monthNav}>
              <button style={S.monthBtn} onClick={() => setCurrentMonth((d) => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; })}>‹</button>
              <span style={S.monthLabel}>{monthLabel}</span>
              <button style={S.monthBtn} onClick={() => setCurrentMonth((d) => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; })}>›</button>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {prevExists && isEmpty && <button style={S.btnAction("linear-gradient(135deg,#16a34a,#059669)")} onClick={copyPrev}>Copy from Previous Month</button>}
              <button style={S.btnAction("linear-gradient(135deg,#9333ea,#db2777)")} onClick={() => setModal("upload")}>↑ Upload Statement</button>
              <button style={S.btnAction("linear-gradient(135deg,#4f46e5,#2563eb)")} onClick={() => setModal("paycheck")}>💰 Paycheck Planning</button>
              <button style={S.btnAction("linear-gradient(135deg,#059669,#0d9488)")} onClick={() => setModal("flow")}>📊 Money Flow</button>
            </div>
          </div>

          {banner && <div style={S.banner(banner.success)}>{banner.msg}</div>}

          {/* Income section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, background: "#dcfce7", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a", fontWeight: 700, fontSize: 16 }}>$</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>Income Sources</h3>
            </div>
            {cd.incomes.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#6b7280", fontSize: 14 }}>No income sources added yet</div>}
            {cd.incomes.map((inc) => (
              <div key={inc.id} style={S.incomeItem}>
                <span style={{ fontWeight: 600, color: "#111827" }}>{inc.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="number" style={S.incomeInput} value={inc.amount} onChange={(e) => editIncomeAmount(inc.id, e.target.value)} />
                  <button style={S.btnIconRed} onClick={() => deleteIncome(inc.id)}>🗑</button>
                </div>
              </div>
            ))}
            <div style={S.addRow}>
              <input type="text" style={S.addInput} placeholder="Income source" value={newIncome.name} onChange={(e) => setNewIncome({ ...newIncome, name: e.target.value })} />
              <input type="number" style={{ ...S.addInput, maxWidth: 144 }} placeholder="Amount" value={newIncome.amount} onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })} />
              <button style={S.btnBlueAdd} onClick={addIncome}>+ Add</button>
            </div>
            <div style={S.incomeTotalBox}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: "#374151" }}>Total Monthly Income</span>
                <span style={S.incomeTotalAmt}>{fmt(totalIncome)}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ ...S.statGrid }} className="stat-grid-resp">
            {[
              { label: "Income", value: totalIncome, scheme: "blue" },
              { label: "Budgeted", value: totalPlanned, scheme: "green" },
              { label: "Spent", value: totalSpent, scheme: "orange" },
              { label: "Remaining", value: remaining, scheme: remScheme },
            ].map(({ label, value, scheme }) => {
              const st = S.statCard(scheme);
              return (
                <div key={label} style={st}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{fmt(value)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categories */}
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <CategoryCard
            key={key}
            catKey={key}
            label={label}
            items={cd.categories[key] || []}
            editingItem={editingItem}
            isExpanded={expandedCategories.has(key)}
            onToggleExpand={toggleCategory}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onDeleteItem={deleteItem}
            onAddItem={addItem}
          />
        ))}
      </div>

      {/* Modals */}
      {modal === "upload" && <UploadModal onClose={() => setModal(null)} onSuccess={handleUploadSuccess} />}
      {modal === "paycheck" && <PaycheckModal paychecks={cd.paychecks || []} totalPlanned={totalPlanned} onAdd={addPaycheck} onDelete={deletePaycheck} onClose={() => setModal(null)} />}
      {modal === "flow" && <FlowModal currentData={cd} totalIncome={totalIncome} totalSpent={totalSpent} monthLabel={monthLabel} onClose={() => setModal(null)} />}
      {(modal === "tos" || modal === "privacy" || modal === "contact") && <InfoModal type={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ZeroBudget() {
  const [user, setUser] = useState(null);
  const [monthlyData, setMonthlyData] = useState({});

  useEffect(() => {
    const res = storage.get("current_user");
    if (res) {
      const u = JSON.parse(res.value);
      setUser(u);
      const b = storage.get(`budget_${u.email}`);
      setMonthlyData(b ? JSON.parse(b.value) : {});
    }
  }, []);

  const handleLogin = (u, data) => { setUser(u); setMonthlyData(data); };
  const handleLogout = () => {
    storage.del("current_user");
    setUser(null);
    setMonthlyData({});
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;
  return <AppScreen user={user} initialData={monthlyData} onLogout={handleLogout} />;
}
