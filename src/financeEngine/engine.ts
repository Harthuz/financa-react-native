import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DebtInput {
  id: number;
  name: string;
  installmentValue: number;
  totalInstallments: number;
  remainingInstallments: number;
  nextDueDate?: string | null;
  category?: string | null;
  active: boolean;
  isCreditCard?: boolean;
  startDate?: string | null; // Data inicial da compra (AAAA-MM-DD)
}

export interface ExpenseInput {
  id: number;
  name: string;
  value: number;
  dueDate?: number | null;
  active: boolean;
  isRecurring: boolean;
  debtId?: number | null;
  isCreditCard?: boolean;
}

export interface SettingsInput {
  salary: number;
  monthlyInvestment: number;
  initialSavings: number;
  savingsOverrides?: string; // JSON string formatada, ex: '{"Jul/2026": 800}'
  themeMode?: string; // 'dark' | 'light'
  creditCardBill?: number; // Fatura avulsa configurada
}

export interface MonthDetailItem {
  name: string;
  value: number;
  type: "income" | "investment" | "expense" | "debt";
  remainingInstallments?: number;
}

export interface ProjecaoMes {
  monthLabel: string;       // ex: "Julho"
  monthYearLabel: string;   // ex: "Jul/2026"
  year: number;
  savings: number;
  debtsRemaining: number;
  netWorth: number;
  revenue: number;
  monthlyInvestment: number;
  expensesTotal: number;
  items: MonthDetailItem[];
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTHS_SHORT_PT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

/**
 * Motor Financeiro - Lógica pura de cálculo de projeções financeiras
 */
export function calcularProjecao(
  settings: SettingsInput,
  debts: DebtInput[],
  expenses: ExpenseInput[],
  monthsToProject: number = 24
): ProjecaoMes[] {
  const projection: ProjecaoMes[] = [];
  const baseDate = new Date();
  
  let currentSavings = settings.initialSavings;

  let overrides: Record<string, number> = {};
  if (settings.savingsOverrides) {
    try {
      overrides = JSON.parse(settings.savingsOverrides);
    } catch (e) {
      console.error("Erro ao analisar savingsOverrides JSON no motor:", e);
    }
  }

  for (let i = 1; i <= monthsToProject; i++) {
    const targetDate = addMonths(baseDate, i - 1);
    const monthIndex = targetDate.getMonth();
    const year = targetDate.getFullYear();
    
    const monthLabel = MONTHS_PT[monthIndex];
    const monthYearLabel = `${MONTHS_SHORT_PT[monthIndex]}/${year}`;

    // 1. Identificar dívidas ativas neste mês da projeção (parcelas restantes >= i)
    const activeDebtsThisMonth = debts.filter(d => d.active && d.remainingInstallments >= i);

    // 2. Somar parcelas das dívidas deste mês
    const debtPaymentsValue = activeDebtsThisMonth.reduce((acc, d) => acc + d.installmentValue, 0);

    // 3. Filtrar despesas ativas neste mês
    const activeExpensesThisMonth = expenses.filter(e => {
      if (!e.active) return false;
      if (e.debtId) {
        const linkedDebt = debts.find(d => d.id === e.debtId);
        if (!linkedDebt || !linkedDebt.active) return false;
        return linkedDebt.remainingInstallments >= i;
      }
      return true;
    });

    const expensesValue = activeExpensesThisMonth.reduce((acc, e) => acc + e.value, 0);

    // --- CÁLCULO DO CARTÃO DE CRÉDITO E PREVENÇÃO DE DUPLICADOS ---
    // Somar o que já está cobrado no cartão de crédito neste mês
    const creditCardExpensesSum = activeExpensesThisMonth
      .filter(e => e.isCreditCard)
      .reduce((acc, e) => acc + e.value, 0);

    const creditCardDebtsSum = activeDebtsThisMonth
      .filter(d => d.isCreditCard)
      .reduce((acc, d) => acc + d.installmentValue, 0);

    const totalTrackedCreditCard = creditCardExpensesSum + creditCardDebtsSum;
    const creditCardBill = settings.creditCardBill || 0;
    const creditCardBillRemaining = Math.max(0, creditCardBill - totalTrackedCreditCard);

    // A aporte deste mês pode ser customizado por um override
    const monthlySavingsOverride = overrides[monthYearLabel];
    const currentMonthlyInvestment = monthlySavingsOverride !== undefined ? monthlySavingsOverride : settings.monthlyInvestment;

    // O fluxo de saída é a soma de despesas + parcelas + fatura avulsa restante do cartão + investimento mensal
    const totalOutflow = expensesValue + debtPaymentsValue + creditCardBillRemaining + currentMonthlyInvestment;

    // 4. Poupança acumulada
    currentSavings += currentMonthlyInvestment;

    // 5. Cálculo do saldo das dívidas restantes após o pagamento deste mês
    let totalDebtsRemaining = 0;
    activeDebtsThisMonth.forEach(d => {
      const remainingPaymentsAfterThisMonth = d.remainingInstallments - i;
      if (remainingPaymentsAfterThisMonth > 0) {
        totalDebtsRemaining += d.installmentValue * remainingPaymentsAfterThisMonth;
      }
    });

    // 6. Patrimônio líquido
    const netWorth = currentSavings - totalDebtsRemaining;

    // 7. Compilar itens detalhados do mês
    const items: MonthDetailItem[] = [
      { name: "Salário/Receita", value: settings.salary, type: "income" },
      { name: "Investimento Poupança", value: currentMonthlyInvestment, type: "investment" }
    ];

    if (creditCardBillRemaining > 0) {
      items.push({
        name: "Fatura Cartão (Outros)",
        value: creditCardBillRemaining,
        type: "expense"
      });
    }

    activeExpensesThisMonth.forEach(e => {
      items.push({
        name: e.isCreditCard ? `${e.name} (no Cartão)` : e.name,
        value: e.value,
        type: "expense"
      });
    });

    activeDebtsThisMonth.forEach(d => {
      const remainingAfterThis = d.remainingInstallments - i;
      items.push({
        name: d.isCreditCard ? `${d.name} (Parcela no Cartão)` : `${d.name} (Parcela)`,
        value: d.installmentValue,
        type: "debt",
        remainingInstallments: remainingAfterThis
      });
    });

    projection.push({
      monthLabel,
      monthYearLabel,
      year,
      savings: currentSavings,
      debtsRemaining: totalDebtsRemaining,
      netWorth,
      revenue: settings.salary,
      monthlyInvestment: currentMonthlyInvestment,
      expensesTotal: totalOutflow,
      items
    });
  }

  return projection;
}
