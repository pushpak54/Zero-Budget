import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';

// ─── Supabase Configuration ───────────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// ─── Database Storage Logic ───────────────────────────────────────────────────
const budgetStorage = {
  load: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('budget_data')
        .eq('id', userId)
        .single();
      if (error && error.code !== 'PGRST116') return {};
      return data?.budget_data || {};
    } catch { return {}; }
  },
  save: async (userId, data) => {
    try {
      await supabase.from('profiles').upsert({ 
        id: userId, 
        budget_data: data, 
        updated_at: new Date().toISOString() 
      });
    } catch (err) { console.error("Save error", err); }
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => "$" + (n || 0).toFixed(2);
const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`;

function initializeMonth(prevData) {
  const base = { incomes: [], paychecks: [], categories: {} };
  Object.keys(CATEGORY_LABELS).forEach((catKey) => {
    const defs = DEFAULT_SUBCATEGORIES[catKey] || [];
    base.categories[catKey] = defs.map(name => ({
      id: Math.random(), name, planned: 0, spent: 0, isDefault: true
    }));
  });
  return base;
}

// ─── Styles (Abbreviated for space, keep your original S object here) ─────────
const S = {
  authScreen: { minHeight: "100vh", background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e1b4b 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "sans-serif" },
  authBox: { background: "white", padding: 40, borderRadius: 24, width: "100%", maxWidth: 400, textAlign: "center" },
  formInput: { width: "100%", padding: 12, marginBottom: 16, borderRadius: 8, border: "1px solid #ccc" },
  btnAuth: { width: "100%", padding: 12, background: "#2563eb", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" },
  appScreen: { padding: 20, background: "#f8fafc", minHeight: "100vh" }
};

// ─── Auth Component ───────────────────────────────────────────────────────────
function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");

  const handleAuth = async () => {
    if (mode === "signup") {
      await supabase.auth.signUp({ email, password });
      alert("Check email for confirmation!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    }
  };

  return (
    <div style={S.authScreen}>
      <div style={S.authBox}>
        <h2 style={{color: "#1e293b"}}>Zero Budget</h2>
        <input style={S.formInput} placeholder="Email" onChange={e => setEmail(e.target.value)} />
        <input style={S.formInput} type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />
        <button style={S.btnAuth} onClick={handleAuth}>{mode === "login" ? "Login" : "Sign Up"}</button>
        <p onClick={() => setMode(mode === "login" ? "signup" : "login")} style={{cursor: "pointer", marginTop: 15, color: "#2563eb"}}>
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Login"}
        </p>
      </div>
    </div>
  );
}

// ─── Main Root Component ──────────────────────────────────────────────────────
export default function ZeroBudget() {
  const [user, setUser] = useState(null);
  const [monthlyData, setMonthlyData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        budgetStorage.load(session.user.id).then(data => {
          setMonthlyData(data);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for Logins/Logouts
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        const data = await budgetStorage.load(session.user.id);
        setMonthlyData(data);
      } else {
        setUser(null);
        setMonthlyData({});
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync data to Supabase on change
  useEffect(() => {
    if (user && Object.keys(monthlyData).length > 0) {
      const timeout = setTimeout(() => {
        budgetStorage.save(user.id, monthlyData);
      }, 1000); // Debounce saves by 1 second
      return () => clearTimeout(timeout);
    }
  }, [monthlyData, user]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <AuthScreen />;

  return (
    <div style={S.appScreen}>
      <header style={{display: "flex", justifyContent: "space-between", marginBottom: 20}}>
        <h1>My Budget</h1>
        <button onClick={() => supabase.auth.signOut()} style={{padding: "8px 16px", borderRadius: 8}}>Logout</button>
      </header>
      
      {/* Your existing Budget UI components would go here, using monthlyData */}
      <div style={{padding: 20, background: "white", borderRadius: 12}}>
        <p>Logged in as: {user.email}</p>
        <p>Your budget data is safely stored in Supabase.</p>
        <button onClick={() => setMonthlyData({...monthlyData, lastUpdate: new Date()})}>
          Test Save
        </button>
      </div>
    </div>
  );
}
