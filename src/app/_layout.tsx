import { Tabs, Stack, useRouter, usePathname, DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, Platform, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { 
            backgroundColor: 'rgba(16, 21, 38, 0.95)',
            borderTopColor: 'rgba(148, 163, 184, 0.10)',
            position: 'absolute',
          },
          tabBarActiveTintColor: '#A78BFA',
          tabBarInactiveTintColor: '#586176',
        }}
      >
        <Tabs.Screen 
          name="index" 
          options={{ 
            title: 'Library',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⌂</Text>
          }} 
        />
        <Tabs.Screen 
          name="observations" 
          options={{ 
            title: 'Synthesis',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◈</Text>
          }} 
        />
        <Tabs.Screen 
          name="node/[id]" 
          options={{ 
            href: null, // Ocultar del tab bar
            headerShown: true, // Mostrar header para poder volver
            title: 'Reading',
            headerStyle: { backgroundColor: '#05060E' },
            headerTintColor: '#A78BFA',
            headerTitleStyle: { color: '#F4F6FB', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }
          }} 
        />
      </Tabs>
    </ThemeProvider>
  );
}
