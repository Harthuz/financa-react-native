import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://finance:finance@localhost:5432/finance",
});

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    salary DOUBLE PRECISION NOT NULL DEFAULT 0,
    monthly_investment DOUBLE PRECISION NOT NULL DEFAULT 0,
    initial_savings DOUBLE PRECISION NOT NULL DEFAULT 0,
    savings_overrides TEXT NOT NULL DEFAULT '{}',
    theme_mode TEXT NOT NULL DEFAULT 'dark',
    credit_card_bill DOUBLE PRECISION NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS debts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    installment_value DOUBLE PRECISION NOT NULL,
    total_installments INTEGER NOT NULL,
    remaining_installments INTEGER NOT NULL,
    next_due_date TEXT,
    category TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    is_credit_card BOOLEAN NOT NULL DEFAULT FALSE,
    start_date TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    due_date INTEGER,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
    debt_id INTEGER REFERENCES debts(id) ON DELETE CASCADE,
    is_credit_card BOOLEAN NOT NULL DEFAULT FALSE
  );
`;

// O Postgres pode ainda estar subindo quando a API inicia; tenta com backoff.
export async function initializeDatabase(retries = 15, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query(SCHEMA_SQL);
      console.log("Banco de dados pronto.");
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`Aguardando o Postgres (${attempt}/${retries})...`, err.code || err.message);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
