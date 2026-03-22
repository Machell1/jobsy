import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { OAuthButtons } from "@/components/OAuthButtons";
import { PhoneInput } from "@/components/PhoneInput";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";
import { isValidPhone } from "@/utils/validators";

export default function LoginScreen() {
  const [phone, setPhone] = useState("+1876");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleLogin = async () => {
    if (!isValidPhone(phone)) {
      Alert.alert("Invalid Phone", "Enter a valid phone number with country code.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Invalid Password", "Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await login(phone, password);
    } catch (err: unknown) {
      const raw =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "";
      const message =
        raw.toLowerCase().includes("invalid") || raw.toLowerCase().includes("credentials")
          ? "Invalid phone number or password. Please try again."
          : raw || "Login failed. Check your credentials.";
      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-8">
          {/* Logo area */}
          <View className="mb-10 items-center">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl bg-primary-900">
              <Ionicons name="briefcase" size={40} color="white" />
            </View>
            <Text className="text-3xl font-extrabold text-primary-900">Jobsy</Text>
            <Text className="mt-1 text-base text-dark-500">Jamaica&apos;s Service Marketplace</Text>
          </View>

          {/* Phone input */}
          <Text className="mb-1.5 text-sm font-medium text-dark-700">Phone Number</Text>
          <View className="mb-4">
            <PhoneInput
              value={phone}
              onChange={setPhone}
              placeholder="Enter phone number"
            />
          </View>

          {/* Password input */}
          <Text className="mb-1.5 text-sm font-medium text-dark-700">Password</Text>
          <View className="mb-2 flex-row items-center rounded-xl border border-dark-200 bg-dark-50 px-4 py-3">
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[500]} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry
              autoComplete="password"
              className="ml-3 flex-1 text-base text-dark-800"
            />
          </View>

          {/* Forgot password link */}
          <View className="mb-4 items-end">
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable>
                <Text className="text-sm font-medium text-primary-900">Forgot Password?</Text>
              </Pressable>
            </Link>
          </View>

          {/* Login button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className={`items-center rounded-xl py-4 ${loading ? "bg-primary-300" : "bg-primary-900"}`}
          >
            <Text className="text-base font-bold text-white">
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </Pressable>

          {/* OAuth buttons */}
          <OAuthButtons />

          {/* Register link */}
          <View className="mt-6 flex-row items-center justify-center pb-8">
            <Text className="text-sm text-dark-500">Don&apos;t have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text className="text-sm font-bold text-primary-900">Sign Up</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
