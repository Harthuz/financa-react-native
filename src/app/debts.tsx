import { DebtInput } from "@/financeEngine/engine";
import { useFinanceStore } from "@/stores/financeStore";
import { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: onConfirm }
    ]);
  }
}

export default function DebtsScreen() {
  const { debts, addDebt, updateDebt, deleteDebt } = useFinanceStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtInput | null>(null);

  // Campos do formulário
  const [name, setName] = useState("");
  const [installmentValue, setInstallmentValue] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("");
  const [remainingInstallments, setRemainingInstallments] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isCreditCard, setIsCreditCard] = useState(false);

  const handleOpenAddModal = () => {
    setEditingDebt(null);
    setName("");
    setInstallmentValue("");
    setTotalInstallments("");
    setRemainingInstallments("");
    setCategory("");
    setStartDate("");
    setIsCreditCard(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (debt: DebtInput) => {
    setEditingDebt(debt);
    setName(debt.name);
    setInstallmentValue(debt.installmentValue.toString());
    setTotalInstallments(debt.totalInstallments.toString());
    setRemainingInstallments(debt.remainingInstallments.toString());
    setCategory(debt.category || "");
    setStartDate(debt.startDate || "");
    setIsCreditCard(!!debt.isCreditCard);
    setIsModalOpen(true);
  };

  const handleAutoCalculateRemaining = (startVal: string, totalVal: string) => {
    if (!startVal) return;
    const total = parseInt(totalVal);
    if (isNaN(total) || total <= 0) return;

    if (startVal.length < 10) return;

    const dateParts = startVal.split("-");
    if (dateParts.length !== 3) return;

    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // 0-indexed
    const day = parseInt(dateParts[2]);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return;

    const purchaseDate = new Date(year, month, day, 12, 0, 0);
    if (isNaN(purchaseDate.getTime())) return;

    const today = new Date();
    const diffMonths = (today.getFullYear() - purchaseDate.getFullYear()) * 12 + (today.getMonth() - purchaseDate.getMonth());

    if (diffMonths <= 0) {
      setRemainingInstallments(total.toString());
    } else {
      const remaining = Math.max(0, total - diffMonths);
      setRemainingInstallments(remaining.toString());
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    handleAutoCalculateRemaining(val, totalInstallments);
  };

  const handleTotalInstallmentsChange = (val: string) => {
    setTotalInstallments(val);
    handleAutoCalculateRemaining(startDate, val);
  };

  const handleSave = async () => {
    if (!name || !installmentValue || !totalInstallments || !remainingInstallments) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const instVal = parseFloat(installmentValue) || 0;
    const totInst = parseInt(totalInstallments) || 0;
    const remInst = parseInt(remainingInstallments) || 0;

    if (instVal <= 0 || totInst <= 0) {
      alert("Valores e parcelas devem ser maiores que zero.");
      return;
    }

    if (remInst > totInst) {
      alert("Parcelas restantes não podem ser maiores que as parcelas totais.");
      return;
    }

    if (editingDebt) {
      await updateDebt({
        ...editingDebt,
        name,
        installmentValue: instVal,
        totalInstallments: totInst,
        remainingInstallments: remInst,
        category: category || null,
        isCreditCard,
        startDate: startDate || null
      });
    } else {
      await addDebt({
        name,
        installmentValue: instVal,
        totalInstallments: totInst,
        remainingInstallments: remInst,
        category: category || null,
        active: true,
        isCreditCard,
        startDate: startDate || null
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    confirmAction(
      "Excluir Dívida",
      "Tem certeza que deseja excluir esta dívida? Isso também apagará qualquer despesa vinculada a ela.",
      async () => {
        await deleteDebt(id);
      }
    );
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(val);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-slate-50 text-2xl font-bold tracking-tight">Suas Dívidas</Text>
            <Text className="text-slate-400 text-sm">Controle de dívidas parceladas</Text>
          </View>
          <TouchableOpacity
            onPress={handleOpenAddModal}
            className="bg-teal-600/25 border border-teal-500/30 px-4 py-2.5 rounded-xl"
          >
            <Text className="text-teal-400 font-semibold text-xs">+ Nova Dívida</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de dívidas */}
        {debts.length === 0 ? (
          <View className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl items-center mt-4">
            <Text className="text-slate-400 text-center font-medium">
              Nenhuma dívida cadastrada. Bom sinal! 🎉
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {debts.map(debt => (
              <View
                key={debt.id}
                className="bg-slate-900/70 border border-slate-850 p-5 rounded-2xl relative overflow-hidden"
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 pr-4">
                    <Text className="text-slate-50 font-extrabold text-lg tracking-tight mb-1">
                      {debt.name}
                    </Text>
                    <View className="flex-row gap-2 mt-1">
                      {debt.category && (
                        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-800/80 px-2.5 py-1 rounded-md self-start">
                          {debt.category}
                        </Text>
                      )}
                      {debt.isCreditCard && (
                        <View className="bg-teal-650/20 border border-teal-500/30 px-2.5 py-1 rounded-md self-start">
                          <Text className="text-teal-400 text-xs font-semibold uppercase tracking-wider">Cartão</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text className="text-rose-400 font-extrabold text-lg">
                    {formatCurrency(debt.installmentValue)}/mês
                  </Text>
                </View>

                <View className="flex-row justify-between items-center py-2.5 border-t border-b border-slate-800/60 my-2">
                  <View>
                    <Text className="text-slate-500 text-[10px] uppercase font-semibold">Restam</Text>
                    <Text className="text-slate-200 font-bold text-sm">
                      {debt.remainingInstallments} de {debt.totalInstallments} parcelas
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-slate-500 text-[10px] uppercase font-semibold">Total Pendente</Text>
                    <Text className="text-rose-300 font-bold text-sm">
                      {formatCurrency(debt.installmentValue * debt.remainingInstallments)}
                    </Text>
                  </View>
                </View>

                {/* Ações */}
                <View className="flex-row justify-end gap-3 mt-3">
                  <TouchableOpacity
                    onPress={() => handleOpenEditModal(debt)}
                    className="bg-slate-800 px-3.5 py-2 rounded-lg"
                  >
                    <Text className="text-slate-300 font-semibold text-xs">Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(debt.id)}
                    className="bg-rose-950/60 border border-rose-900/50 px-3.5 py-2 rounded-lg"
                  >
                    <Text className="text-rose-400 font-semibold text-xs">Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <Modal visible={isModalOpen} animationType="slide" transparent>
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-slate-900 rounded-t-3xl p-6 border-t border-slate-800">
              <Text className="text-slate-50 text-xl font-bold mb-4">
                {editingDebt ? "Editar Dívida" : "Cadastrar Nova Dívida"}
              </Text>

              <View className="mb-4">
                <Text className="text-slate-400 mb-2">Nome da Dívida *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex: Celular, Cartão de Crédito"
                  placeholderTextColor="#808080"
                  className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium"
                />
              </View>

              <View className="mb-4">
                <Text className="text-slate-400 mb-2">Valor da Parcela (R$) *</Text>
                <TextInput
                  value={installmentValue}
                  onChangeText={setInstallmentValue}
                  keyboardType="numeric"
                  placeholder="Ex: 199.90"
                  placeholderTextColor="#808080"
                  className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium"
                />
              </View>

              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text className="text-slate-400 mb-2">Parcelas Totais *</Text>
                  <TextInput
                    value={totalInstallments}
                    onChangeText={handleTotalInstallmentsChange}
                    keyboardType="numeric"
                    placeholder="Ex: 12"
                    placeholderTextColor="#808080"
                    className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 mb-2">Restantes *</Text>
                  <TextInput
                    value={remainingInstallments}
                    onChangeText={setRemainingInstallments}
                    keyboardType="numeric"
                    placeholder="Ex: 8"
                    placeholderTextColor="#808080"
                    className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium"
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-slate-400 mb-2">Data da Compra</Text>
                {Platform.OS === "web" ? (
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    style={{
                      backgroundColor: "rgb(var(--color-bg))",
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: "rgb(var(--color-border))",
                      borderRadius: 12,
                      padding: 12,
                      color: "rgb(var(--color-text))",
                      fontWeight: "500",
                      fontFamily: "inherit",
                      fontSize: 14,
                      outline: "none",
                      width: "100%",
                      boxSizing: "border-box"
                    }}
                  />
                ) : (
                  <TextInput
                    value={startDate}
                    onChangeText={handleStartDateChange}
                    placeholder="Ex: 2026-01-10"
                    placeholderTextColor="#808080"
                    className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium"
                  />
                )}
                <Text className="text-[10px] text-slate-500 mt-1">Calcula automaticamente as parcelas restantes se preenchido.</Text>
              </View>

              <View className="mb-4 flex-row items-center justify-between bg-slate-950 border border-slate-850 rounded-xl p-3">
                <Text className="text-slate-400 text-xs font-semibold">Pagar com Cartão de Crédito?</Text>
                <TouchableOpacity
                  onPress={() => setIsCreditCard(!isCreditCard)}
                  className={`w-12 h-6 rounded-full p-1 ${isCreditCard ? "bg-teal-650 items-end" : "bg-slate-800 items-start"}`}
                >
                  <View className="w-4 h-4 rounded-full bg-slate-950" />
                </TouchableOpacity>
              </View>

              <View className="mb-6">
                <Text className="text-slate-400 mb-2">Categoria (Opcional)</Text>
                <TextInput
                  value={category}
                  onChangeText={setCategory}
                  placeholder="Ex: Eletrônicos, Lazer, Saúde"
                  placeholderTextColor="#808080"
                  className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium"
                />
              </View>

              <View className="flex-row gap-4">
                <TouchableOpacity
                  onPress={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-800 py-3 rounded-xl items-center"
                >
                  <Text className="text-slate-300 font-semibold">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  className="flex-1 bg-teal-600 py-3 rounded-xl items-center"
                >
                  <Text className="text-on-accent font-semibold">Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
