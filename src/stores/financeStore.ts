import { create } from "zustand";
import { api } from "../services/api";
import { calcularProjecao, ProjecaoMes, DebtInput, ExpenseInput, SettingsInput } from "../financeEngine/engine";

interface FinanceState {
  settings: SettingsInput | null;
  debts: DebtInput[];
  expenses: ExpenseInput[];
  projection: ProjecaoMes[];
  initialized: boolean;
  isFallback: boolean;

  initialize: () => Promise<void>;
  updateSettings: (salary: number, monthlyInvestment: number, initialSavings: number, creditCardBill: number) => Promise<void>;
  updateSavingsOverride: (monthYearLabel: string, value: number | null) => Promise<void>;
  updateThemeMode: (mode: 'dark' | 'light') => Promise<void>;
  addDebt: (debt: Omit<DebtInput, "id">) => Promise<void>;
  updateDebt: (debt: DebtInput) => Promise<void>;
  deleteDebt: (id: number) => Promise<void>;
  addExpense: (expense: Omit<ExpenseInput, "id">) => Promise<void>;
  updateExpense: (expense: ExpenseInput) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
}

function persistFallback(key: string, value: unknown) {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  settings: null,
  debts: [],
  expenses: [],
  projection: [],
  initialized: false,
  isFallback: false,

  initialize: async () => {
    try {
      const state = await api.getState();

      const currentSettings: SettingsInput = {
        salary: state.settings.salary,
        monthlyInvestment: state.settings.monthlyInvestment,
        initialSavings: state.settings.initialSavings,
        savingsOverrides: state.settings.savingsOverrides || "{}",
        themeMode: state.settings.themeMode || "dark",
        creditCardBill: state.settings.creditCardBill || 0,
      };

      const proj = calcularProjecao(currentSettings, state.debts, state.expenses);

      set({
        settings: currentSettings,
        debts: state.debts,
        expenses: state.expenses,
        projection: proj,
        initialized: true,
        isFallback: false,
      });
    } catch (err) {
      console.warn("API PostgreSQL indisponível, usando LocalStorage como fallback:", err);

      let currentSettings: SettingsInput = { salary: 0, monthlyInvestment: 0, initialSavings: 0, savingsOverrides: "{}", themeMode: "dark", creditCardBill: 0 };
      let mappedDebts: DebtInput[] = [];
      let mappedExpenses: ExpenseInput[] = [];

      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const storedSettings = window.localStorage.getItem("finance_settings");
          if (storedSettings) {
            currentSettings = { themeMode: "dark", creditCardBill: 0, ...JSON.parse(storedSettings) };
          }

          const storedDebts = window.localStorage.getItem("finance_debts");
          if (storedDebts) mappedDebts = JSON.parse(storedDebts);

          const storedExpenses = window.localStorage.getItem("finance_expenses");
          if (storedExpenses) mappedExpenses = JSON.parse(storedExpenses);
        } catch (e) {
          console.error("Erro ao ler dados do LocalStorage:", e);
        }
      }

      const proj = calcularProjecao(currentSettings, mappedDebts, mappedExpenses);

      set({
        settings: currentSettings,
        debts: mappedDebts,
        expenses: mappedExpenses,
        projection: proj,
        initialized: true,
        isFallback: true,
      });
    }
  },

  updateSettings: async (salary, monthlyInvestment, initialSavings, creditCardBill) => {
    const state = get();
    if (!state.initialized) return;

    const savingsOverrides = state.settings?.savingsOverrides || "{}";
    const themeMode = state.settings?.themeMode || "dark";
    const newSettings = { salary, monthlyInvestment, initialSavings, savingsOverrides, themeMode, creditCardBill };
    const proj = calcularProjecao(newSettings, state.debts, state.expenses);

    if (state.isFallback) {
      persistFallback("finance_settings", newSettings);
      set({ settings: newSettings, projection: proj });
      return;
    }

    await api.updateSettings({ salary, monthlyInvestment, initialSavings, creditCardBill });

    set({ settings: newSettings, projection: proj });
  },

  updateSavingsOverride: async (monthYearLabel, value) => {
    const state = get();
    if (!state.initialized || !state.settings) return;

    let overridesObj: Record<string, number> = {};
    try {
      overridesObj = JSON.parse(state.settings.savingsOverrides || "{}");
    } catch (e) {
      console.error("Erro ao fazer parse dos overrides:", e);
    }

    if (value === null) {
      delete overridesObj[monthYearLabel];
    } else {
      overridesObj[monthYearLabel] = value;
    }

    const newOverridesStr = JSON.stringify(overridesObj);
    const newSettings = {
      ...state.settings,
      savingsOverrides: newOverridesStr,
    };

    const proj = calcularProjecao(newSettings, state.debts, state.expenses);

    if (state.isFallback) {
      persistFallback("finance_settings", newSettings);
      set({ settings: newSettings, projection: proj });
      return;
    }

    await api.updateSettings({ savingsOverrides: newOverridesStr });

    set({ settings: newSettings, projection: proj });
  },

  updateThemeMode: async (mode) => {
    const state = get();
    if (!state.initialized || !state.settings) return;

    const newSettings = {
      ...state.settings,
      themeMode: mode,
    };

    const proj = calcularProjecao(newSettings, state.debts, state.expenses);

    if (state.isFallback) {
      persistFallback("finance_settings", newSettings);
      set({ settings: newSettings, projection: proj });
      return;
    }

    await api.updateSettings({ themeMode: mode });

    set({ settings: newSettings, projection: proj });
  },

  addDebt: async (newDebt) => {
    const state = get();
    if (!state.initialized || !state.settings) return;

    let mapped: DebtInput;

    if (state.isFallback) {
      mapped = { ...newDebt, id: Date.now() + Math.floor(Math.random() * 1000) };
    } else {
      mapped = await api.addDebt(newDebt);
    }

    const newDebts = [...state.debts, mapped];
    if (state.isFallback) persistFallback("finance_debts", newDebts);

    const proj = calcularProjecao(state.settings, newDebts, state.expenses);
    set({ debts: newDebts, projection: proj });
  },

  updateDebt: async (updatedDebt) => {
    const state = get();
    if (!state.initialized || !state.settings) return;

    const newDebts = state.debts.map(d => d.id === updatedDebt.id ? updatedDebt : d);
    const proj = calcularProjecao(state.settings, newDebts, state.expenses);

    if (state.isFallback) {
      persistFallback("finance_debts", newDebts);
      set({ debts: newDebts, projection: proj });
      return;
    }

    await api.updateDebt(updatedDebt);

    set({ debts: newDebts, projection: proj });
  },

  deleteDebt: async (id) => {
    const state = get();
    if (!state.initialized || !state.settings) return;

    // As despesas vinculadas são removidas em cascata no banco
    const newDebts = state.debts.filter(d => d.id !== id);
    const newExpenses = state.expenses.filter(e => e.debtId !== id);
    const proj = calcularProjecao(state.settings, newDebts, newExpenses);

    if (state.isFallback) {
      persistFallback("finance_debts", newDebts);
      persistFallback("finance_expenses", newExpenses);
      set({ debts: newDebts, expenses: newExpenses, projection: proj });
      return;
    }

    await api.deleteDebt(id);

    set({ debts: newDebts, expenses: newExpenses, projection: proj });
  },

  addExpense: async (newExp) => {
    const state = get();
    if (!state.initialized || !state.settings) return;

    let mapped: ExpenseInput;

    if (state.isFallback) {
      mapped = { ...newExp, id: Date.now() + Math.floor(Math.random() * 1000) };
    } else {
      mapped = await api.addExpense(newExp);
    }

    const newExpenses = [...state.expenses, mapped];
    if (state.isFallback) persistFallback("finance_expenses", newExpenses);

    const proj = calcularProjecao(state.settings, state.debts, newExpenses);
    set({ expenses: newExpenses, projection: proj });
  },

  updateExpense: async (updatedExp) => {
    const state = get();
    if (!state.initialized || !state.settings) return;

    const newExpenses = state.expenses.map(e => e.id === updatedExp.id ? updatedExp : e);
    const proj = calcularProjecao(state.settings, state.debts, newExpenses);

    if (state.isFallback) {
      persistFallback("finance_expenses", newExpenses);
      set({ expenses: newExpenses, projection: proj });
      return;
    }

    await api.updateExpense(updatedExp);

    set({ expenses: newExpenses, projection: proj });
  },

  deleteExpense: async (id) => {
    const state = get();
    if (!state.initialized || !state.settings) return;

    const newExpenses = state.expenses.filter(e => e.id !== id);
    const proj = calcularProjecao(state.settings, state.debts, newExpenses);

    if (state.isFallback) {
      persistFallback("finance_expenses", newExpenses);
      set({ expenses: newExpenses, projection: proj });
      return;
    }

    await api.deleteExpense(id);

    set({ expenses: newExpenses, projection: proj });
  },
}));
