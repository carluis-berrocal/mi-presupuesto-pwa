let budget = 0;
let period = "mensual";
let expenses = [];
let editingId = null;
let deferredPrompt = null;

// PWA Install
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("installBtn").classList.add("show");
});

document.getElementById("installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") {
    document.getElementById("installBtn").classList.remove("show");
  }
  deferredPrompt = null;
});

// Storage manager - usa window.storage si está disponible, sino memoria
const storage = {
  async get(key) {
    const value = localStorage.getItem(key);
    return value !== null ? { value } : null;
  },
  async set(key, value) {
    localStorage.setItem(key, value);
  },
  async delete(key) {
    localStorage.removeItem(key);
  },
};

// Load data on start
async function loadData() {
  try {
    const savedBudget = await storage.get("budget");
    const savedPeriod = await storage.get("period");
    const savedExpenses = await storage.get("expenses");

    if (savedBudget?.value) {
      budget = parseFloat(savedBudget.value);
      document.getElementById("budgetForm").classList.add("hidden");
      document.getElementById("budgetSummary").classList.remove("hidden");
      document.getElementById("expenseFormCard").classList.remove("hidden");
      document.getElementById("resetBtn").classList.remove("hidden");
    }
    if (savedPeriod?.value) {
      period = savedPeriod.value;
    }
    if (savedExpenses?.value) {
      expenses = JSON.parse(savedExpenses.value);
    }

    updateUI();
  } catch (error) {
    console.log("No hay datos guardados");
  }
}

async function saveBudget() {
  const budgetInput = document.getElementById("budgetAmount").value;
  const periodInput = document.getElementById("period").value;

  if (!budgetInput || parseFloat(budgetInput) <= 0) {
    showAlert("El presupuesto debe ser mayor a 0", "error");
    return;
  }

  budget = parseFloat(budgetInput);
  period = periodInput;

  try {
    await storage.set("budget", budget.toString());
    await storage.set("period", period);

    document.getElementById("budgetForm").classList.add("hidden");
    document.getElementById("budgetSummary").classList.remove("hidden");
    document.getElementById("expenseFormCard").classList.remove("hidden");
    document.getElementById("resetBtn").classList.remove("hidden");

    updateUI();
    showAlert(`Presupuesto ${period} establecido correctamente`, "success");
  } catch (error) {
    console.error("Error guardando:", error);
  }
}

function editBudget() {
  document.getElementById("budgetForm").classList.remove("hidden");
  document.getElementById("budgetSummary").classList.add("hidden");
  document.getElementById("budgetAmount").value = budget;
  document.getElementById("period").value = period;
}

