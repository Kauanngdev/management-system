import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function formatMoney(cents) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const API_URL = "http://localhost:3001";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [currentUser, setCurrentUser] = useState(null);

  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [activePage, setActivePage] = useState("dashboard");

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("EXPENSE");
  const [newCategoryColor, setNewCategoryColor] = useState("#7c3aed");

  async function authFetch(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    return response;
  }

  async function loadUser() {
    if (!token) return;

    try {
      const res = await authFetch("/auth/me");
      if (!res.ok) {
        handleLogout();
        return;
      }

      const data = await res.json();
      setCurrentUser(data);
    } catch {
      handleLogout();
    }
  }

  async function loadData(month = selectedMonth) {
    if (!token) return;

    const [transactionsRes, categoriesRes] = await Promise.all([
      authFetch(`/transactions?month=${month}`),
      authFetch("/categories"),
    ]);

    if (transactionsRes.status === 401 || categoriesRes.status === 401) {
      handleLogout();
      return;
    }

    const transactionsData = await transactionsRes.json();
    const categoriesData = await categoriesRes.json();

    setTransactions(transactionsData);
    setCategories(categoriesData);

    if (categoriesData.length > 0 && !categoryId) {
      setCategoryId(categoriesData[0].id);
    }
  }

  useEffect(() => {
    if (token) {
      loadUser();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadData(selectedMonth);
    }
  }, [selectedMonth, token]);

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError("");

    const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";

    const payload =
      authMode === "login"
        ? { email: authEmail, password: authPassword }
        : { name: authName, email: authEmail, password: authPassword };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Authentication failed");
        return;
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);
      setCurrentUser(data.user);

      setAuthName("");
      setAuthEmail("");
      setAuthPassword("");
      setAuthError("");
    } catch {
      setAuthError("Connection error");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setToken("");
    setCurrentUser(null);
    setTransactions([]);
    setCategories([]);
  }

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const item of transactions) {
      if (item.category?.type === "INCOME") {
        income += item.amountCents;
      } else {
        expense += item.amountCents;
      }
    }

    const balance = income - expense;
    const margin = income > 0 ? (balance / income) * 100 : 0;

    return {
      income,
      expense,
      balance,
      count: transactions.length,
      margin,
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    const grouped = {};

    for (const item of transactions) {
      const date = new Date(item.date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });

      if (!grouped[date]) {
        grouped[date] = { date, income: 0, expense: 0 };
      }

      if (item.category?.type === "INCOME") {
        grouped[date].income += item.amountCents / 100;
      } else {
        grouped[date].expense += item.amountCents / 100;
      }
    }

    return Object.values(grouped).slice(-7);
  }, [transactions]);

  const pieData = [
    { name: "Revenue", value: summary.income / 100 },
    { name: "Expenses", value: summary.expense / 100 },
  ];

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.category?.name?.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        typeFilter === "ALL" ? true : item.category?.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [transactions, search, typeFilter]);

  const recentTransactions = filteredTransactions.slice(0, 5);

  const topExpenseCategory = useMemo(() => {
    const grouped = {};

    for (const item of transactions) {
      if (item.category?.type !== "EXPENSE") continue;
      const key = item.category?.name || "Unknown";
      grouped[key] = (grouped[key] || 0) + item.amountCents;
    }

    const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return null;

    return {
      name: entries[0][0],
      value: entries[0][1],
    };
  }, [transactions]);

  const avgTicket = useMemo(() => {
    if (!transactions.length) return 0;
    const total = transactions.reduce((acc, item) => acc + item.amountCents, 0);
    return Math.round(total / transactions.length);
  }, [transactions]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setAmount("");
    setTransactionDate(new Date().toISOString().slice(0, 10));
    if (categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }

  async function handleCreateOrUpdateTransaction(e) {
    e.preventDefault();

    const payload = {
      title,
      amount: Math.round(Number(amount) * 100),
      categoryId,
      date: transactionDate,
    };

    if (editingId) {
      await authFetch(`/transactions/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await authFetch("/transactions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    resetForm();
    setIsModalOpen(false);
    await loadData(selectedMonth);
  }

  function handleEditTransaction(item) {
    setEditingId(item.id);
    setTitle(item.title);
    setAmount((item.amountCents / 100).toString());
    setCategoryId(item.categoryId);
    setTransactionDate(new Date(item.date).toISOString().slice(0, 10));
    setIsModalOpen(true);
  }

  async function handleDeleteTransaction(id) {
    await authFetch(`/transactions/${id}`, {
      method: "DELETE",
    });

    await loadData(selectedMonth);
  }

  async function handleCreateCategory(e) {
    e.preventDefault();

    await authFetch("/categories", {
      method: "POST",
      body: JSON.stringify({
        name: newCategoryName,
        type: newCategoryType,
        color: newCategoryColor,
      }),
    });

    setNewCategoryName("");
    setNewCategoryType("EXPENSE");
    setNewCategoryColor("#7c3aed");
    await loadData(selectedMonth);
  }

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function exportCSV() {
    const headers = ["Title", "Category", "Type", "Date", "AmountBRL"];
    const rows = filteredTransactions.map((item) => [
      item.title,
      item.category?.name || "",
      item.category?.type || "",
      new Date(item.date).toLocaleDateString("pt-BR"),
      (item.amountCents / 100).toFixed(2),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `management-system-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const pageMeta = {
    dashboard: {
      overline: "Financial Operations",
      title: "Executive Dashboard",
      subtitle:
        "Strategic visibility across revenue, expenses and operational performance.",
    },
    transactions: {
      overline: "Operations Ledger",
      title: "Transactions Control",
      subtitle:
        "Monitor, edit and validate all registered financial movements.",
    },
    categories: {
      overline: "Classification Center",
      title: "Category Management",
      subtitle:
        "Organize your accounting structure with revenue and expense groups.",
    },
    reports: {
      overline: "Reporting Workspace",
      title: "Reports & Exports",
      subtitle:
        "Generate summaries and export filtered data for external analysis.",
    },
  };

  const currentMeta = pageMeta[activePage] || pageMeta.dashboard;

  function renderEmptyState(title, description) {
    return (
      <div className="ms-empty-state">
        <div className="ms-empty-icon">◎</div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    );
  }

  function renderDashboard() {
    return (
      <>
        <section className="ms-executive-banner">
          <div>
            <span className="ms-chip">Executive Overview</span>
            <h3>Financial command center with enterprise-grade visibility.</h3>
            <p>
              Monitor the monthly performance, track category concentration and
              keep your operation organized with a modern premium interface.
            </p>
          </div>

          <div className="ms-banner-stats">
            <div className="ms-banner-box">
              <span>Average Ticket</span>
              <strong>{formatMoney(avgTicket)}</strong>
            </div>
            <div className="ms-banner-box">
              <span>Top Expense</span>
              <strong>{topExpenseCategory ? topExpenseCategory.name : "—"}</strong>
            </div>
          </div>
        </section>

        <section className="ms-toolbar-grid">
          <div className="ms-filter-card">
            <span className="ms-card-label">Month</span>
            <input
              className="ms-inline-select"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>

          <div className="ms-filter-card">
            <span className="ms-card-label">Filter by Type</span>
            <select
              className="ms-inline-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All transactions</option>
              <option value="INCOME">Revenue only</option>
              <option value="EXPENSE">Expenses only</option>
            </select>
          </div>

          <div className="ms-filter-card">
            <span className="ms-card-label">Export</span>
            <button className="ms-ghost-btn" onClick={exportCSV}>
              Export CSV
            </button>
          </div>
        </section>

        <section className="ms-kpi-grid">
          <div className="ms-kpi-card">
            <span>Total Revenue</span>
            <strong>{formatMoney(summary.income)}</strong>
            <p className="kpi-green">Income registered</p>
          </div>

          <div className="ms-kpi-card">
            <span>Total Expenses</span>
            <strong>{formatMoney(summary.expense)}</strong>
            <p className="kpi-red">Operational costs</p>
          </div>

          <div className="ms-kpi-card">
            <span>Net Balance</span>
            <strong>{formatMoney(summary.balance)}</strong>
            <p className="kpi-purple">Financial result</p>
          </div>

          <div className="ms-kpi-card">
            <span>Transactions</span>
            <strong>{summary.count}</strong>
            <p className="kpi-muted">Registered records</p>
          </div>
        </section>

        <section className="ms-insights-grid">
          <div className="ms-insight-card">
            <span className="ms-card-label">Operating Margin</span>
            <strong>{summary.margin.toFixed(1)}%</strong>
            <p>Current balance relative to revenue.</p>
          </div>

          <div className="ms-insight-card">
            <span className="ms-card-label">Top Expense Category</span>
            <strong>
              {topExpenseCategory ? topExpenseCategory.name : "No expenses"}
            </strong>
            <p>
              {topExpenseCategory
                ? formatMoney(topExpenseCategory.value)
                : "No expense activity found."}
            </p>
          </div>

          <div className="ms-insight-card">
            <span className="ms-card-label">Quick Actions</span>
            <div className="ms-quick-actions">
              <button className="ms-ghost-btn" onClick={openCreateModal}>
                Add transaction
              </button>
              <button className="ms-ghost-btn" onClick={exportCSV}>
                Download report
              </button>
            </div>
          </div>
        </section>

        <section className="ms-analytics-grid">
          <div className="ms-analytics-card">
            <div className="ms-card-header">
              <div>
                <span className="ms-card-label">Financial Analytics</span>
                <h3>Revenue vs Expenses</h3>
              </div>
            </div>

            <div className="ms-chart-wrap">
              {chartData.length === 0 ? (
                renderEmptyState(
                  "No analytics available",
                  "Create transactions for the selected month to visualize financial movement."
                )
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.10)" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#22c55e"
                      fillOpacity={1}
                      fill="url(#incomeFill)"
                      strokeWidth={3}
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      stroke="#ef4444"
                      fillOpacity={1}
                      fill="url(#expenseFill)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="ms-side-stack">
            <div className="ms-analytics-card small">
              <div className="ms-card-header">
                <div>
                  <span className="ms-card-label">Distribution</span>
                  <h3>Financial Split</h3>
                </div>
              </div>

              <div className="ms-pie-wrap">
                {summary.income === 0 && summary.expense === 0 ? (
                  renderEmptyState(
                    "No distribution data",
                    "Revenue and expense charts will appear once transactions are added."
                  )
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        innerRadius={56}
                      >
                        <Cell fill="#22c55e" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="ms-analytics-card small">
              <div className="ms-card-header">
                <div>
                  <span className="ms-card-label">Activity</span>
                  <h3>Recent Operations</h3>
                </div>
              </div>

              <div className="ms-activity-list">
                {recentTransactions.length === 0 ? (
                  renderEmptyState(
                    "No recent operations",
                    "Your last financial events will appear here."
                  )
                ) : (
                  recentTransactions.map((item) => (
                    <div className="ms-activity-item" key={item.id}>
                      <div className="ms-activity-dot"></div>
                      <div>
                        <strong>{item.title}</strong>
                        <p>
                          {item.category?.name} •{" "}
                          {new Date(item.date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  function renderTransactionsPage() {
    return (
      <section className="ms-page-card">
        <div className="ms-card-header">
          <div>
            <span className="ms-card-label">Transactions Module</span>
            <h3>All Transactions</h3>
          </div>
          <button className="ms-primary-btn" onClick={openCreateModal}>
            New Transaction
          </button>
        </div>

        <div className="ms-transaction-list">
          {filteredTransactions.length === 0 ? (
            renderEmptyState(
              "No transactions found",
              "Try changing filters or create a new financial record."
            )
          ) : (
            filteredTransactions.map((item) => (
              <div className="ms-transaction-row" key={item.id}>
                <div className="ms-transaction-main">
                  <span
                    className="ms-category-bar"
                    style={{ background: item.category?.color || "#7c3aed" }}
                  ></span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>
                      {item.category?.name} •{" "}
                      {new Date(item.date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                <div className="ms-transaction-meta">
                  <span
                    className={
                      item.category?.type === "INCOME"
                        ? "ms-money positive"
                        : "ms-money negative"
                    }
                  >
                    {item.category?.type === "INCOME" ? "+" : "-"}{" "}
                    {formatMoney(item.amountCents)}
                  </span>

                  <button
                    className="ms-action-btn edit"
                    onClick={() => handleEditTransaction(item)}
                  >
                    Edit
                  </button>

                  <button
                    className="ms-action-btn delete"
                    onClick={() => handleDeleteTransaction(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    );
  }

  function renderCategoriesPage() {
    return (
      <section className="ms-page-card">
        <div className="ms-card-header">
          <div>
            <span className="ms-card-label">Category Management</span>
            <h3>Categories</h3>
          </div>
        </div>

        <form className="ms-form ms-category-form" onSubmit={handleCreateCategory}>
          <div className="ms-form-field">
            <label>Name</label>
            <input
              type="text"
              placeholder="Ex: Infrastructure"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
            />
          </div>

          <div className="ms-form-grid">
            <div className="ms-form-field">
              <label>Type</label>
              <select
                value={newCategoryType}
                onChange={(e) => setNewCategoryType(e.target.value)}
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Revenue</option>
              </select>
            </div>

            <div className="ms-form-field">
              <label>Color</label>
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="ms-primary-btn">
            Create Category
          </button>
        </form>

        <div className="ms-category-list large">
          {categories.length === 0 ? (
            renderEmptyState(
              "No categories created",
              "Create revenue and expense categories to structure the system."
            )
          ) : (
            categories.map((cat) => (
              <div className="ms-category-item" key={cat.id}>
                <div className="ms-category-left">
                  <span
                    className="ms-category-dot"
                    style={{ background: cat.color }}
                  ></span>
                  <div>
                    <strong>{cat.name}</strong>
                    <p>{cat.type === "INCOME" ? "Revenue" : "Expense"}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    );
  }

  function renderReportsPage() {
    return (
      <section className="ms-page-card">
        <div className="ms-card-header">
          <div>
            <span className="ms-card-label">Reports Center</span>
            <h3>Reports & Exports</h3>
          </div>
        </div>

        <div className="ms-report-grid">
          <div className="ms-report-card">
            <strong>Monthly export</strong>
            <p>Download the current filtered month as CSV for analysis.</p>
            <button className="ms-primary-btn" onClick={exportCSV}>
              Export CSV
            </button>
          </div>

          <div className="ms-report-card">
            <strong>Financial summary</strong>
            <p>Review revenue, expenses and balance for executive reporting.</p>
            <div className="ms-report-values">
              <span>Revenue: {formatMoney(summary.income)}</span>
              <span>Expenses: {formatMoney(summary.expense)}</span>
              <span>Balance: {formatMoney(summary.balance)}</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderPageContent() {
    if (activePage === "transactions") return renderTransactionsPage();
    if (activePage === "categories") return renderCategoriesPage();
    if (activePage === "reports") return renderReportsPage();
    return renderDashboard();
  }

  if (!token) {
    return (
      <div className="ms-auth-page">
        <div className="ms-auth-card">
          <div className="ms-auth-brand">
            <div className="ms-brand-badge">MS</div>
            <div>
              <h1>Management System</h1>
              <p>Secure enterprise finance access</p>
            </div>
          </div>

          <div className="ms-auth-header">
            <span className="ms-chip">
              {authMode === "login" ? "Welcome back" : "Create account"}
            </span>
            <h2>
              {authMode === "login"
                ? "Sign in to continue"
                : "Create your workspace"}
            </h2>
            <p>
              {authMode === "login"
                ? "Access your premium financial operations dashboard."
                : "Set up your secure account to start managing data."}
            </p>
          </div>

          <form className="ms-form" onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <div className="ms-form-field">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="ms-form-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
            </div>

            <div className="ms-form-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
            </div>

            {authError && <p className="ms-auth-error">{authError}</p>}

            <button type="submit" className="ms-primary-btn auth-full">
              {authMode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="ms-auth-footer">
            <span>
              {authMode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}
            </span>
            <button
              className="ms-link-btn"
              onClick={() =>
                setAuthMode(authMode === "login" ? "register" : "login")
              }
            >
              {authMode === "login" ? "Create one" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ms-app">
      <aside className="ms-sidebar">
        <div className="ms-brand">
          <div className="ms-brand-badge">MS</div>
          <div>
            <h1>Management System</h1>
            <p>Enterprise Finance Suite</p>
          </div>
        </div>

        <nav className="ms-nav">
          <button
            className={`ms-nav-item ${activePage === "dashboard" ? "active" : ""}`}
            onClick={() => setActivePage("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`ms-nav-item ${activePage === "transactions" ? "active" : ""}`}
            onClick={() => setActivePage("transactions")}
          >
            Transactions
          </button>
          <button
            className={`ms-nav-item ${activePage === "categories" ? "active" : ""}`}
            onClick={() => setActivePage("categories")}
          >
            Categories
          </button>
          <button
            className={`ms-nav-item ${activePage === "reports" ? "active" : ""}`}
            onClick={() => setActivePage("reports")}
          >
            Reports
          </button>
          <button className="ms-nav-item">Analytics</button>
          <button className="ms-nav-item">Settings</button>
        </nav>

        <div className="ms-sidebar-footer">
          <span>{currentUser?.name || "User"}</span>
          <p>{currentUser?.email}</p>
          <button className="ms-ghost-btn logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="ms-main">
        <header className="ms-topbar">
          <div>
            <span className="ms-overline">{currentMeta.overline}</span>
            <h2>{currentMeta.title}</h2>
            <p className="ms-page-subtitle">{currentMeta.subtitle}</p>
          </div>

          <div className="ms-topbar-actions">
            <input
              className="ms-search"
              placeholder="Search transactions, categories or reports"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="ms-primary-btn" onClick={openCreateModal}>
              New Transaction
            </button>
          </div>
        </header>

        {renderPageContent()}

        <footer className="ms-footer">
          <span>Management System</span>
          <p>Premium financial operations workspace • Dark enterprise edition</p>
        </footer>
      </main>

      {isModalOpen && (
        <div className="ms-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="ms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ms-modal-header">
              <div>
                <span className="ms-card-label">
                  {editingId ? "Edit record" : "New record"}
                </span>
                <h3>{editingId ? "Edit Transaction" : "Create Transaction"}</h3>
              </div>
              <button
                className="ms-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form className="ms-form" onSubmit={handleCreateOrUpdateTransaction}>
              <div className="ms-form-field">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Ex: Enterprise license, payroll, hosting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="ms-form-grid">
                <div className="ms-form-field">
                  <label>Amount (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="ms-form-field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="ms-form-field">
                <label>Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.type === "INCOME" ? "Revenue" : "Expense"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="ms-modal-actions">
                <button
                  type="button"
                  className="ms-secondary-btn"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="ms-primary-btn">
                  {editingId ? "Save Changes" : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;