import { Platform } from "react-native";
import { DebtInput, ExpenseInput, SettingsInput } from "@/financeEngine/engine";

/**
 * URL base da API.
 * - Build web em Docker: EXPO_PUBLIC_API_URL="" (vazio) => caminhos relativos,
 *   e o nginx faz proxy de /api para o container da API.
 * - Desenvolvimento: aponta para a API local. Em dispositivo físico ou emulador
 *   Android, defina EXPO_PUBLIC_API_URL com o IP da sua máquina
 *   (ex.: http://192.168.0.10:3001).
 */
const envUrl = process.env.EXPO_PUBLIC_API_URL;
export const API_BASE_URL =
  envUrl !== undefined
    ? envUrl
    : Platform.OS === "android"
    ? "http://10.0.2.2:3001"
    : "http://localhost:3001";

export interface AppState {
  settings: SettingsInput;
  debts: DebtInput[];
  expenses: ExpenseInput[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API respondeu ${response.status} em ${path}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  getState: () => request<AppState>("/api/state"),

  updateSettings: (partial: Partial<SettingsInput>) =>
    request<SettingsInput>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(partial),
    }),

  addDebt: (debt: Omit<DebtInput, "id">) =>
    request<DebtInput>("/api/debts", {
      method: "POST",
      body: JSON.stringify(debt),
    }),

  updateDebt: (debt: DebtInput) =>
    request<DebtInput>(`/api/debts/${debt.id}`, {
      method: "PUT",
      body: JSON.stringify(debt),
    }),

  deleteDebt: (id: number) =>
    request<void>(`/api/debts/${id}`, { method: "DELETE" }),

  addExpense: (expense: Omit<ExpenseInput, "id">) =>
    request<ExpenseInput>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(expense),
    }),

  updateExpense: (expense: ExpenseInput) =>
    request<ExpenseInput>(`/api/expenses/${expense.id}`, {
      method: "PUT",
      body: JSON.stringify(expense),
    }),

  deleteExpense: (id: number) =>
    request<void>(`/api/expenses/${id}`, { method: "DELETE" }),
};
