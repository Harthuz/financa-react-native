/**
 * Retorna a paleta de cores conforme o tema escolhido nas configurações do app
 * (e não o tema do sistema), mantendo abas e telas visualmente consistentes.
 */

import { Colors } from '@/constants/theme';
import { useFinanceStore } from '@/stores/financeStore';

export function useTheme() {
  const themeMode = useFinanceStore(state => state.settings?.themeMode || 'dark');
  return Colors[themeMode === 'light' ? 'light' : 'dark'];
}
