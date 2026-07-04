import cors from "cors";
import express from "express";
import { initializeDatabase, pool } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT || "3001", 10);

// --- Mapeadores snake_case (banco) -> camelCase (app) ---

function mapSettings(row) {
  return {
    salary: row.salary,
    monthlyInvestment: row.monthly_investment,
    initialSavings: row.initial_savings,
    savingsOverrides: row.savings_overrides || "{}",
    themeMode: row.theme_mode || "dark",
    creditCardBill: row.credit_card_bill || 0,
  };
}

function mapDebt(row) {
  return {
    id: row.id,
    name: row.name,
    installmentValue: row.installment_value,
    totalInstallments: row.total_installments,
    remainingInstallments: row.remaining_installments,
    nextDueDate: row.next_due_date,
    category: row.category,
    active: row.active,
    isCreditCard: row.is_credit_card,
    startDate: row.start_date,
  };
}

function mapExpense(row) {
  return {
    id: row.id,
    name: row.name,
    value: row.value,
    dueDate: row.due_date,
    active: row.active,
    isRecurring: row.is_recurring,
    debtId: row.debt_id,
    isCreditCard: row.is_credit_card,
  };
}

async function getOrCreateSettings() {
  const existing = await pool.query("SELECT * FROM settings ORDER BY id LIMIT 1");
  if (existing.rows.length > 0) return existing.rows[0];
  const inserted = await pool.query("INSERT INTO settings DEFAULT VALUES RETURNING *");
  return inserted.rows[0];
}

// Envolve handlers async para propagar erros ao middleware de erro
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Estado completo para o bootstrap do app
app.get("/api/state", wrap(async (_req, res) => {
  const settingsRow = await getOrCreateSettings();
  const debts = await pool.query("SELECT * FROM debts ORDER BY id");
  const expenses = await pool.query("SELECT * FROM expenses ORDER BY id");
  res.json({
    settings: mapSettings(settingsRow),
    debts: debts.rows.map(mapDebt),
    expenses: expenses.rows.map(mapExpense),
  });
}));

// Atualização parcial das configurações
app.put("/api/settings", wrap(async (req, res) => {
  const current = await getOrCreateSettings();
  const b = req.body || {};
  const updated = await pool.query(
    `UPDATE settings SET
       salary = $1,
       monthly_investment = $2,
       initial_savings = $3,
       savings_overrides = $4,
       theme_mode = $5,
       credit_card_bill = $6
     WHERE id = $7 RETURNING *`,
    [
      b.salary ?? current.salary,
      b.monthlyInvestment ?? current.monthly_investment,
      b.initialSavings ?? current.initial_savings,
      b.savingsOverrides ?? current.savings_overrides,
      b.themeMode ?? current.theme_mode,
      b.creditCardBill ?? current.credit_card_bill,
      current.id,
    ]
  );
  res.json(mapSettings(updated.rows[0]));
}));

app.post("/api/debts", wrap(async (req, res) => {
  const b = req.body || {};
  const inserted = await pool.query(
    `INSERT INTO debts
       (name, installment_value, total_installments, remaining_installments,
        next_due_date, category, active, is_credit_card, start_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      b.name,
      b.installmentValue,
      b.totalInstallments,
      b.remainingInstallments,
      b.nextDueDate ?? null,
      b.category ?? null,
      b.active ?? true,
      b.isCreditCard ?? false,
      b.startDate ?? null,
    ]
  );
  res.status(201).json(mapDebt(inserted.rows[0]));
}));

app.put("/api/debts/:id", wrap(async (req, res) => {
  const b = req.body || {};
  const updated = await pool.query(
    `UPDATE debts SET
       name = $1, installment_value = $2, total_installments = $3,
       remaining_installments = $4, next_due_date = $5, category = $6,
       active = $7, is_credit_card = $8, start_date = $9
     WHERE id = $10 RETURNING *`,
    [
      b.name,
      b.installmentValue,
      b.totalInstallments,
      b.remainingInstallments,
      b.nextDueDate ?? null,
      b.category ?? null,
      b.active ?? true,
      b.isCreditCard ?? false,
      b.startDate ?? null,
      parseInt(req.params.id, 10),
    ]
  );
  if (updated.rows.length === 0) return res.status(404).json({ error: "Dívida não encontrada" });
  res.json(mapDebt(updated.rows[0]));
}));

app.delete("/api/debts/:id", wrap(async (req, res) => {
  // ON DELETE CASCADE remove as despesas vinculadas automaticamente
  await pool.query("DELETE FROM debts WHERE id = $1", [parseInt(req.params.id, 10)]);
  res.status(204).end();
}));

app.post("/api/expenses", wrap(async (req, res) => {
  const b = req.body || {};
  const inserted = await pool.query(
    `INSERT INTO expenses
       (name, value, due_date, active, is_recurring, debt_id, is_credit_card)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      b.name,
      b.value,
      b.dueDate ?? null,
      b.active ?? true,
      b.isRecurring ?? true,
      b.debtId ?? null,
      b.isCreditCard ?? false,
    ]
  );
  res.status(201).json(mapExpense(inserted.rows[0]));
}));

app.put("/api/expenses/:id", wrap(async (req, res) => {
  const b = req.body || {};
  const updated = await pool.query(
    `UPDATE expenses SET
       name = $1, value = $2, due_date = $3, active = $4,
       is_recurring = $5, debt_id = $6, is_credit_card = $7
     WHERE id = $8 RETURNING *`,
    [
      b.name,
      b.value,
      b.dueDate ?? null,
      b.active ?? true,
      b.isRecurring ?? true,
      b.debtId ?? null,
      b.isCreditCard ?? false,
      parseInt(req.params.id, 10),
    ]
  );
  if (updated.rows.length === 0) return res.status(404).json({ error: "Gasto não encontrado" });
  res.json(mapExpense(updated.rows[0]));
}));

app.delete("/api/expenses/:id", wrap(async (req, res) => {
  await pool.query("DELETE FROM expenses WHERE id = $1", [parseInt(req.params.id, 10)]);
  res.status(204).end();
}));

app.use((err, _req, res, _next) => {
  console.error("Erro na API:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Finanças Pro API ouvindo na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Não foi possível conectar ao banco de dados:", err);
    process.exit(1);
  });