async function addOrUpdateExpense() {
  const name = document.getElementById("expenseName").value.trim();
  const amount = document.getElementById("expenseAmount").value;

  if (!name || !amount) {
    showAlert("Completa todos los campos", "error");
    return;
  }

  const amountNum = parseFloat(amount);
  if (amountNum <= 0) {
    showAlert("El monto debe ser mayor a 0", "error");
    return;
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = budget - totalExpenses;

  if (editingId === null && amountNum > remaining && remaining > 0) {
    showAlert(
      `⚠️ El valor a ingresar (${amountNum.toLocaleString()}) supera lo que te queda de presupuesto (${remaining.toLocaleString()})`,
      "warning",
    );
    return;
  }

  try {
    if (editingId !== null) {
      expenses = expenses.map((exp) =>
        exp.id === editingId ? { ...exp, name, amount: amountNum } : exp,
      );
      showAlert("Gasto actualizado", "success");
      editingId = null;
    } else {
      const newExpense = {
        id: Date.now(),
        name,
        amount: amountNum,
        date: new Date().toLocaleDateString("es-ES"),
      };
      expenses.push(newExpense);
      showAlert("Gasto agregado", "success");
    }

    await storage.set("expenses", JSON.stringify(expenses));
    document.getElementById("expenseName").value = "";
    document.getElementById("expenseAmount").value = "";
    updateUI();
  } catch (error) {
    console.error("Error guardando gasto:", error);
  }
}

async function deleteExpense(id) {
  try {
    expenses = expenses.filter((exp) => exp.id !== id);
    await storage.set("expenses", JSON.stringify(expenses));
    updateUI();
    showAlert("Gasto eliminado", "success");
  } catch (error) {
    console.error("Error eliminando:", error);
  }
}

function editExpense(id) {
  const expense = expenses.find((exp) => exp.id === id);
  if (expense) {
    document.getElementById("expenseName").value = expense.name;
    document.getElementById("expenseAmount").value = expense.amount;
    editingId = id;

    document.getElementById("expenseFormTitle").textContent = "Editar Gasto";
    document.getElementById("expenseButtons").innerHTML = `
                    <button class="btn-blue" onclick="addOrUpdateExpense()">
                        <svg width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Actualizar
                    </button>
                    <button class="btn-cancel" onclick="cancelEdit()">
                        <svg width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Cancelar
                    </button>
                `;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function cancelEdit() {
  editingId = null;
  document.getElementById("expenseName").value = "";
  document.getElementById("expenseAmount").value = "";
  document.getElementById("expenseFormTitle").textContent = "Agregar Gasto";
  document.getElementById("expenseButtons").innerHTML = `
                <button class="btn-blue" onclick="addOrUpdateExpense()">
                    <svg width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Agregar
                </button>
            `;
}

async function resetAll() {
  if (confirm("¿Estás seguro de que quieres resetear todo?")) {
    try {
      await storage.delete("budget");
      await storage.delete("period");
      await storage.delete("expenses");

      budget = 0;
      period = "mensual";
      expenses = [];
      editingId = null;

      document.getElementById("budgetForm").classList.remove("hidden");
      document.getElementById("budgetSummary").classList.add("hidden");
      document.getElementById("expenseFormCard").classList.add("hidden");
      document.getElementById("expensesCard").classList.add("hidden");
      document.getElementById("resetBtn").classList.add("hidden");

      document.getElementById("budgetAmount").value = "";
      document.getElementById("period").value = "mensual";
      cancelEdit();

      showAlert("Todo ha sido reseteado", "success");
    } catch (error) {
      console.error("Error reseteando:", error);
    }
  }
}

function updateUI() {
  // Update budget summary
  document.getElementById("budgetPeriodTitle").textContent =
    `Presupuesto ${period}`;
  document.getElementById("budgetTotal").textContent =
    `${budget.toLocaleString()}`;

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const remaining = budget - totalExpenses;
  const percentage = budget > 0 ? (remaining / budget) * 100 : 0;

  // Update remaining
  const remainingEl = document.getElementById("budgetRemaining");
  remainingEl.textContent =
    remaining >= 0
      ? `Restante: ${remaining.toLocaleString()}`
      : `Excedido: ${Math.abs(remaining).toLocaleString()}`;

  // Update colors based on percentage
  let colorClass = "green";
  let cardClass = "green";
  if (percentage <= 50 && percentage > 20) {
    colorClass = "orange";
    cardClass = "orange";
  } else if (percentage <= 20) {
    colorClass = "red";
    cardClass = "red";
  }

  remainingEl.className = `budget-remaining ${colorClass}`;
  document.getElementById("budgetSummary").className = `card ${cardClass}`;

  // Update progress bar
  const progressFill = document.getElementById("progressFill");
  progressFill.className = `progress-fill ${colorClass}`;
  progressFill.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`;
  document.getElementById("progressText").textContent =
    `${percentage.toFixed(1)}% disponible`;

  // Update expenses list
  const expensesList = document.getElementById("expensesList");
  if (expenses.length > 0) {
    document.getElementById("expensesCard").classList.remove("hidden");
    expensesList.innerHTML = expenses
      .map(
        (expense) => `
                    <div class="expense-item">
                        <div class="expense-header">
                            <div>
                                <div class="expense-name">${expense.name}</div>
                                <div class="expense-date">${expense.date}</div>
                            </div>
                            <div class="expense-amount">${expense.amount.toLocaleString()}</div>
                        </div>
                        <div class="btn-group">
                            <button class="btn-edit" onclick="editExpense(${expense.id})">
                                <svg width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Editar
                            </button>
                            <button class="btn-delete" onclick="deleteExpense(${expense.id})">
                                <svg width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Eliminar
                            </button>
                        </div>
                    </div>
                `,
      )
      .join("");

    document.getElementById("totalExpenses").textContent =
      `${totalExpenses.toLocaleString()}`;
  } else {
    document.getElementById("expensesCard").classList.add("hidden");
  }
}

function showAlert(message, type) {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert ${type}`;

  const icon =
    type === "success"
      ? '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      : type === "error"
        ? '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
        : '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';

  alertDiv.innerHTML = `${icon}<span>${message}</span>`;
  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, 4000);
}

// Enter key support
document.getElementById("budgetAmount").addEventListener("keypress", (e) => {
  if (e.key === "Enter") saveBudget();
});

document.getElementById("expenseAmount").addEventListener("keypress", (e) => {
  if (e.key === "Enter") addOrUpdateExpense();
});

// Load data on page load
loadData();
