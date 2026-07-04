import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  SafeAreaView
} from "react-native";
import { useFinanceStore } from "@/stores/financeStore";
import { ProjecaoMes } from "@/financeEngine/engine";

export default function ProjectionScreen() {
  const { projection, settings, updateSavingsOverride } = useFinanceStore();

  const [selectedMonth, setSelectedMonth] = useState<ProjecaoMes | null>(null);
  const [overrideValue, setOverrideValue] = useState("");
  const [visibleMonths, setVisibleMonths] = useState(12);

  const expandBy = (n: number) => {
    setVisibleMonths(prev => Math.min(prev + n, projection.length));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(val);
  };

  // Pegar os primeiros 12 meses para o gráfico
  const chartData = projection.slice(0, 12);
  const netWorths = chartData.map(m => m.netWorth);
  const maxNetWorth = Math.max(...netWorths, 1);
  const minNetWorth = Math.min(...netWorths, 0);
  const range = maxNetWorth - minNetWorth;

  // Calcular Crescimento Patrimonial Anual
  const netWorthM0 = projection[0]?.netWorth || 0;
  const netWorthM12 = projection[11]?.netWorth || 0;
  const netWorthM24 = projection[23]?.netWorth || 0;

  const y1Abs = netWorthM12 - netWorthM0;
  const y1Pct = netWorthM0 !== 0 ? (y1Abs / Math.abs(netWorthM0)) * 100 : 0;

  const y2Abs = netWorthM24 - netWorthM12;
  const y2Pct = netWorthM12 !== 0 ? (y2Abs / Math.abs(netWorthM12)) * 100 : 0;

  const handleSelectMonth = (mes: ProjecaoMes) => {
    setSelectedMonth(mes);
    
    // Encontrar o override atual se houver
    let currentOverride = "";
    if (settings?.savingsOverrides) {
      try {
        const parsed = JSON.parse(settings.savingsOverrides);
        if (parsed[mes.monthYearLabel] !== undefined) {
          currentOverride = parsed[mes.monthYearLabel].toString();
        }
      } catch (e) {
        console.error("Erro ao ler savingsOverrides:", e);
      }
    }
    setOverrideValue(currentOverride);
  };

  const handleSaveOverride = async () => {
    if (!selectedMonth) return;
    const val = parseFloat(overrideValue);
    if (isNaN(val) || val < 0) {
      alert("Por favor, insira um valor numérico válido maior ou igual a zero.");
      return;
    }
    await updateSavingsOverride(selectedMonth.monthYearLabel, val);
    
    // Recarregar o mês selecionado da projeção atualizada
    const updatedProj = useFinanceStore.getState().projection;
    const updatedMonth = updatedProj.find(m => m.monthYearLabel === selectedMonth.monthYearLabel);
    if (updatedMonth) {
      setSelectedMonth(updatedMonth);
    }
    alert(`Aporte poupança de ${selectedMonth.monthYearLabel} alterado para ${formatCurrency(val)}!`);
  };

  const handleClearOverride = async () => {
    if (!selectedMonth) return;
    await updateSavingsOverride(selectedMonth.monthYearLabel, null);
    setOverrideValue("");
    
    // Recarregar o mês selecionado da projeção atualizada
    const updatedProj = useFinanceStore.getState().projection;
    const updatedMonth = updatedProj.find(m => m.monthYearLabel === selectedMonth.monthYearLabel);
    if (updatedMonth) {
      setSelectedMonth(updatedMonth);
    }
    alert(`Aporte de ${selectedMonth.monthYearLabel} restaurado para o valor padrão!`);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-1 px-4 py-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-slate-50 text-2xl font-bold tracking-tight">Projeção Futura</Text>
          <Text className="text-slate-400 text-sm">Previsão automática de evolução patrimonial</Text>
        </View>

        {projection.length === 0 ? (
          <View className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl items-center mt-4">
            <Text className="text-slate-400 text-center font-medium">
              Configure sua realidade no Dashboard para ver a projeção.
            </Text>
          </View>
        ) : (
          <View className="flex-1">
            
            {/* Métricas de Crescimento Patrimonial Anual */}
            {projection.length >= 24 && (
              <View className="flex-row gap-4 mb-6">
                {/* Card Ano 1 */}
                <View className="flex-1 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                  <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Crescimento Ano 1</Text>
                  <Text className={`text-lg font-black ${y1Abs >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {y1Abs >= 0 ? "+" : ""}{formatCurrency(y1Abs)}
                  </Text>
                  <Text className={`text-xs font-bold ${y1Abs >= 0 ? "text-emerald-500" : "text-rose-500"} mt-0.5`}>
                    {y1Abs >= 0 ? "▲" : "▼"} {y1Pct.toFixed(1)}%
                  </Text>
                </View>

                {/* Card Ano 2 */}
                <View className="flex-1 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                  <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Crescimento Ano 2</Text>
                  <Text className={`text-lg font-black ${y2Abs >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {y2Abs >= 0 ? "+" : ""}{formatCurrency(y2Abs)}
                  </Text>
                  <Text className={`text-xs font-bold ${y2Abs >= 0 ? "text-emerald-500" : "text-rose-500"} mt-0.5`}>
                    {y2Abs >= 0 ? "▲" : "▼"} {y2Pct.toFixed(1)}%
                  </Text>
                </View>
              </View>
            )}

            {/* Gráfico de Barras Customizado */}
            <View className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl mb-6">
              <Text className="text-slate-300 font-bold text-sm mb-4">Evolução do Patrimônio Líquido (12 Meses)</Text>
              
              <View className="h-32 flex-row items-end gap-1.5 px-2">
                {chartData.map((mes, idx) => {
                  // Calcular altura determinística em pixels
                  const maxBarHeight = 90; // Altura máxima para h-32
                  const heightPx = range > 0 ? ((mes.netWorth - minNetWorth) / range) * maxBarHeight : 0;
                  const barHeight = Math.max(heightPx, 6); // Altura mínima de 6px
                  const isPositive = mes.netWorth >= 0;

                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleSelectMonth(mes)}
                      className="flex-1 items-center"
                      style={{ height: "100%", justifyContent: "flex-end" }}
                    >
                      {/* Barra do gráfico */}
                      <View
                        className={`w-full rounded-t-md ${isPositive ? "bg-emerald-500/80" : "bg-rose-500/80"}`}
                        style={{ height: barHeight }}
                      />
                      <Text className="text-slate-500 text-[8px] mt-1 font-semibold">
                        {mes.monthYearLabel.split("/")[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tabela Cabeçalho */}
            <View className="flex-row bg-slate-900 border border-slate-800 p-3 rounded-t-xl">
              <Text className="flex-1 text-slate-400 font-bold text-xs">Mês</Text>
              <Text className="flex-1 text-slate-400 font-bold text-xs text-right">Poupança</Text>
              <Text className="flex-1 text-slate-400 font-bold text-xs text-right">Dívida</Text>
              <Text className="flex-1 text-slate-400 font-bold text-xs text-right">Patrimônio</Text>
            </View>

            {/* Linhas da Tabela */}
            <ScrollView className="flex-1 border-l border-r border-b border-slate-850 rounded-b-xl" contentContainerStyle={{ paddingBottom: 20 }}>
              {projection.slice(0, visibleMonths).map((mes, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSelectMonth(mes)}
                  className={`flex-row p-4 items-center border-b border-slate-900/80 ${
                    idx % 2 === 0 ? "bg-slate-900/30" : "bg-slate-950"
                  }`}
                >
                  <Text className="flex-1 text-slate-50 font-medium text-xs">
                    {mes.monthYearLabel}
                  </Text>
                  <Text className="flex-1 text-emerald-400 font-semibold text-xs text-right">
                    {formatCurrency(mes.savings)}
                  </Text>
                  <Text className="flex-1 text-rose-400 font-semibold text-xs text-right">
                    {formatCurrency(mes.debtsRemaining)}
                  </Text>
                  <Text
                    className={`flex-1 font-bold text-xs text-right ${
                      mes.netWorth >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {formatCurrency(mes.netWorth)}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Rodapé com botões de expandir */}
              <View className="px-3 py-4 bg-slate-900/20">
                <Text className="text-slate-500 text-[10px] text-center mb-3 font-semibold uppercase tracking-wider">
                  Exibindo {visibleMonths} de {projection.length} meses
                </Text>
                {visibleMonths < projection.length ? (
                  <View className="flex-row gap-2 justify-center">
                    {visibleMonths + 6 <= projection.length && (
                      <TouchableOpacity
                        onPress={() => expandBy(6)}
                        className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg flex-row items-center gap-1"
                      >
                        <Text className="text-teal-400 font-bold text-xs">+ 6 meses</Text>
                      </TouchableOpacity>
                    )}
                    {visibleMonths + 12 <= projection.length && (
                      <TouchableOpacity
                        onPress={() => expandBy(12)}
                        className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg flex-row items-center gap-1"
                      >
                        <Text className="text-teal-400 font-bold text-xs">+ 12 meses</Text>
                      </TouchableOpacity>
                    )}
                    {visibleMonths + 24 <= projection.length && (
                      <TouchableOpacity
                        onPress={() => expandBy(24)}
                        className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg flex-row items-center gap-1"
                      >
                        <Text className="text-teal-400 font-bold text-xs">+ 24 meses</Text>
                      </TouchableOpacity>
                    )}
                    {/* Botão para mostrar todos os restantes quando nenhum dos acima cabe exato */}
                    {visibleMonths + 6 > projection.length && (
                      <TouchableOpacity
                        onPress={() => setVisibleMonths(projection.length)}
                        className="bg-teal-600/20 border border-teal-500/30 px-4 py-2 rounded-lg"
                      >
                        <Text className="text-teal-400 font-bold text-xs">Ver todos ({projection.length - visibleMonths} restantes)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View className="items-center">
                    <Text className="text-slate-600 text-xs font-semibold">✓ Todos os meses exibidos</Text>
                    <TouchableOpacity
                      onPress={() => setVisibleMonths(12)}
                      className="mt-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg"
                    >
                      <Text className="text-slate-400 font-bold text-xs">Recolher para 12 meses</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Modal de Detalhes do Mês */}
      {!!selectedMonth && (
        <Modal visible={!!selectedMonth} animationType="slide" transparent>
          <View className="flex-1 justify-end bg-black/60">
            {selectedMonth && (
              <View className="bg-slate-900 rounded-t-3xl p-6 border-t border-slate-800 max-h-[85%]">
                <View className="flex-row justify-between items-center mb-6">
                  <View>
                    <Text className="text-slate-50 text-xl font-extrabold">
                      Detalhes de {selectedMonth.monthLabel}
                    </Text>
                    <Text className="text-slate-400 text-xs">{selectedMonth.monthYearLabel}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedMonth(null)}
                    className="bg-slate-800 p-2 px-4 rounded-xl"
                  >
                    <Text className="text-slate-50 font-semibold text-xs">Fechar</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView className="mb-6" showsVerticalScrollIndicator={false}>
                  {/* Métricas consolidadas */}
                  <View className="bg-slate-950/80 border border-slate-850 p-4 rounded-2xl gap-3 mb-6">
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Poupança Acumulada</Text>
                      <Text className="text-emerald-400 font-bold">
                        {formatCurrency(selectedMonth.savings)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Dívida Restante</Text>
                      <Text className="text-rose-400 font-bold">
                        {formatCurrency(selectedMonth.debtsRemaining)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between border-t border-slate-900 pt-2">
                      <Text className="text-slate-50 font-bold">Patrimônio Líquido</Text>
                      <Text
                        className={`font-black ${
                          selectedMonth.netWorth >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatCurrency(selectedMonth.netWorth)}
                      </Text>
                    </View>
                  </View>

                  {/* Discriminação de Fluxo */}
                  <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">
                    Discriminação do Fluxo Financeiro
                  </Text>

                  <View className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 gap-3">
                    {selectedMonth.items.map((item, i) => (
                      <View key={i} className="flex-row justify-between items-center">
                        <View className="flex-1 pr-3">
                          <Text className="text-slate-50 font-medium">{item.name}</Text>
                          {item.remainingInstallments !== undefined && (
                            <Text className="text-slate-500 text-[10px]">
                              Restam {item.remainingInstallments} parcelas pós este mês
                            </Text>
                          )}
                        </View>
                        <Text
                          className={`font-bold ${
                            item.type === "income"
                              ? "text-emerald-400"
                              : item.type === "investment"
                              ? "text-teal-400"
                              : "text-rose-400"
                          }`}
                        >
                          {item.type === "income" || item.type === "investment" ? "+" : "-"}
                          {formatCurrency(item.value)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Input de Aporte Poupança Customizado */}
                  <View className="border-t border-slate-800 pt-6 mt-6">
                    <Text className="text-slate-50 font-bold text-sm mb-2">Ajustar Aporte Poupança (Mês Individual)</Text>
                    <View className="flex-row gap-3">
                      <TextInput
                        value={overrideValue}
                        onChangeText={setOverrideValue}
                        keyboardType="numeric"
                        placeholder={`Padrão: ${formatCurrency(settings?.monthlyInvestment || 0)}`}
                        placeholderTextColor="#808080"
                        className="flex-1 bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium text-sm"
                      />
                      <TouchableOpacity
                        onPress={handleSaveOverride}
                        className="bg-teal-600 px-4 rounded-xl justify-center items-center"
                      >
                        <Text className="text-on-accent font-bold text-xs">Salvar</Text>
                      </TouchableOpacity>
                      {overrideValue !== "" && (
                        <TouchableOpacity
                          onPress={handleClearOverride}
                          className="bg-slate-850 border border-slate-800 px-4 rounded-xl justify-center items-center"
                        >
                          <Text className="text-slate-400 font-bold text-xs">Limpar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
