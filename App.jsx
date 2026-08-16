import { useEffect, useMemo, useRef, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { fetchExpenses } from "./api";
import "./App.css";

const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Other",
];

const CHART_COLORS = [
  "#5b3cc4",
  "#f0a500",
  "#22c55e",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
];

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

function App() {
  // =========================
  // FORM STATES
  // =========================

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(getToday());

  // =========================
  // EXPENSE STATES
  // =========================

  const [expenses, setExpenses] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // =========================
  // FILTER STATES
  // =========================

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");

  // =========================
  // BUDGET
  // =========================

  const [monthlyBudget, setMonthlyBudget] = useState(() => {
    return Number(localStorage.getItem("monthlyBudget") || 0);
  });

  const [budgetInput, setBudgetInput] = useState("");

  // =========================
  // DARK MODE
  // =========================

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("darkMode") === "true";
  });

  // =========================
  // REF
  // =========================

  const titleInputRef = useRef(null);

  // =========================
  // LOAD DATA
  // =========================

  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const saved = localStorage.getItem("expenses");

        if (saved) {
          const parsed = JSON.parse(saved);

          const cleaned = parsed.map((expense) => ({
            ...expense,
            id: expense.id || Date.now() + Math.random(),
            title: expense.title || "Untitled",
            amount: Number(expense.amount) || 0,
            category: expense.category || "Other",
            date: expense.date || getToday(),
          }));

          setExpenses(cleaned);
          return;
        }

        const data = await fetchExpenses();

        const cleaned = Array.isArray(data)
          ? data.map((expense) => ({
              ...expense,
              id: expense.id || Date.now() + Math.random(),
              title: expense.title || "Untitled",
              amount: Number(expense.amount) || 0,
              category: expense.category || "Other",
              date: expense.date || getToday(),
            }))
          : [];

        setExpenses(cleaned);
      } catch (error) {
        console.error("Failed to load expenses:", error);
        setExpenses([]);
      }
    };

    loadExpenses();
  }, []);

  // =========================
  // SAVE EXPENSES
  // =========================

  useEffect(() => {
    localStorage.setItem("expenses", JSON.stringify(expenses));
  }, [expenses]);

  // =========================
  // SAVE BUDGET
  // =========================

  useEffect(() => {
    localStorage.setItem("monthlyBudget", String(monthlyBudget));
  }, [monthlyBudget]);

  // =========================
  // SAVE DARK MODE
  // =========================

  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  // =========================
  // CURRENT MONTH
  // =========================

  const currentMonth = new Date()
    .toISOString()
    .slice(0, 7);

  // =========================
  // TOTAL EXPENSE
  // =========================

  const totalExpenses = useMemo(() => {
    return expenses.reduce(
      (total, expense) => total + Number(expense.amount || 0),
      0
    );
  }, [expenses]);

  // =========================
  // MONTHLY EXPENSE
  // =========================

  const monthlyTotal = useMemo(() => {
    return expenses
      .filter(
        (expense) =>
          expense.date?.slice(0, 7) === currentMonth
      )
      .reduce(
        (total, expense) => total + Number(expense.amount || 0),
        0
      );
  }, [expenses, currentMonth]);

  // =========================
  // HIGHEST EXPENSE
  // =========================

  const highestExpense = useMemo(() => {
    if (expenses.length === 0) return 0;

    return Math.max(
      ...expenses.map((expense) =>
        Number(expense.amount || 0)
      )
    );
  }, [expenses]);

  // =========================
  // BUDGET
  // =========================

  const budgetRemaining = Math.max(
    monthlyBudget - monthlyTotal,
    0
  );

  const budgetPercentage =
    monthlyBudget > 0
      ? Math.min(
          (monthlyTotal / monthlyBudget) * 100,
          100
        )
      : 0;

  const budgetExceeded =
    monthlyBudget > 0 &&
    monthlyTotal > monthlyBudget;

  // =========================
  // AVAILABLE MONTHS
  // =========================

  const availableMonths = useMemo(() => {
    const months = expenses
      .map((expense) => expense.date?.slice(0, 7))
      .filter(Boolean);

    return [...new Set(months)].sort().reverse();
  }, [expenses]);

  // =========================
  // FILTERED EXPENSES
  // =========================

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const titleText = String(expense.title || "");

      const matchesSearch = titleText
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesCategory =
        filterCategory === "All" ||
        expense.category === filterCategory;

      const matchesMonth =
        filterMonth === "All" ||
        expense.date?.slice(0, 7) === filterMonth;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesMonth
      );
    });
  }, [
    expenses,
    searchTerm,
    filterCategory,
    filterMonth,
  ]);

  // =========================
  // CHART DATA
  // =========================

  const categoryData = useMemo(() => {
    return CATEGORIES.map((categoryName) => {
      const total = expenses
        .filter(
          (expense) =>
            expense.category === categoryName
        )
        .reduce(
          (sum, expense) =>
            sum + Number(expense.amount || 0),
          0
        );

      return {
        name: categoryName,
        value: total,
      };
    }).filter((item) => item.value > 0);
  }, [expenses]);

  // =========================
  // ADD EXPENSE
  // =========================

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter expense title.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (!date) {
      alert("Please select a date.");
      return;
    }

    // UPDATE
    if (editingId !== null) {
      setExpenses((current) =>
        current.map((expense) =>
          expense.id === editingId
            ? {
                ...expense,
                title: title.trim(),
                amount: Number(amount),
                category,
                date,
              }
            : expense
        )
      );

      setEditingId(null);
    }

    // ADD
    else {
      const newExpense = {
        id: Date.now(),
        title: title.trim(),
        amount: Number(amount),
        category,
        date,
      };

      setExpenses((current) => [
        ...current,
        newExpense,
      ]);
    }

    resetForm();
  };

  // =========================
  // RESET FORM
  // =========================

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setCategory("Food");
    setDate(getToday());
    setEditingId(null);

    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);
  };

  // =========================
  // EDIT
  // =========================

  const editExpense = (expense) => {
    setEditingId(expense.id);
    setTitle(expense.title || "");
    setAmount(String(expense.amount || ""));
    setCategory(expense.category || "Other");
    setDate(expense.date || getToday());

    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 0);
  };

  // =========================
  // DELETE
  // =========================

  const deleteExpense = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmed) return;

    setExpenses((current) =>
      current.filter((expense) => expense.id !== id)
    );
  };

  // =========================
  // SAVE BUDGET
  // =========================

  const handleBudgetSubmit = (e) => {
    e.preventDefault();

    const budget = Number(budgetInput);

    if (!budget || budget <= 0) {
      alert("Please enter a valid monthly budget.");
      return;
    }

    setMonthlyBudget(budget);
    setBudgetInput("");
  };

  // =========================
  // DARK MODE
  // =========================

  const toggleDarkMode = () => {
    setDarkMode((current) => !current);
  };

  // =========================
  // FORMAT DATE
  // =========================

  const formatDate = (dateString) => {
    if (!dateString) return "";

    const dateObject = new Date(
      `${dateString}T00:00:00`
    );

    return dateObject.toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // =========================
  // UI
  // =========================

  return (
    <div className={`app ${darkMode ? "dark-mode" : ""}`}>
      <div className="expense-container">

        {/* HEADER */}

        <h1>Expense Tracker</h1>

        <p className="subtitle">
          Manage your daily expenses
        </p>

        <button
          type="button"
          className="theme-btn"
          onClick={toggleDarkMode}
        >
          {darkMode
            ? "☀️ Light Mode"
            : "🌙 Dark Mode"}
        </button>

        {/* SUMMARY */}

        <div className="summary-cards">

          <div className="summary-card">
            <span>Total Expenses</span>
            <h2>₨{totalExpenses.toLocaleString()}</h2>
          </div>

          <div className="summary-card">
            <span>This Month</span>
            <h2>₨{monthlyTotal.toLocaleString()}</h2>
          </div>

          <div className="summary-card">
            <span>Highest Expense</span>
            <h2>₨{highestExpense.toLocaleString()}</h2>
          </div>

        </div>

        {/* BUDGET */}

        <div className="budget-card">

          <h3>💰 Monthly Budget</h3>

          <form
            className="budget-form"
            onSubmit={handleBudgetSubmit}
          >
            <input
              type="number"
              min="1"
              placeholder={
                monthlyBudget
                  ? `Current: ₨${monthlyBudget}`
                  : "Enter monthly budget"
              }
              value={budgetInput}
              onChange={(e) =>
                setBudgetInput(e.target.value)
              }
            />

            <button type="submit">
              Set Budget
            </button>
          </form>

          {monthlyBudget > 0 ? (
            <div className="budget-details">

              <div className="budget-row">
                <span>Monthly Budget</span>
                <strong>
                  ₨{monthlyBudget.toLocaleString()}
                </strong>
              </div>

              <div className="budget-row">
                <span>Spent This Month</span>
                <strong>
                  ₨{monthlyTotal.toLocaleString()}
                </strong>
              </div>

              <div className="budget-row">
                <span>Remaining</span>
                <strong
                  className={
                    budgetExceeded
                      ? "danger-text"
                      : ""
                  }
                >
                  ₨
                  {budgetExceeded
                    ? (
                        monthlyTotal -
                        monthlyBudget
                      ).toLocaleString()
                    : budgetRemaining.toLocaleString()}
                </strong>
              </div>

              <div className="budget-progress">
                <div
                  className={`budget-progress-bar ${
                    budgetExceeded
                      ? "budget-danger"
                      : ""
                  }`}
                  style={{
                    width: `${budgetPercentage}%`,
                  }}
                />
              </div>

              <p className="budget-percentage">
                {Math.round(budgetPercentage)}%
                {" "}of budget used
              </p>

              {budgetExceeded && (
                <div className="budget-warning">
                  ⚠️ Budget exceeded by ₨
                  {(
                    monthlyTotal -
                    monthlyBudget
                  ).toLocaleString()}
                </div>
              )}

              {!budgetExceeded &&
                budgetPercentage >= 80 && (
                  <div className="budget-warning">
                    ⚠️ You have used more than
                    80% of your budget.
                  </div>
                )}

              {!budgetExceeded &&
                budgetPercentage < 80 && (
                  <div className="budget-success">
                    ✅ You are within your
                    monthly budget.
                  </div>
                )}

            </div>
          ) : (
            <p className="budget-empty">
              Set a monthly budget to track
              your spending.
            </p>
          )}

        </div>

        {/* ANALYTICS */}

        <div className="analytics-card">

          <h3>📊 Expense Analytics</h3>

          {categoryData.length === 0 ? (
            <p className="empty-message">
              Add expenses to see analytics.
            </p>
          ) : (
            <div className="chart-container">

              <ResponsiveContainer
                width="100%"
                height={320}
              >
                <PieChart>

                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {categoryData.map(
                      (entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            CHART_COLORS[
                              index %
                                CHART_COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip
                    formatter={(value) =>
                      `₨${Number(value).toLocaleString()}`
                    }
                  />

                  <Legend />

                </PieChart>
              </ResponsiveContainer>

            </div>
          )}

        </div>

        {/* FORM */}

        <form
          className="expense-form"
          onSubmit={handleSubmit}
        >

          <label>Expense Title</label>

          <input
            ref={titleInputRef}
            type="text"
            placeholder="Expense title"
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
          />

          <label>Amount (PKR)</label>

          <input
            type="number"
            min="1"
            placeholder="Enter amount in PKR"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value)
            }
          />

          <label>Category</label>

          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
          >
            {CATEGORIES.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          <label>Expense Date</label>

          <input
            type="date"
            value={date}
            onChange={(e) =>
              setDate(e.target.value)
            }
          />

          <button type="submit">
            {editingId !== null
              ? "Update Expense"
              : "Add Expense"}
          </button>

          {editingId !== null && (
            <button
              type="button"
              className="cancel-btn"
              onClick={resetForm}
            >
              Cancel Edit
            </button>
          )}

        </form>

        {/* FILTERS */}

        <div className="filters">

          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
          />

          <select
            value={filterCategory}
            onChange={(e) =>
              setFilterCategory(e.target.value)
            }
          >
            <option value="All">
              All Categories
            </option>

            {CATEGORIES.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          <select
            value={filterMonth}
            onChange={(e) =>
              setFilterMonth(e.target.value)
            }
          >
            <option value="All">
              All Months
            </option>

            {availableMonths.map((month) => (
              <option
                key={month}
                value={month}
              >
                {new Date(
                  `${month}-01T00:00:00`
                ).toLocaleDateString("en-PK", {
                  month: "long",
                  year: "numeric",
                })}
              </option>
            ))}
          </select>

        </div>

        {/* EXPENSE LIST */}

        <div className="expense-list">

          <h3>Recent Expenses</h3>

          {filteredExpenses.length === 0 ? (
            <p className="empty-message">
              {expenses.length === 0
                ? "No expenses yet."
                : "No matching expenses found."}
            </p>
          ) : (
            filteredExpenses.map((expense) => (

              <div
                className="expense-item"
                key={expense.id}
              >

                <div className="expense-info">

                  <strong>
                    {expense.title}
                  </strong>

                  <small>
                    {expense.category}
                  </small>

                  <small>
                    📅 {formatDate(expense.date)}
                  </small>

                </div>

                <div className="expense-actions">

                  <strong>
                    ₨
                    {Number(
                      expense.amount
                    ).toLocaleString()}
                  </strong>

                  <button
                    type="button"
                    className="edit-btn"
                    onClick={() =>
                      editExpense(expense)
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() =>
                      deleteExpense(expense.id)
                    }
                  >
                    Delete
                  </button>

                </div>

              </div>

            ))
          )}

        </div>

      </div>
    </div>
  );
}

export default App;