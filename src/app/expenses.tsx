import { ExpenseInput } from "@/financeEngine/engine";
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

export default function ExpensesScreen() {
  const { expenses, debts, addExpense, updateExpense, deleteExpense } = useFinanceStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseInput | null>(null);

  // Campos do formulário
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [debtId, setDebtId] = useState<number | null>(null);
  const [isCreditCard, setIsCreditCard] = useState(false);

  // Controle do seletor de dívida
  const [showDebtSelector, setShowDebtSelector] = useState(false);

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setName("");
    setValue("");
    setDueDate("");
    setDebtId(null);
    setIsCreditCard(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exp: ExpenseInput) => {
    setEditingExpense(exp);
    setName(exp.name);
    setValue(exp.value.toString());
    setDueDate(exp.dueDate?.toString() || "");
    setDebtId(exp.debtId || null);
    setIsCreditCard(!!exp.isCreditCard);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name || !value) {
      alert("Por favor, preencha o nome e o valor da despesa.");
      return;
    }

    const valNum = parseFloat(value) || 0;
    const dueNum = parseInt(dueDate) || null;

    if (valNum <= 0) {
      alert("O valor deve ser maior que zero.");
      return;
    }

    if (editingExpense) {
      await updateExpense({
        ...editingExpense,
        name,
        value: valNum,
        dueDate: dueNum,
        debtId: debtId,
        isCreditCard
      });
    } else {
      await addExpense({
        name,
        value: valNum,
        dueDate: dueNum,
        debtId: debtId,
        active: true,
        isRecurring: true,
        isCreditCard
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    confirmAction(
      "Excluir Gasto",
      "Tem certeza que deseja excluir este gasto recorrente?",
      async () => {
        await deleteExpense(id);
      }
    );
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(val);
  };

  const selectedDebtName = debtId
    ? debts.find(d => d.id === debtId)?.name || "Dívida não encontrada"
    : "Nenhuma (Gasto Permanente)";

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-slate-50 text-2xl font-bold tracking-tight">Gastos Recorrentes</Text>
            <Text className="text-slate-400 text-sm">Gerenciamento de despesas fixas</Text>
          </View>
          <TouchableOpacity
            onPress={handleOpenAddModal}
            className="bg-teal-600/25 border border-teal-500/30 px-4 py-2.5 rounded-xl"
          >
            <Text className="text-teal-400 font-semibold text-xs">+ Novo Gasto</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de gastos */}
        {expenses.length === 0 ? (
          <View className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl items-center mt-4">
            <Text className="text-slate-400 text-center font-medium">
              Nenhum gasto recorrente cadastrado.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {expenses.map(exp => {
              const linkedDebt = exp.debtId ? debts.find(d => d.id === exp.debtId) : null;
              return (
                <View
                  key={exp.id}
                  className="bg-slate-900/70 border border-slate-850 p-5 rounded-2xl"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 pr-4">
                      <Text className="text-slate-50 font-extrabold text-lg tracking-tight mb-1">
                        {exp.name}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        {exp.dueDate && (
                          <Text className="text-slate-400 text-xs">Vence dia {exp.dueDate}</Text>
                        )}
                        {exp.isCreditCard && (
                          <View className="bg-teal-650/20 border border-teal-500/30 px-2 py-0.5 rounded">
                            <Text className="text-teal-400 text-[10px] font-bold uppercase tracking-wider">Cartão</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text className="text-teal-400 font-extrabold text-lg">
                      {formatCurrency(exp.value)}
                    </Text>
                  </View>

                  {/* Vínculo de Dívida */}
                  {linkedDebt && (
                    <View className="bg-amber-950/20 border border-amber-900/40 px-3 py-2 rounded-xl mt-2 mb-1">
                      <Text className="text-amber-400 text-xs font-medium">
                        🔗 Vinculado à dívida: <Text className="font-bold">{linkedDebt.name}</Text>
                      </Text>
                      <Text className="text-slate-500 text-[10px] mt-0.5">
                        Este gasto sumirá automaticamente quando a dívida for quitada.
                      </Text>
                    </View>
                  )}

                  {/* Ações */}
                  <View className="flex-row justify-end gap-3 mt-4">
                    <TouchableOpacity
                      onPress={() => handleOpenEditModal(exp)}
                      className="bg-slate-800 px-3.5 py-2 rounded-lg"
                    >
                      <Text className="text-slate-300 font-semibold text-xs">Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(exp.id)}
                      className="bg-rose-950/60 border border-rose-900/50 px-3.5 py-2 rounded-lg"
                    >
                      <Text className="text-rose-400 font-semibold text-xs">Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <Modal visible={isModalOpen} animationType="slide" transparent>
          <View className="flex-1 justify-end bg-black/60">
            <View className="bg-slate-900 rounded-t-3xl p-6 border-t border-slate-800 max-h-[90%]">
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="text-slate-50 text-xl font-bold mb-4">
                  {editingExpense ? "Editar Gasto" : "Cadastrar Novo Gasto"}
                </Text>

                <View className="mb-4">
                  <Text className="text-slate-400 mb-2">Nome do Gasto *</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex: Netflix, Academia, Aluguel"
                    placeholderTextColor="#808080"
                    className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-slate-400 mb-2">Valor Mensal (R$) *</Text>
                  <TextInput
                    value={value}
                    onChangeText={setValue}
                    keyboardType="numeric"
                    placeholder="Ex: 129.90"
                    placeholderTextColor="#808080"
                    className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-slate-400 mb-2">Dia do Vencimento (Opcional)</Text>
                  <TextInput
                    value={dueDate}
                    onChangeText={setDueDate}
                    keyboardType="numeric"
                    placeholder="Ex: 10"
                    placeholderTextColor="#808080"
                    className="bg-slate-950 border border-slate-850 p-3 rounded-xl text-slate-50 font-medium"
                  />
                </View>

                {/* Seletor de Dívida Vinculada */}
                <View className="mb-6">
                  <Text className="text-slate-400 mb-2">Vincular a uma Dívida (Opcional)</Text>
                  <TouchableOpacity
                    onPress={() => setShowDebtSelector(!showDebtSelector)}
                    className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl flex-row justify-between items-center"
                  >
                    <Text className="text-slate-50 font-medium">{selectedDebtName}</Text>
                    <Text className="text-slate-400 text-xs">▼</Text>
                  </TouchableOpacity>

                  {showDebtSelector && (
                    <View className="bg-slate-950 border border-slate-850 rounded-xl mt-2 p-2">
                      <TouchableOpacity
                        onPress={() => {
                          setDebtId(null);
                          setShowDebtSelector(false);
                        }}
                        className="p-3 border-b border-slate-900"
                      >
                        <Text className="text-teal-400 font-semibold">Nenhuma (Gasto Permanente)</Text>
                      </TouchableOpacity>

                      {debts.map(d => (
                        <TouchableOpacity
                          key={d.id}
                          onPress={() => {
                            setDebtId(d.id);
                            setShowDebtSelector(false);
                          }}
                          className="p-3 border-b border-slate-900 flex-row justify-between"
                        >
                          <Text className="text-slate-50 font-medium">{d.name}</Text>
                          <Text className="text-slate-500 text-xs">
                            {formatCurrency(d.installmentValue)}/mês
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Opção comprar no cartão de crédito */}
                <View className="mb-6 flex-row items-center justify-between bg-slate-950 border border-slate-850 rounded-xl p-3">
                  <Text className="text-slate-400 text-xs font-semibold">Cobrar na Fatura do Cartão?</Text>
                  <TouchableOpacity
                    onPress={() => setIsCreditCard(!isCreditCard)}
                    className={`w-12 h-6 rounded-full p-1 ${isCreditCard ? "bg-teal-650 items-end" : "bg-slate-800 items-start"}`}
                  >
                    <View className="w-4 h-4 rounded-full bg-slate-950" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row gap-4 mt-2">
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
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
