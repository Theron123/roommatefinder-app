import { Stack } from "expo-router";

// Define el stack de navegación para las pantallas de autenticación (login, signup, index)
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="index" />
    </Stack>
  );
}