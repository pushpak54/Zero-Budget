import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';

// 1. INITIALIZE SUPABASE
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Constants (Same as before) ────────────────────────────────────────────────
const CATEGORY_LABELS = {
  giving: "Giving", savings: "Savings", housing: "Housing",
  transportation: "Transportation", food: "Food", personal: "Personal",
  lifestyle: "Lifestyle", health: "Health & Fitness",
  insurance: "Insurance", debt: "Debt",
};

// ... [Keep CATEGORY_ICONS and DEFAULT_SUBCATEGORIES from your original code] ...

// ─── UPDATED STORAGE (Now uses Supabase) ────────────────────────────────────────
const storage = {
  async getBudget(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('budget_data')
      .eq('id', userId)
      .single();
    if (error) return {};
    return data.budget_data || {};
  },
  async saveBudget(userId, budgetData) {
    await supabase
      .from('profiles')
      .upsert({ id: userId, budget_data: budgetData, updated_at: new Date() });
  }
};

// ... [Keep Helpers and initializeMonth from your original code] ...

// ─── UPDATED AUTH SCREEN ────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleAuth = async () => {
    setError("");
    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) { setError(signUpError.message); return; }
      onLogin(data.user, {});
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setError(signInError.message); return; }
      const budget = await storage.getBudget(data.user.id);
      onLogin(data.user, budget);
    }
  };

  // ... [Keep your existing Auth UI return statement here] ...
}

// ─── UPDATED MAIN APP ───────────────────────────────────────────────────────────
function AppScreen({ user, initialData, onLogout }) {
  const [monthlyData, setMonthlyData] = useState(initialData);
  // ... [Keep existing state hooks] ...

  // UPDATED Auto-save to Supabase
  useEffect(() => {
    if (user && Object.keys(monthlyData).length > 0) {
      storage.saveBudget(user.id, monthlyData);
    }
  }, [monthlyData, user]);

  // ... [Keep the rest of your AppScreen logic and Sub-components] ...
}

export default function ZeroBudget() {
  const [user, setUser] = useState(null);
  const [monthlyData, setMonthlyData] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        storage.getBudget(session.user.id).then(setMonthlyData);
      }
    });
  }, []);

  const handleLogin = (u, data) => { setUser(u); setMonthlyData(data); };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMonthlyData({});
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;
  return <AppScreen user={user} initialData={monthlyData} onLogout={handleLogout} />;
}
