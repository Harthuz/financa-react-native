import { useEffect } from 'react';
import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { useFinanceStore } from '@/stores/financeStore';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
  const initializeStore = useFinanceStore(state => state.initialize);
  const initialized = useFinanceStore(state => state.initialized);
  const themeMode = useFinanceStore(state => state.settings?.themeMode || 'dark');

  useEffect(() => {
    initializeStore();
  }, []);

  useEffect(() => {
    if (initialized) {
      SplashScreen.hideAsync();
    }
  }, [initialized]);

  useEffect(() => {
    if (themeMode === 'light' || themeMode === 'dark') {
      setColorScheme(themeMode);
    }
  }, [themeMode, initialized]);

  if (!initialized) {
    return null; // Mantém a splash screen visível
  }

  const activeScheme = themeMode === 'dark' ? 'dark' : 'light';

  return (
    <ThemeProvider value={activeScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1, backgroundColor: activeScheme === 'dark' ? '#0A0A0A' : '#FFFFFF' }}>
        <AnimatedSplashOverlay />
        <AppTabs />
      </View>
    </ThemeProvider>
  );
}

