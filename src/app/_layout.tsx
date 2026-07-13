import { Tabs, DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Colors, Fonts } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

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
