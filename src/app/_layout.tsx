import { Tabs, DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Colors, Fonts } from '@/constants/theme';
import { RouteErrorFallback } from '@/components/ui/route-error-fallback';
import { initSentry } from '@/constants/sentry';

SplashScreen.preventAutoHideAsync();
initSentry();

/* Boundary raiz (auditoria Codex EH-01, nivel 1 — ultima red): solo protege
   ThemeProvider/Tabs, no intenta reconstruir estado de ninguna pantalla
   (EH-05). Si una ruta individual ya exporta su propio ErrorBoundary
   (index/observations/review/node/[id]/explore), ese boundary mas cercano
   captura primero — este solo entra si el fallo viene del shell mismo. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return <RouteErrorFallback error={error} retry={retry} showBackToLibrary={false} />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.dark.dock,
            borderTopColor: Colors.dark.border,
            position: 'absolute',
          },
          tabBarActiveTintColor: Colors.dark.violet,
          tabBarInactiveTintColor: Colors.dark.textFaint,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Library',
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} size={22} tintColor={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="observations"
          options={{
            title: 'Synthesis',
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'square.and.pencil', android: 'edit_note', web: 'edit_note' }} size={22} tintColor={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="review"
          options={{
            title: 'Review',
            tabBarIcon: ({ color }) => (
              <SymbolView name={{ ios: 'rectangle.stack.fill', android: 'fact_check', web: 'fact_check' }} size={22} tintColor={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="node/[id]"
          options={{
            href: null, // Ocultar del tab bar
            headerShown: true, // Mostrar header para poder volver
            title: 'Reading',
            headerStyle: { backgroundColor: Colors.dark.background },
            headerTintColor: Colors.dark.violet,
            headerTitleStyle: { color: Colors.dark.text, fontFamily: Fonts.serif },
          }}
        />
      </Tabs>
    </ThemeProvider>
  );
}
