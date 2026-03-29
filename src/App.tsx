import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, LogOut, Upload, Loader, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function ZeroBudgetApp() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState({});
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadType, setUploadType] = useState('bill');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPaycheckModal, setShowPaycheckModal] = useState(false);
  const [newPaycheck, setNewPaycheck] = useState({ date: '', amount: '', source: '' });
  const [showFlowDiagram, setShowFlowDiagram] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [newItems, setNewItems] = useState({});
  const [newIncome, setNewIncome] = useState({ name: '', amount: '' });
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  const defaultSubcategories = {
    giving: ['Charitable Donations', 'Offerings'],
    savings: ['Emergency Fund', 'Retirement', 'College Fund', 'Investment', 'Sinking Funds'],
    housing: ['Mortgage/Rent', 'Property Tax', 'HOA Fees', 'Home Insurance', 'Utilities', 'Internet/Cable', 'Phone', 'Maintenance/Repairs', 'Furnishings'],
    transportation: ['Car Payment', 'Auto Insurance', 'Gas/Fuel', 'Maintenance/Repairs', 'Registration/DMV', 'Public Transit', 'Parking', 'Rideshare'],
    food: ['Groceries', 'Restaurants', 'Coffee Shops', 'Meal Delivery', 'Work Lunches'],
    personal: ['Clothing', 'Hair/Beauty', 'Gym Membership', 'Subscriptions', 'Gifts', 'Pet Care', 'Child Care', 'Education/Tuition', 'Books/Supplies'],
    lifestyle: ['Entertainment', 'Hobbies', 'Vacation/Travel', 'Streaming Services', 'Shopping', 'Alcohol/Bars'],
    health: ['Health Insurance Premium', 'Prescriptions', 'Doctor Visits', 'Dental', 'Vision', 'Medical Supplies', 'Therapy/Counseling'],
    insurance: ['Life Insurance', 'Disability Insurance', 'Umbrella Policy', 'Renters Insurance'],
    debt: ['Credit Card Payment', 'Student Loans', 'Personal Loans', 'Medical Debt', 'Other Debt']
  };

  const categoryLabels = {
    giving: 'Giving',
    savings: 'Savings',
    housing: 'Housing',
    transportation: 'Transportation',
    food: 'Food',
    personal: 'Personal',
    lifestyle: 'Lifestyle',
    health: 'Health & Fitness',
    insurance: 'Insurance',
    debt: 'Debt'
  };

  const categoryIcons = {
    giving: '🙏',
    savings: '💰',
    housing: '🏠',
    transportation: '🚗',
    food: '🍽️',
    personal: '👤',
    lifestyle: '🎭',
    health: '💪',
    insurance: '🛡️',
    debt: '💳'
  };

  const initializeMonth = (prevData) => {
    const baseData = {
      incomes: prevData ? prevData.incomes.map(inc => ({ ...inc })) : [],
      categories: {},
      paychecks: prevData ? prevData.paychecks || [] : []
    };

    Object.keys(categoryLabels).forEach(catKey => {
      const prevItems = prevData?.categories[catKey] || [];
      const defaultItems = defaultSubcategories[catKey] || [];
      const itemsMap = new Map();
      
      defaultItems.forEach(name => {
        const existing = prevItems.find(item => item.name === name);
        itemsMap.set(name, {
          id: existing?.id || Date.now() + Math.random(),
          name,
          planned: existing?.planned || 0,
          spent: 0,
          isDefault: true
        });
      });
      
      prevItems.forEach(item => {
        if (!itemsMap.has(item.name)) {
          itemsMap.set(item.name, { ...item, spent: 0, isDefault: false });
        }
      });
      
      baseData.categories[catKey] = Array.from(itemsMap.values());
    });

    return baseData;
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userResult = await window.storage.get('current_user');
        if (userResult) {
          const userData = JSON.parse(userResult.value);
          setUser(userData);
          try {
            const budgetResult = await window.storage.get(`budget_${userData.email}`);
            if (budgetResult) {
              setMonthlyData(JSON.parse(budgetResult.value));
            }
          } catch (e) {}
        }
      } catch (error) {}
    };
    loadUserData();
  }, []);

  useEffect(() => {
    if (user && Object.keys(monthlyData).length > 0) {
      window.storage.set(`budget_${user.email}`, JSON.stringify(monthlyData));
    }
  }, [monthlyData, user]);

  const validatePassword = (pwd) => {
    const checks = {
      length: pwd.length >= 12,
      hasNumber: /\d/.test(pwd),
      hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      hasUpperCase: /[A-Z]/.test(pwd),
      hasLowerCase: /[a-z]/.test(pwd)
    };

    const score = Object.values(checks).filter(Boolean).length;
    
    let feedback = '';
    if (!checks.length) feedback = 'Password must be at least 12 characters';
    else if (!checks.hasNumber) feedback = 'Password must include at least one number';
    else if (!checks.hasSymbol) feedback = 'Password must include at least one symbol (!@#$%^&*...)';
    else if (!checks.hasUpperCase) feedback = 'Password must include at least one uppercase letter';
    else if (!checks.hasLowerCase) feedback = 'Password must include at least one lowercase letter';
    else if (score === 5) feedback = 'Strong password!';

    return { score, feedback, isValid: score === 5 };
  };

  useEffect(() => {
    if (authMode === 'signup' && password) {
      setPasswordStrength(validatePassword(password));
    }
  }, [password, authMode]);

  const handleAuth = async () => {
    setAuthError('');
    
    if (!email || !password) {
      setAuthError('Please enter email and password');
      return;
    }

    if (authMode === 'signup') {
      const validation = validatePassword(password);
      if (!validation.isValid) {
        setAuthError(validation.feedback);
        return;
      }

      if (password !== confirmPassword) {
        setAuthError('Passwords do not match');
        return;
      }

      try {
        let existingUser = null;
        try {
          existingUser = await window.storage.get(`user_${email}`);
        } catch (e) {}
        if (existingUser) {
          setAuthError('User already exists. Please login.');
          return;
        }
        const newUser = { email, password };
        await window.storage.set(`user_${email}`, JSON.stringify(newUser));
        await window.storage.set('current_user', JSON.stringify(newUser));
        setUser(newUser);
        setMonthlyData({});
        setPassword('');
        setConfirmPassword('');
      } catch (error) {
        setAuthError('Error creating account. Please try again.');
      }
    } else {
      try {
        let userResult = null;
        try {
          userResult = await window.storage.get(`user_${email}`);
        } catch (e) {}
        if (!userResult) {
          setAuthError('User not found. Please sign up.');
          return;
        }
        const userData = JSON.parse(userResult.value);
        if (userData.password !== password) {
          setAuthError('Incorrect password');
          return;
        }
        await window.storage.set('current_user', JSON.stringify(userData));
        setUser(userData);
        let budgetResult = null;
        try {
          budgetResult = await window.storage.get(`budget_${email}`);
        } catch (e) {}
        if (budgetResult) {
          setMonthlyData(JSON.parse(budgetResult.value));
        }
        setPassword('');
      } catch (error) {
        setAuthError('Error logging in. Please try again.');
      }
    }
  };

  const handleLogout = async () => {
    await window.storage.delete('current_user');
    setUser(null);
    setEmail('');
    setPassword('');
    setMonthlyData({});
  };

  const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
  const currentData = monthlyData[monthKey] || {
    incomes: [],
    categories: {
      giving: [], savings: [], housing: [], transportation: [],
      food: [], personal: [], lifestyle: [], health: [], insurance: [], debt: []
    },
    paychecks: []
  };

  const getPreviousMonthKey = () => {
    const prevDate = new Date(currentMonth);
    prevDate.setMonth(prevDate.getMonth() - 1);
    return `${prevDate.getFullYear()}-${prevDate.getMonth()}`;
  };

  const updateMonthData = (updates) => {
    setMonthlyData({ ...monthlyData, [monthKey]: { ...currentData, ...updates } });
  };

  const copyFromPreviousMonth = () => {
    const prevKey = getPreviousMonthKey();
    const prevData = monthlyData[prevKey];
    if (prevData) {
      const copiedData = initializeMonth(prevData);
      setMonthlyData({ ...monthlyData, [monthKey]: copiedData });
    }
  };

  useEffect(() => {
    if (user && !currentData.incomes.length && Object.values(currentData.categories).every(items => items.length === 0)) {
      const prevKey = getPreviousMonthKey();
      const prevData = monthlyData[prevKey];
      const autoData = initializeMonth(prevData);
      if (autoData) {
        setMonthlyData({ ...monthlyData, [monthKey]: autoData });
      }
    }
  }, [monthKey, user]);

  const totalIncome = currentData.incomes.reduce((sum, inc) => sum + (inc.earned || inc.amount), 0);

  const getTotals = () => {
    let totalPlanned = 0;
    let totalSpent = 0;
    Object.values(currentData.categories).forEach(items => {
      items.forEach(item => {
        totalPlanned += item.planned;
        totalSpent += item.spent;
      });
    });
    return { totalPlanned, totalSpent, remaining: totalIncome - totalPlanned };
  };

  const addIncome = () => {
    if (!newIncome.name.trim() || !newIncome.amount) return;
    const updatedIncomes = [...currentData.incomes, { id: Date.now(), name: newIncome.name, amount: Number(newIncome.amount) }];
    updateMonthData({ incomes: updatedIncomes });
    setNewIncome({ name: '', amount: '' });
  };

  const deleteIncome = (id) => {
    const updatedIncomes = currentData.incomes.filter(inc => inc.id !== id);
    updateMonthData({ incomes: updatedIncomes });
  };

  const editIncome = (id, newAmount) => {
    const updatedIncomes = currentData.incomes.map(inc =>
      inc.id === id ? { ...inc, amount: Number(newAmount) } : inc
    );
    updateMonthData({ incomes: updatedIncomes });
  };

  const addItem = (category) => {
    const itemName = newItems[category];
    if (!itemName?.trim()) return;
    const newCategories = { ...currentData.categories };
    newCategories[category] = [...newCategories[category], { id: Date.now(), name: itemName, planned: 0, spent: 0, isDefault: false }];
    updateMonthData({ categories: newCategories });
    setNewItems({ ...newItems, [category]: '' });
  };

  const deleteItem = (category, id) => {
    const newCategories = { ...currentData.categories };
    newCategories[category] = newCategories[category].filter(item => item.id !== id);
    updateMonthData({ categories: newCategories });
  };

  const startEdit = (category, item, field) => {
    setEditingItem({ category, id: item.id });
    setEditingField(field);
    setEditValues({ planned: item.planned, spent: item.spent });
  };

  const saveEdit = () => {
    const newCategories = { ...currentData.categories };
    newCategories[editingItem.category] = newCategories[editingItem.category].map(item =>
      item.id === editingItem.id ? { ...item, ...editValues } : item
    );
    updateMonthData({ categories: newCategories });
    setEditingItem(null);
    setEditingField(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingItem(null);
      setEditingField(null);
    }
  };

  const changeMonth = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const toggleCategory = (categoryKey) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
    }
    setExpandedCategories(newExpanded);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setUploadError('');

    try {
      const fileType = file.type;
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const contentBlock = fileType === 'application/pdf' 
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data }}
        : { type: "image", source: { type: "base64", media_type: fileType, data: base64Data }};

      let promptText = '';
      if (uploadType === 'bill') {
        promptText = "Analyze this credit card bill and extract all transactions. Return ONLY a JSON array with no markdown: [{\"description\":\"Store Name\",\"amount\":45.99,\"category\":\"food\"}]. Categories: giving, savings, housing, transportation, food, personal, lifestyle, health, insurance, debt";
      } else {
        promptText = "Analyze this bank or credit card statement PDF and extract ALL transactions. For each transaction, identify: description, amount (positive number), date, and best matching category. Return ONLY a JSON array: [{\"description\":\"Store Name\",\"amount\":45.99,\"date\":\"2024-01-15\",\"category\":\"food\"}]. Categories: giving, savings, housing, transportation, food, personal, lifestyle, health, insurance, debt. Include all debits/charges/purchases.";
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          messages: [{
            role: "user",
            content: [contentBlock, { type: "text", text: promptText }]
          }]
        })
      });

      const data = await response.json();
      const fileContent = data.content.map(item => item.text || "").join("\n");
      const cleanContent = fileContent.replace(/```json|```/g, "").trim();
      const transactions = JSON.parse(cleanContent);

      if (!Array.isArray(transactions)) throw new Error('Invalid format');

      const newCategories = { ...currentData.categories };
      let addedCount = 0;

      transactions.forEach(transaction => {
        const { description, amount, category } = transaction;
        if (description && amount && category && newCategories[category]) {
          const existingItem = newCategories[category].find(
            item => item.name.toLowerCase() === description.toLowerCase()
          );
          if (existingItem) {
            existingItem.spent += Number(amount);
          } else {
            newCategories[category].push({
              id: Date.now() + addedCount,
              name: description,
              planned: 0,
              spent: Number(amount),
              isDefault: false
            });
          }
          addedCount++;
        }
      });

      updateMonthData({ categories: newCategories });
      setUploadError(`Successfully added ${addedCount} transactions!`);
      setShowUploadModal(false);
      setTimeout(() => setUploadError(''), 3000);
    } catch (error) {
      setUploadError('Error processing file. Please ensure it is a valid statement.');
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const addPaycheck = () => {
    if (!newPaycheck.date || !newPaycheck.amount) return;
    const updatedPaychecks = [
      ...(currentData.paychecks || []),
      { 
        id: Date.now(), 
        date: newPaycheck.date, 
        amount: Number(newPaycheck.amount),
        source: newPaycheck.source || 'Paycheck'
      }
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    updateMonthData({ paychecks: updatedPaychecks });
    setNewPaycheck({ date: '', amount: '', source: '' });
  };

  const deletePaycheck = (id) => {
    const updatedPaychecks = (currentData.paychecks || []).filter(pc => pc.id !== id);
    updateMonthData({ paychecks: updatedPaychecks });
  };

  const getCashFlowByPaycheck = () => {
    const paychecks = (currentData.paychecks || []).sort((a, b) => new Date(a.date) - new Date(b.date));
    const { totalPlanned } = getTotals();
    
    if (paychecks.length === 0) return [];
    
    const flowData = [];
    let runningBalance = 0;
    
    paychecks.forEach((paycheck, index) => {
      runningBalance += paycheck.amount;
      const proportionalExpenses = index === paychecks.length - 1 
        ? totalPlanned - (flowData.reduce((sum, f) => sum + f.expenses, 0))
        : totalPlanned / paychecks.length;
      
      runningBalance -= proportionalExpenses;
      
      flowData.push({
        id: paycheck.id,
        date: paycheck.date,
        source: paycheck.source,
        income: paycheck.amount,
        expenses: proportionalExpenses,
        balance: runningBalance
      });
    });
    
    return flowData;
  };

  const getCategoryBreakdown = () => {
    const breakdown = [];
    Object.entries(categoryLabels).forEach(([key, label]) => {
      const items = currentData.categories[key] || [];
      const spent = items.reduce((sum, item) => sum + item.spent, 0);
      const planned = items.reduce((sum, item) => sum + item.planned, 0);
      if (spent > 0 || planned > 0) {
        breakdown.push({ category: label, spent, planned });
      }
    });
    return breakdown.sort((a, b) => b.spent - a.spent);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>
        
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl mb-6 shadow-lg">
                <span className="text-4xl">💰</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">Zero Budget</h1>
              <p className="text-gray-600 text-lg">Financial Planner</p>
              <p className="text-gray-500 text-sm mt-2">Take control of your financial future</p>
            </div>
            
            <div className="flex gap-2 mb-8 bg-gray-100 p-1.5 rounded-xl">
              <button 
                onClick={() => setAuthMode('login')} 
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                  authMode === 'login'
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Login
              </button>
              <button 
                onClick={() => setAuthMode('signup')} 
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                  authMode === 'signup'
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sign Up
              </button>
            </div>

            {authError && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl">
                <p className="text-red-800 text-sm font-medium">{authError}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400" 
                  placeholder="you@example.com" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()} 
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400" 
                  placeholder="••••••••••••" 
                />
                
                {authMode === 'signup' && password && (
                  <div className="mt-3">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(level => (
                        <div key={level} className={`h-1.5 flex-1 rounded-full transition-all ${
                          level <= passwordStrength.score 
                            ? passwordStrength.score <= 2 ? 'bg-red-500' 
                            : passwordStrength.score <= 4 ? 'bg-yellow-500' 
                            : 'bg-green-500'
                            : 'bg-gray-200'
                        }`} />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${
                      passwordStrength.isValid ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {passwordStrength.feedback}
                    </p>
                    {!passwordStrength.isValid && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-gray-700 space-y-1.5">
                        <p className="font-semibold text-gray-900">Password must contain:</p>
                        <ul className="space-y-1">
                          <li className={`flex items-center gap-2 ${password.length >= 12 ? 'text-green-600' : 'text-gray-600'}`}>
                            <span className="text-xs">{password.length >= 12 ? '✓' : '○'}</span>
                            At least 12 characters
                          </li>
                          <li className={`flex items-center gap-2 ${/\d/.test(password) ? 'text-green-600' : 'text-gray-600'}`}>
                            <span className="text-xs">{/\d/.test(password) ? '✓' : '○'}</span>
                            At least one number
                          </li>
                          <li className={`flex items-center gap-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : 'text-gray-600'}`}>
                            <span className="text-xs">{/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : '○'}</span>
                            At least one symbol (!@#$%...)
                          </li>
                          <li className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-600'}`}>
                            <span className="text-xs">{/[A-Z]/.test(password) ? '✓' : '○'}</span>
                            At least one uppercase letter
                          </li>
                          <li className={`flex items-center gap-2 ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-600'}`}>
                            <span className="text-xs">{/[a-z]/.test(password) ? '✓' : '○'}</span>
                            At least one lowercase letter
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {authMode === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && handleAuth()} 
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400" 
                    placeholder="••••••••••••" 
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-2 text-xs text-red-600 font-medium">Passwords do not match</p>
                  )}
                </div>
              )}

              <button 
                onClick={handleAuth} 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              {authMode === 'login' && (
                <div className="text-center">
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {authMode === 'signup' && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-600 text-center leading-relaxed">
                  By creating an account, you agree to our{' '}
                  <button onClick={() => setShowTermsModal(true)} className="text-blue-600 hover:text-blue-700 font-medium underline">Terms of Service</button>
                  {' '}and{' '}
                  <button onClick={() => setShowPrivacyModal(true)} className="text-blue-600 hover:text-blue-700 font-medium underline">Privacy Policy</button>
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center space-y-3">
            <div className="flex items-center justify-center gap-4 text-sm text-white/80">
              <button onClick={() => setShowTermsModal(true)} className="hover:text-white transition-colors font-medium">Terms of Service</button>
              <span className="text-white/40">•</span>
              <button onClick={() => setShowPrivacyModal(true)} className="hover:text-white transition-colors font-medium">Privacy Policy</button>
              <span className="text-white/40">•</span>
              <button onClick={() => setShowContactModal(true)} className="hover:text-white transition-colors font-medium">Contact</button>
            </div>
            <p className="text-sm text-white/60">
              © 2024 Zero Budget Financial Planner. All rights reserved.
            </p>
            <p className="text-xs text-white/40">
              Secure budgeting platform for managing your finances
            </p>
          </div>
        </div>

        {/* Terms of Service Modal */}
        {showTermsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Terms of Service</h2>
                <button onClick={() => setShowTermsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                <p className="text-sm text-gray-500">Last updated: March 29, 2024</p>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">1. Acceptance of Terms</h3>
                <p>By accessing and using Zero Budget Financial Planner, you accept and agree to be bound by the terms and provision of this agreement.</p>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">2. Use License</h3>
                <p>Permission is granted to temporarily use Zero Budget for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.</p>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">3. User Account</h3>
                <p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">4. Data Storage</h3>
                <p>Your financial data is stored locally in your browser. We do not have access to your personal financial information. You are responsible for backing up your data.</p>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">5. Disclaimer</h3>
                <p>Zero Budget is provided for informational purposes only and should not be considered as financial advice. Always consult with a qualified financial advisor for personalized guidance.</p>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">6. Limitations</h3>
                <p>Zero Budget Financial Planner shall not be held liable for any damages arising from the use or inability to use this service.</p>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">7. Modifications</h3>
                <p>We reserve the right to modify these terms at any time. Your continued use of the service constitutes acceptance of any changes.</p>
              </div>
              <button onClick={() => setShowTermsModal(false)} className="mt-6 w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all">
                Close
              </button>
            </div>
          </div>
        )}

        {/* Privacy Policy Modal */}
        {showPrivacyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Privacy Policy</h2>
                <button onClick={() => setShowPrivacyModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                <p className="text-sm text-gray-500">Last updated: March 29, 2024</p>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">1. Information We Collect</h3>
                <p>Zero Budget stores your email and encrypted password for authentication purposes. All financial data (income, expenses, budgets) is stored locally in your browser using secure storage mechanisms.</p>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">2. How We Use Your Information</h3>
                <p>Your information is used solely for:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Account authentication and management</li>
                  <li>Providing budget tracking and financial planning features</li>
                  <li>Storing your financial data locally on your device</li>
                </ul>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">3. Data Storage and Security</h3>
                <p>All your financial data is stored locally in your browser. We do not transmit your financial information to external servers. Your data remains on your device and is protected by your browser's security features.</p>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">4. Data Sharing</h3>
                <p>We do not sell, trade, or transfer your personal information to third parties. Your financial data is private and remains entirely under your control.</p>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">5. AI Processing</h3>
                <p>When you upload credit card statements or bills, the documents are processed using AI to extract transaction data. This processing is done securely and the uploaded files are not permanently stored.</p>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">6. Your Rights</h3>
                <p>You have the right to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Access your personal data</li>
                  <li>Delete your account and all associated data</li>
                  <li>Export your financial data</li>
                </ul>
                
                <h3 className="text-lg font-semibold text-gray-900 mt-6">7. Contact Us</h3>
                <p>If you have any questions about this Privacy Policy, please contact us using the Contact form.</p>
              </div>
              <button onClick={() => setShowPrivacyModal(false)} className="mt-6 w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all">
                Close
              </button>
            </div>
          </div>
        )}

        {/* Contact Modal */}
        {showContactModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
                <button onClick={() => setShowContactModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-100">
                  <h3 className="font-semibold text-gray-900 mb-4">Get in Touch</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <span className="text-blue-600">📧</span>
                      <div>
                        <p className="font-semibold text-gray-900">Email</p>
                        <a href="mailto:support@zerobudget.com" className="text-blue-600 hover:text-blue-700">support@zerobudget.com</a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-blue-600">💬</span>
                      <div>
                        <p className="font-semibold text-gray-900">Support Hours</p>
                        <p className="text-gray-600">Monday - Friday: 9:00 AM - 5:00 PM EST</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-blue-600">🌐</span>
                      <div>
                        <p className="font-semibold text-gray-900">Website</p>
                        <a href="#" className="text-blue-600 hover:text-blue-700">www.zerobudget.com</a>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  We typically respond within 24 hours during business days.
                </p>
              </div>
              <button onClick={() => setShowContactModal(false)} className="mt-6 w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const { totalPlanned, totalSpent, remaining } = getTotals();
  const prevMonthExists = monthlyData[getPreviousMonthKey()];
  const currentMonthIsEmpty = currentData.incomes.length === 0 && Object.values(currentData.categories).every(items => items.length === 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-2xl">💰</div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Zero Budget</h1>
                <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
              <LogOut size={20} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-2">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg transition-all shadow-sm">
                <ChevronLeft size={24} className="text-gray-700" />
              </button>
              <span className="text-xl font-bold min-w-[180px] text-center text-gray-900">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg transition-all shadow-sm">
                <ChevronRight size={24} className="text-gray-700" />
              </button>
            </div>

            <div className="flex gap-3 flex-wrap">
              {prevMonthExists && currentMonthIsEmpty && (
                <button onClick={copyFromPreviousMonth} className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-semibold">
                  Copy from Previous Month
                </button>
              )}
              
              <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg font-semibold">
                <Upload size={20} />
                Upload Statement
              </button>

              <button onClick={() => setShowPaycheckModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-semibold">
                💰 Paycheck Planning
              </button>

              <button onClick={() => setShowFlowDiagram(true)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg font-semibold">
                📊 Money Flow
              </button>
            </div>
          </div>

          {uploadError && (
            <div className={`mb-6 p-4 rounded-lg border-l-4 ${uploadError.includes('Success') ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <p className={`text-sm font-medium ${uploadError.includes('Success') ? 'text-green-800' : 'text-red-800'}`}>{uploadError}</p>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-bold">$</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Income Sources</h3>
            </div>
            
            <div className="space-y-3 mb-4">
              {currentData.incomes.map(income => (
                <div key={income.id} className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-white p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-all">
                  <span className="font-semibold text-gray-900">{income.name}</span>
                  <div className="flex items-center gap-3">
                    <input type="number" value={income.amount} onChange={(e) => editIncome(income.id, e.target.value)} className="w-36 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold" />
                    <button onClick={() => deleteIncome(income.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap">
              <input type="text" value={newIncome.name} onChange={(e) => setNewIncome({...newIncome, name: e.target.value})} placeholder="Income source" className="flex-1 min-w-[200px] px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              <input type="number" value={newIncome.amount} onChange={(e) => setNewIncome({...newIncome, amount: e.target.value})} placeholder="Amount" className="w-36 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              <button onClick={addIncome} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all">
                <Plus size={20} />Add
              </button>
            </div>

            <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-700">Total Monthly Income</span>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">${totalIncome.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border-2 border-blue-200">
              <div className="text-sm font-semibold text-blue-700 mb-1">Income</div>
              <div className="text-2xl font-bold text-blue-700">${totalIncome.toFixed(2)}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-5 rounded-xl border-2 border-green-200">
              <div className="text-sm font-semibold text-green-700 mb-1">Budgeted</div>
              <div className="text-2xl font-bold text-green-700">${totalPlanned.toFixed(2)}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-100 p-5 rounded-xl border-2 border-orange-200">
              <div className="text-sm font-semibold text-orange-700 mb-1">Spent</div>
              <div className="text-2xl font-bold text-orange-700">${totalSpent.toFixed(2)}</div>
            </div>
            <div className={`bg-gradient-to-br p-5 rounded-xl border-2 ${remaining >= 0 ? 'from-emerald-50 to-green-100 border-emerald-200' : 'from-red-50 to-red-100 border-red-200'}`}>
              <div className={`text-sm font-semibold mb-1 ${remaining >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Remaining</div>
              <div className={`text-2xl font-bold ${remaining >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>${remaining.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(categoryLabels).map(([key, label]) => {
            const items = currentData.categories[key] || [];
            const categoryTotal = items.reduce((sum, item) => sum + item.planned, 0);
            const categorySpent = items.reduce((sum, item) => sum + item.spent, 0);
            const percentage = categoryTotal > 0 ? (categorySpent / categoryTotal) * 100 : 0;
            const isExpanded = expandedCategories.has(key);

            return (
              <div key={key} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all">
                <button
                  onClick={() => toggleCategory(key)}
                  className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-3xl">{categoryIcons[key]}</span>
                    <div className="flex-1 text-left">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">{label}</h2>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          <span className="font-semibold text-gray-900">${categorySpent.toFixed(2)}</span> of ${categoryTotal.toFixed(2)}
                        </span>
                        <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right mr-4">
                      <div className="text-sm font-semibold text-gray-600 mb-1">Remaining</div>
                      <div className={`text-2xl font-bold ${categoryTotal - categorySpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${(categoryTotal - categorySpent).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={24} className="text-gray-600" /> : <ChevronDown size={24} className="text-gray-600" />}
                </button>

                {isExpanded && (
                  <div className="p-6 pt-0 border-t border-gray-100">
                    <div className="space-y-3 mb-6">
                      {items.map(item => {
                        const isEditingPlanned = editingItem?.category === key && editingItem?.id === item.id && editingField === 'planned';
                        const isEditingSpent = editingItem?.category === key && editingItem?.id === item.id && editingField === 'spent';
                        const itemPercentage = item.planned > 0 ? (item.spent / item.planned) * 100 : 0;
                        
                        return (
                          <div key={item.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all bg-gradient-to-r from-white to-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 mb-3">{item.name}</div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-2">Planned</label>
                                    {isEditingPlanned ? (
                                      <input 
                                        type="number" 
                                        value={editValues.planned} 
                                        onChange={(e) => setEditValues({...editValues, planned: Number(e.target.value)})} 
                                        onKeyDown={handleKeyPress}
                                        onBlur={saveEdit}
                                        autoFocus
                                        className="w-full px-3 py-2 border-2 border-blue-400 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                                      />
                                    ) : (
                                      <div 
                                        onDoubleClick={() => startEdit(key, item, 'planned')}
                                        className="font-bold text-lg text-gray-900 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                        title="Double-click to edit"
                                      >
                                        ${item.planned.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-2">Spent</label>
                                    {isEditingSpent ? (
                                      <input 
                                        type="number" 
                                        value={editValues.spent} 
                                        onChange={(e) => setEditValues({...editValues, spent: Number(e.target.value)})} 
                                        onKeyDown={handleKeyPress}
                                        onBlur={saveEdit}
                                        autoFocus
                                        className="w-full px-3 py-2 border-2 border-blue-400 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                                      />
                                    ) : (
                                      <div 
                                        onDoubleClick={() => startEdit(key, item, 'spent')}
                                        className="font-bold text-lg text-gray-900 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                        title="Double-click to edit"
                                      >
                                        ${item.spent.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {!isEditingPlanned && !isEditingSpent && item.planned > 0 && (
                                  <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all ${itemPercentage > 100 ? 'bg-red-500' : itemPercentage > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                                      style={{ width: `${Math.min(itemPercentage, 100)}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="ml-6">
                                <button onClick={() => deleteItem(key, item.id)} className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-all border-2 border-transparent hover:border-red-200">
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      <input type="text" value={newItems[key] || ''} onChange={(e) => setNewItems({...newItems, [key]: e.target.value})} onKeyPress={(e) => e.key === 'Enter' && addItem(key)} placeholder={`Add item to ${label}`} className="flex-1 min-w-[200px] px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
                      <button onClick={() => addItem(key)} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all">
                        <Plus size={18} />Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Statement</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Select Upload Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setUploadType('bill')} className={`p-4 rounded-xl border-2 transition-all ${uploadType === 'bill' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="text-2xl mb-2">🧾</div>
                    <div className="font-semibold text-sm">Single Bill</div>
                    <div className="text-xs text-gray-500">Credit card bill</div>
                  </button>
                  <button onClick={() => setUploadType('statement')} className={`p-4 rounded-xl border-2 transition-all ${uploadType === 'statement' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="text-2xl mb-2">📄</div>
                    <div className="font-semibold text-sm">Full Statement</div>
                    <div className="text-xs text-gray-500">Bank/CC statement</div>
                  </button>
                </div>
              </div>

              <label className="block">
                <input type="file" accept=".pdf,image/*" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
                <div className={`flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg font-semibold cursor-pointer ${uploadingFile ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {uploadingFile ? (<><Loader size={20} className="animate-spin" />Processing...</>) : (<><Upload size={20} />Choose File to Upload</>)}
                </div>
              </label>

              <button onClick={() => setShowUploadModal(false)} className="mt-4 w-full px-6 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all font-semibold">
                Cancel
              </button>
            </div>
          </div>
        )}

        {showPaycheckModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 my-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">💰 Paycheck Planning</h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Add Paycheck</h3>
                <div className="flex gap-3 flex-wrap">
                  <input type="date" value={newPaycheck.date} onChange={(e) => setNewPaycheck({...newPaycheck, date: e.target.value})} className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  <input type="number" value={newPaycheck.amount} onChange={(e) => setNewPaycheck({...newPaycheck, amount: e.target.value})} placeholder="Amount" className="w-36 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  <input type="text" value={newPaycheck.source} onChange={(e) => setNewPaycheck({...newPaycheck, source: e.target.value})} placeholder="Source (optional)" className="flex-1 min-w-[150px] px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  <button onClick={addPaycheck} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all">
                    <Plus size={20} />Add
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Paychecks</h3>
                <div className="space-y-2">
                  {(currentData.paychecks || []).map(pc => (
                    <div key={pc.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
                      <div>
                        <div className="font-semibold text-gray-900">{pc.source}</div>
                        <div className="text-sm text-gray-600">{new Date(pc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-green-600">${pc.amount.toFixed(2)}</span>
                        <button onClick={() => deletePaycheck(pc.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(currentData.paychecks || []).length === 0 && (
                    <div className="text-center py-8 text-gray-500">No paychecks added yet</div>
                  )}
                </div>
              </div>

              {(currentData.paychecks || []).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Cash Flow Forecast</h3>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-100">
                    <div className="space-y-3">
                      {getCashFlowByPaycheck().map((flow, index) => (
                        <div key={flow.id} className="bg-white rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold text-gray-900">{flow.source}</div>
                              <div className="text-xs text-gray-600">{new Date(flow.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600">Balance After</div>
                              <div className={`text-xl font-bold ${flow.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${flow.balance.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-green-600">+ ${flow.income.toFixed(2)} income</div>
                            <div className="text-orange-600">- ${flow.expenses.toFixed(2)} expenses</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button onClick={() => setShowPaycheckModal(false)} className="w-full px-6 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all font-semibold">
                Close
              </button>
            </div>
          </div>
        )}

        {showFlowDiagram && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-8 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">📊 Money Flow - {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => setShowFlowDiagram(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-6 text-white mb-6">
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <div className="text-sm opacity-90 mb-1">Total Income</div>
                      <div className="text-3xl font-bold">${totalIncome.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm opacity-90 mb-1">Total Spent</div>
                      <div className="text-3xl font-bold">${totalSpent.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm opacity-90 mb-1">Remaining</div>
                      <div className="text-3xl font-bold">${(totalIncome - totalSpent).toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Income Sources</h3>
                  <div className="space-y-3">
                    {currentData.incomes.map(income => {
                      const percentage = totalIncome > 0 ? (income.amount / totalIncome) * 100 : 0;
                      return (
                        <div key={income.id} className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-gray-900">{income.name}</div>
                            <div className="text-xl font-bold text-green-600">${income.amount.toFixed(2)}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 bg-green-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="text-sm font-semibold text-green-700">{percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Spending by Category</h3>
                  <div className="space-y-3">
                    {getCategoryBreakdown().map(cat => {
                      const percentage = totalSpent > 0 ? (cat.spent / totalSpent) * 100 : 0;
                      const isOverBudget = cat.spent > cat.planned;
                      return (
                        <div key={cat.category} className={`rounded-xl p-4 border-2 ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-semibold text-gray-900">{cat.category}</div>
                              <div className="text-sm text-gray-600">
                                Planned: ${cat.planned.toFixed(2)}
                                {isOverBudget && <span className="ml-2 text-red-600 font-semibold">Over by ${(cat.spent - cat.planned).toFixed(2)}</span>}
                              </div>
                            </div>
                            <div className="text-xl font-bold text-orange-600">${cat.spent.toFixed(2)}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 bg-orange-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="text-sm font-semibold text-orange-700">{percentage.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Money Flow Visualization</h3>
                  <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-8 border-2 border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <div className="inline-block bg-green-500 text-white rounded-2xl px-8 py-6 shadow-lg mb-3">
                          <div className="text-sm font-semibold mb-1">Income</div>
                          <div className="text-3xl font-bold">${totalIncome.toFixed(2)}</div>
                        </div>
                        <div className="text-sm text-gray-600">Money In</div>
                      </div>

                      <div className="flex-1 flex flex-col items-center justify-center px-8">
                        <div className="w-full h-2 bg-gradient-to-r from-green-500 via-orange-500 to-blue-500 rounded-full mb-2" />
                        <div className="text-xs text-gray-500 font-semibold">Flow →</div>
                      </div>

                      <div className="text-center flex-1">
                        <div className="inline-block bg-orange-500 text-white rounded-2xl px-8 py-6 shadow-lg mb-3">
                          <div className="text-sm font-semibold mb-1">Expenses</div>
                          <div className="text-3xl font-bold">${totalSpent.toFixed(2)}</div>
                        </div>
                        <div className="text-sm text-gray-600">Money Out</div>
                      </div>

                      <div className="flex-1 flex flex-col items-center justify-center px-8">
                        <div className="w-full h-2 bg-gradient-to-r from-orange-500 to-blue-500 rounded-full mb-2" />
                        <div className="text-xs text-gray-500 font-semibold">→ Result</div>
                      </div>

                      <div className="text-center flex-1">
                        <div className={`inline-block ${totalIncome - totalSpent >= 0 ? 'bg-blue-500' : 'bg-red-500'} text-white rounded-2xl px-8 py-6 shadow-lg mb-3`}>
                          <div className="text-sm font-semibold mb-1">Balance</div>
                          <div className="text-3xl font-bold">${(totalIncome - totalSpent).toFixed(2)}</div>
                        </div>
                        <div className="text-sm text-gray-600">{totalIncome - totalSpent >= 0 ? 'Surplus' : 'Deficit'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                    <div className="text-sm font-semibold text-green-700 mb-2">💚 Top Earning Source</div>
                    {currentData.incomes.length > 0 ? (
                      <div>
                        <div className="text-xl font-bold text-gray-900">{currentData.incomes.sort((a, b) => b.amount - a.amount)[0].name}</div>
                        <div className="text-2xl font-bold text-green-600">${currentData.incomes.sort((a, b) => b.amount - a.amount)[0].amount.toFixed(2)}</div>
                      </div>
                    ) : (
                      <div className="text-gray-500">No income sources</div>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border-2 border-orange-200">
                    <div className="text-sm font-semibold text-orange-700 mb-2">🔥 Biggest Expense Category</div>
                    {getCategoryBreakdown().length > 0 ? (
                      <div>
                        <div className="text-xl font-bold text-gray-900">{getCategoryBreakdown()[0].category}</div>
                        <div className="text-2xl font-bold text-orange-600">${getCategoryBreakdown()[0].spent.toFixed(2)}</div>
                      </div>
                    ) : (
                      <div className="text-gray-500">No expenses yet</div>
                    )}
                  </div>
                </div>
              </div>

              <button onClick={() => setShowFlowDiagram(false)} className="w-full px-6 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all font-semibold">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}