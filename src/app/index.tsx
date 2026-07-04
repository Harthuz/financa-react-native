import { useFinanceStore } from "@/stores/financeStore";
import { useState } from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function DashboardScreen() {
  const { settings, debts, expenses, projection, updateSettings, addDebt, updateThemeMode } = useFinanceStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [salary, setSalary] = useState(settings?.salary.toString() || "0");
  const [investment, setInvestment] = useState(settings?.monthlyInvestment.toString() || "0");
  const [savings, setSavings] = useState(settings?.initialSavings.toString() || "0");
  const [creditCardBill, setCreditCardBill] = useState(settings?.creditCardBill?.toString() || "0");
  const [tempTheme, setTempTheme] = useState(settings?.themeMode || "dark");

  // Estados do Simulador de Compras
  const [simName, setSimName] = useState("");
  const [simValue, setSimValue] = useState("");
  const [simType, setSimType] = useState<"cash" | "installments">("cash");
  const [simInstallments, setSimInstallments] = useState("12");
  const [simIsCreditCard, setSimIsCreditCard] = useState(false);

  const activeDebtsCount = debts.filter(d => d.active).length;
  const activeExpensesCount = expenses.filter(e => e.active).length;

  // Somar gastos fixos recorrentes ativos
  const activeExpensesTotal = expenses.filter(e => e.active).reduce((acc, e) => acc + e.value, 0);

  // Somar parcelas de dívidas ativas deste mês
  const activeDebtsInstallmentsTotal = debts.filter(d => d.active).reduce((acc, d) => acc + d.installmentValue, 0);

  // Somar itens que são pagos no cartão de crédito para deduzir da fatura
  const creditCardExpensesTotal = expenses.filter(e => e.active && e.isCreditCard).reduce((acc, e) => acc + e.value, 0);
  const creditCardDebtsTotal = debts.filter(d => d.active && d.isCreditCard && d.remainingInstallments > 0).reduce((acc, d) => acc + d.installmentValue, 0);

  const totalTrackedCreditCard = creditCardExpensesTotal + creditCardDebtsTotal;
  const creditCardBillValue = settings?.creditCardBill || 0;
  const creditCardBillRemaining = Math.max(0, creditCardBillValue - totalTrackedCreditCard);

  // Calcular quanto sobra do salário (descontando também o investimento mensal)
  const remainingIncome = (settings?.salary || 0) - activeExpensesTotal - activeDebtsInstallmentsTotal - creditCardBillRemaining - (settings?.monthlyInvestment || 0);

  // Obter métricas do mês atual (mês 0 da projeção)
  const currentMonthData = projection[0] || {
    savings: settings?.initialSavings || 0,
    debtsRemaining: debts.reduce((acc, d) => acc + (d.active ? d.installmentValue * d.remainingInstallments : 0), 0),
    netWorth: (settings?.initialSavings || 0) - debts.reduce((acc, d) => acc + (d.active ? d.installmentValue * d.remainingInstallments : 0), 0),
    expensesTotal: activeExpensesTotal + activeDebtsInstallmentsTotal + (settings?.monthlyInvestment || 0) + creditCardBillRemaining
  };

  const totalDebtsBalance = debts.reduce((acc, d) => acc + (d.active ? d.installmentValue * d.remainingInstallments : 0), 0);

  const handleSaveSettings = async () => {
    const sVal = parseFloat(salary) || 0;
    const iVal = parseFloat(investment) || 0;
    const saVal = parseFloat(savings) || 0;
    const cVal = parseFloat(creditCardBill) || 0;
    await updateSettings(sVal, iVal, saVal, cVal);
    if (tempTheme !== settings?.themeMode) {
      await updateThemeMode(tempTheme as "dark" | "light");
    }
    setIsModalOpen(false);
  };

  const handleEfetivarCompra = async () => {
    const valueNum = parseFloat(simValue) || 0;
    const nameStr = simName.trim() || "Compra Simulada";

    if (valueNum <= 0) return;

    if (simType === "cash") {
      // Compra à vista: cadastrada como dívida de 1 única parcela
      // Assim ela é cobrada este mês e sai do orçamento automaticamente no próximo mês
      await addDebt({
        name: `Compra: ${nameStr}`,
        installmentValue: valueNum,
        totalInstallments: 1,
        remainingInstallments: 1,
        active: true,
        category: "Compra à Vista",
        isCreditCard: simIsCreditCard
      });
    } else {
      // Compra parcelada: cadastrada como uma nova dívida normal
      const installmentsNum = parseInt(simInstallments) || 12;
      const installmentValueNum = valueNum / installmentsNum;
      await addDebt({
        name: nameStr,
        installmentValue: installmentValueNum,
        totalInstallments: installmentsNum,
        remainingInstallments: installmentsNum,
        active: true,
        category: "Compra Parcelada",
        isCreditCard: simIsCreditCard
      });
    }

    // Limpar campos
    setSimName("");
    setSimValue("");
    setSimType("cash");
    setSimInstallments("12");
    setSimIsCreditCard(false);
    alert("Compra efetivada com sucesso e integrada ao seu planejamento financeiro!");
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(val);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle={settings?.themeMode === "light" ? "dark-content" : "light-content"} />
      <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-slate-400 text-sm font-medium">Bem-vindo ao</Text>
            <Text className="text-slate-50 text-3xl font-extrabold tracking-tight">Finanças Pro</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setSalary(settings?.salary.toString() || "0");
              setInvestment(settings?.monthlyInvestment.toString() || "0");
              setSavings(settings?.initialSavings.toString() || "0");
              setCreditCardBill(settings?.creditCardBill?.toString() || "0");
              setTempTheme(settings?.themeMode || "dark");
              setIsModalOpen(true);
            }}
            className="bg-teal-600/20 border border-teal-500/30 px-4 py-2 rounded-xl"
          >
            <Text className="text-teal-400 font-semibold text-xs">Ajustar Realidade</Text>
          </TouchableOpacity>
        </View>

        {/* Alerta de primeiro acesso se os dados forem zero */}
        {settings?.salary === 0 && (
          <View className="bg-amber-900/20 border border-amber-500/30 p-4 rounded-2xl mb-6">
            <Text className="text-amber-400 font-bold text-base mb-1">Configure sua base financeira!</Text>
            <Text className="text-slate-300 text-sm mb-3">
              Clique em "Ajustar Realidade" para informar seu salário, poupança atual e investimentos mensais.
            </Text>
          </View>
        )}

        {/* Card Saldo Livre Mensal */}
        <View className="bg-slate-900/90 border border-slate-800 p-6 rounded-3xl mb-6 shadow-xl relative overflow-hidden">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Saldo Livre Mensal (Quanto Sobra)</Text>
              <Text className={`text-3xl font-black ${remainingIncome >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatCurrency(remainingIncome)}
              </Text>
              <Text className="text-slate-500 text-xs mt-1.5">
                Salário disponível após gastos recorrentes, investimentos, e parcelas de dívidas.
              </Text>
            </View>
            <View className={`px-3 py-1.5 rounded-xl ${remainingIncome >= 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-rose-500/10 border border-rose-500/20"}`}>
              <Text className={`text-xs font-bold ${remainingIncome >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {remainingIncome >= 0 ? "Superavitário" : "Déficit"}
              </Text>
            </View>
          </View>
        </View>

        {/* Grid de Resumos Principais */}
        <View className="flex-row gap-4 mb-4">
          {/* Card Patrimônio Líquido */}
          <View className="flex-1 bg-slate-900/70 border border-slate-800 p-5 rounded-2xl">
            <Text className="text-slate-400 text-xs font-semibold uppercase mb-1">Patrimônio Líquido</Text>
            <Text className={`text-2xl font-black ${currentMonthData.netWorth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {formatCurrency(currentMonthData.netWorth)}
            </Text>
            <Text className="text-slate-500 text-[10px] mt-2">Poupança acumulada menos dívidas</Text>
          </View>

          {/* Card Dívida Total Restante */}
          <View className="flex-1 bg-slate-900/70 border border-slate-850 p-5 rounded-2xl">
            <Text className="text-slate-400 text-xs font-semibold uppercase mb-1">Dívida Restante</Text>
            <Text className="text-rose-400 text-2xl font-black">
              {formatCurrency(totalDebtsBalance)}
            </Text>
            <Text className="text-slate-500 text-[10px] mt-2">Soma total de todas as parcelas</Text>
          </View>
        </View>

        {/* Detalhes de Entrada e Acúmulos */}
        <View className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 mb-6">
          <Text className="text-slate-50 font-bold text-lg mb-4">Fluxo Mensal Vigente</Text>

          <View className="flex-row justify-between py-2 border-b border-slate-800">
            <Text className="text-slate-400">Salário / Receita</Text>
            <Text className="text-emerald-400 font-bold">{formatCurrency(settings?.salary || 0)}</Text>
          </View>

          <View className="flex-row justify-between py-2 border-b border-slate-800">
            <Text className="text-slate-400">Investimento Mensal</Text>
            <Text className="text-teal-400 font-bold">{formatCurrency(settings?.monthlyInvestment || 0)}</Text>
          </View>

          <View className="flex-row justify-between py-2 border-b border-slate-800">
            <Text className="text-slate-400">Poupança Bruta Inicial</Text>
            <Text className="text-emerald-500 font-bold">{formatCurrency(settings?.initialSavings || 0)}</Text>
          </View>

          {creditCardBillValue > 0 && (
            <View className="flex-row justify-between py-2 border-b border-slate-800">
              <Text className="text-slate-400">Fatura Cartão (Outros Gastos)</Text>
              <Text className="text-rose-400 font-bold">{formatCurrency(creditCardBillRemaining)}</Text>
            </View>
          )}

          <View className="flex-row justify-between py-2">
            <Text className="text-slate-400">Próxima Saída (Este Mês)</Text>
            <Text className="text-rose-400 font-bold">{formatCurrency(currentMonthData.expensesTotal)}</Text>
          </View>
        </View>

        {/* Simulador de Compras */}
        <View className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 mb-6">
          <Text className="text-slate-50 font-bold text-lg mb-4">Simulador de Compras</Text>

          <View className="gap-3 mb-4">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-xs mb-1.5">O que deseja comprar?</Text>
                <TextInput
                  value={simName}
                  onChangeText={setSimName}
                  placeholder="Ex: Notebook, TV, Viagem"
                  placeholderTextColor="#808080"
                  className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium text-sm"
                />
              </View>
              <View className="w-1/3">
                <Text className="text-slate-400 text-xs mb-1.5">Valor (R$)</Text>
                <TextInput
                  value={simValue}
                  onChangeText={setSimValue}
                  keyboardType="numeric"
                  placeholder="Ex: 3000"
                  placeholderTextColor="#808080"
                  className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium text-sm"
                />
              </View>
            </View>

            <View className="flex-row gap-3 items-end">
              <View className="flex-1">
                <Text className="text-slate-400 text-xs mb-1.5">Forma de Pagamento</Text>
                <View className="flex-row bg-slate-950 border border-slate-850 rounded-xl p-1">
                  <TouchableOpacity
                    onPress={() => setSimType("cash")}
                    className={`flex-1 py-1.5 rounded-lg items-center ${simType === "cash" ? "bg-teal-650/30" : ""}`}
                  >
                    <Text className={`text-xs font-semibold ${simType === "cash" ? "text-teal-400" : "text-slate-400"}`}>À Vista</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSimType("installments")}
                    className={`flex-1 py-1.5 rounded-lg items-center ${simType === "installments" ? "bg-teal-650/30" : ""}`}
                  >
                    <Text className={`text-xs font-semibold ${simType === "installments" ? "text-teal-400" : "text-slate-400"}`}>Parcelado</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {simType === "installments" && (
                <View className="w-1/3">
                  <Text className="text-slate-400 text-xs mb-1.5">Parcelas</Text>
                  <TextInput
                    value={simInstallments}
                    onChangeText={setSimInstallments}
                    keyboardType="numeric"
                    placeholder="12"
                    placeholderTextColor="#808080"
                    className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium text-sm"
                  />
                </View>
              )}
            </View>

            {/* Opção comprar no cartão de crédito */}
            <View className="flex-row items-center justify-between bg-slate-950 border border-slate-850 rounded-xl p-3">
              <Text className="text-slate-400 text-xs font-semibold">Comprar no Cartão de Crédito?</Text>
              <TouchableOpacity
                onPress={() => setSimIsCreditCard(!simIsCreditCard)}
                className={`w-12 h-6 rounded-full p-1 ${simIsCreditCard ? "bg-teal-600 items-end" : "bg-slate-800 items-start"}`}
              >
                <View className="w-4 h-4 rounded-full bg-slate-950" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Resultados da Simulação */}
          {parseFloat(simValue) > 0 && (
            <View className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 mb-4 gap-2">
              <Text className="text-slate-400 font-bold text-xs uppercase mb-1">Impacto Financeiro Estimado</Text>

              {simType === "cash" ? (
                <>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-400 text-xs">Valor da Compra (Único)</Text>
                    <Text className="text-rose-400 font-bold text-xs">{formatCurrency(parseFloat(simValue) || 0)}</Text>
                  </View>
                  <View className="flex-row justify-between border-t border-slate-900 pt-2 mt-1">
                    <Text className="text-slate-50 text-xs font-semibold">Novo Saldo Livre (Este Mês)</Text>
                    <Text className={`font-bold text-xs ${remainingIncome - parseFloat(simValue) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatCurrency(remainingIncome - parseFloat(simValue))}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-400 text-xs">Valor da Parcela</Text>
                    <Text className="text-rose-400 font-bold text-xs">
                      {formatCurrency((parseFloat(simValue) || 0) / (parseInt(simInstallments) || 1))} x {parseInt(simInstallments) || 1}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-400 text-xs">Nova Dívida Restante</Text>
                    <Text className="text-rose-300 font-bold text-xs">
                      {formatCurrency(totalDebtsBalance + (parseFloat(simValue) || 0))}
                    </Text>
                  </View>
                  <View className="flex-row justify-between border-t border-slate-900 pt-2 mt-1">
                    <Text className="text-slate-50 text-xs font-semibold">Novo Saldo Livre Mensal</Text>
                    <Text className={`font-bold text-xs ${remainingIncome - ((parseFloat(simValue) || 0) / (parseInt(simInstallments) || 1)) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatCurrency(remainingIncome - ((parseFloat(simValue) || 0) / (parseInt(simInstallments) || 1)))}
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Botão de Efetivação */}
          {parseFloat(simValue) > 0 && simName.trim().length > 0 && (
            <TouchableOpacity
              onPress={handleEfetivarCompra}
              className="bg-teal-600 py-3 rounded-xl items-center"
            >
              <Text className="text-on-accent font-bold text-xs uppercase tracking-wider">Efetivar no Orçamento</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Estatísticas Rápidas de Cadastros */}
        <View className="flex-row gap-4">
          <View className="flex-1 bg-slate-900/30 border border-slate-880/60 p-4 rounded-xl items-center">
            <Text className="text-slate-500 text-xs uppercase mb-1">Dívidas Ativas</Text>
            <Text className="text-slate-50 text-xl font-bold">{activeDebtsCount}</Text>
          </View>
          <View className="flex-1 bg-slate-900/30 border border-slate-880/60 p-4 rounded-xl items-center">
            <Text className="text-slate-500 text-xs uppercase mb-1">Gastos Cadastrados</Text>
            <Text className="text-slate-50 text-xl font-bold">{activeExpensesCount}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal de Configuração */}
      {isModalOpen && (
        <Modal visible={isModalOpen} animationType="slide" transparent>
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-slate-900 rounded-t-3xl p-6 border-t border-slate-800">
              <Text className="text-slate-50 text-xl font-bold mb-4">Ajustar Realidade Financeira</Text>

              <View className="mb-4">
                <Text className="text-slate-400 mb-2">Salário Mensal (R$)</Text>
                <TextInput
                  value={salary}
                  onChangeText={setSalary}
                  keyboardType="numeric"
                  placeholder="Ex: 4500"
                  placeholderTextColor="#808080"
                  className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium"
                />
              </View>

              <View className="mb-4">
                <Text className="text-slate-400 mb-2">Valor Investido Todo Mês (R$)</Text>
                <TextInput
                  value={investment}
                  onChangeText={setInvestment}
                  keyboardType="numeric"
                  placeholder="Ex: 350"
                  placeholderTextColor="#808080"
                  className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium"
                />
              </View>

              <View className="mb-4">
                <Text className="text-slate-400 mb-2">Valor Inicial da Poupança (R$)</Text>
                <TextInput
                  value={savings}
                  onChangeText={setSavings}
                  keyboardType="numeric"
                  placeholder="Ex: 8000"
                  placeholderTextColor="#808080"
                  className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium"
                />
              </View>

              <View className="mb-6">
                <Text className="text-slate-400 mb-2">Fatura do Cartão de Crédito (R$)</Text>
                <TextInput
                  value={creditCardBill}
                  onChangeText={setCreditCardBill}
                  keyboardType="numeric"
                  placeholder="Ex: 1000"
                  placeholderTextColor="#808080"
                  className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium"
                />
              </View>

              <View className="mb-6">
                <Text className="text-slate-400 mb-2">Tema do Aplicativo</Text>
                <View className="flex-row bg-slate-950 border border-slate-850 rounded-xl p-1">
                  <TouchableOpacity
                    onPress={() => setTempTheme("dark")}
                    className={`flex-1 py-2 rounded-lg items-center ${tempTheme === "dark" ? "bg-teal-650/30" : ""}`}
                  >
                    <Text className={`text-xs font-semibold ${tempTheme === "dark" ? "text-teal-400" : "text-slate-400"}`}>Escuro (Dark)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setTempTheme("light")}
                    className={`flex-1 py-2 rounded-lg items-center ${tempTheme === "light" ? "bg-teal-650/30" : ""}`}
                  >
                    <Text className={`text-xs font-semibold ${tempTheme === "light" ? "text-teal-400" : "text-slate-400"}`}>Claro (Light)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-row gap-4">
                <TouchableOpacity
                  onPress={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 py-3 rounded-xl items-center"
                >
                  <Text className="text-slate-300 font-semibold">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveSettings}
                  className="flex-1 bg-teal-600 py-3 rounded-xl items-center"
                >
                  <Text className="text-on-accent font-semibold">Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
