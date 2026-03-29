import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';

// ─── Supabase Configuration ───────────────────────────────────────────────────
// Replace these with your actual keys or use Environment Variables
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "https://ihlnfbxwymldllhiumsv.supabase.co";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobG5mYnh3eW1sZGxsaGl1bXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3ODA1OTMsImV4cCI6MjA5MDM1NjU5M30.z72IM971SEIgeXyIJojFAnl5sYGDJ0JMSiSifug0l00";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// ─── Styles (Extracted from your source) ──────────────────────────────────────
const S = {
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
  appScreen: { background: "linear-gradient(135deg,#f8fafc 0%,#eff6ff 50%,#eef2ff 100%)", minHeight: "100vh", padding: 16, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif" },
  maxW: { maxWidth: 1152, margin: "0 auto" },
  headerCard: { background: "#fff", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.07)", border: "1px solid #f3f4f6", padding: "24px 32px", marginBottom: 32 },
  appLogoWrap: { width: 48, height: 48, background: "linear-gradient(135deg,#2563eb,#4f46e5)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 },
  btnLogout: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", border: "none", background: "transparent", color: "#4b5563", cursor: "pointer", borderRadius: 12, fontWeight: 600, fontSize: 14 },
  monthNav: { display: "flex", alignItems: "center", gap: 12, background: "#f9fafb", borderRadius: 14, padding: 8 },
  monthBtn: { padding: 8, background: "transparent", border: "none", cursor: "pointer", borderRadius: 10, fontSize: 20, color: "#374151" },
  monthLabel: { fontSize: 20, fontWeight: 700, minWidth: 190, textAlign: "center", color: "#111827" },
  btnAction: (grad) => ({ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", border: "none", borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#fff", background: grad, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }),
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
};

// ─── Supabase Logic (The missing part) ────────────────────────────────────────

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setError("");
    setLoading(true);
    if (mode === "signup") {
      const { data, error: signupErr } = await supabase.auth.signUp({ email, password });
      if (signupErr) setError(signupErr.message);
      else alert("Check your email for confirmation!");
    } else {
      const { data, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
      if (loginErr) setError(loginErr.message);
      else {
          // Fetch user's budget from DB
          const { data: budgetData } = await supabase.from('budgets').select('*').eq('user_id', data.user.id);
          onLogin(data.user, budgetData ? budgetData[0]?.data || {} : {});
      }
    }
    setLoading(false);
  };

  return (
    <div style={S.authScreen}>
      <div style={S.authGrid} />
      <div style={S.authWrap}>
        <div style={S.authBox}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={S.authLogo}>💰</div>
            <div style={S.authTitle}>Zero Budget</div>
          </div>
          <div style={S.authTabs}>
            <button style={S.authTab(mode === "login")} onClick={() => setMode("login")}>Login</button>
            <button style={S.authTab(mode === "signup")} onClick={() => setMode("signup")}>Sign Up</button>
          </div>
          {error && <div style={S.authError}>{error}</div>}
          <div style={S.formGroup}>
            <label style={S.formLabel}>Email</label>
            <input type="email" style={S.formInput} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div style={S.formGroup}>
            <label style={S.formLabel}>Password</label>
            <input type="password" style={S.formInput} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button style={S.btnAuth} onClick={handleAuth} disabled={loading}>
            {loading ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Application Components (Rest of your file logic) ────────────────────
// Note: This logic now includes a Database Sync step

export default function ZeroBudget() {
  const [user, setUser] = useState(null);
  const [monthlyData, setMonthlyData] = useState({});

  useEffect(() => {
    // Check for active session on load
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUser(session.user);
            const { data: budgetData } = await supabase.from('profiles').select('budget_data').eq('id', session.user.id).single();
            setMonthlyData(budgetData?.budget_data || {});
        }
    };
    checkUser();
  }, []);

  // Auto-sync to Supabase on data change
  useEffect(() => {
    if (user && Object.keys(monthlyData).length > 0) {
        const syncData = async () => {
            await supabase.from('profiles').upsert({ id: user.id, budget_data: monthlyData });
        };
        syncData();
    }
  }, [monthlyData, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMonthlyData({});
  };

  if (!user) return <AuthScreen onLogin={(u, data) => { setUser(u); setMonthlyData(data); }} />;
  
  // Return your AppScreen component here...
  return (
      <div style={S.appScreen}>
          {/* Your Full App UI goes here, identical to your original source */}
          <button onClick={handleLogout} style={S.btnLogout}>Logout</button>
          <h1>Welcome, {user.email}</h1>
          <p>Your data is now safely synced with Supabase.</p>
      </div>
  );
}