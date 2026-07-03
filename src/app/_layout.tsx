import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  // Nexus Dark theme header
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#05060E' },
          headerTintColor: '#A78BFA',
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', color: '#F4F6FB' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Library', headerShown: false }} />
        <Stack.Screen name="node/[id]" options={{ title: 'Reading & Synthesis', presentation: 'card' }} />
      </Stack>
    </ThemeProvider>
  );
}
