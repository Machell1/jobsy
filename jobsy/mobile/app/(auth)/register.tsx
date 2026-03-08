import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";
import { isValidJamaicanPhone, isValidPassword } from "@/utils/validators";

export default function RegisterScreen() {
  const [phone, setPhone] = useState("+1876");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "provider">("user");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);

  const handleRegister = async () => {
    if (!isValidJamaicanPhone(phone)) {
      Alert.alert("Invalid Phone", "Enter a valid Jamaican phone number (+1876XXXXXXX)");
      return;
    }
    const passError = isValidPassword(password);
    if (passError) {
      Alert.alert("Invalid Password", passError);
      return;
    }

    setLoading(true);
    try {
      await register({
        phone,
        password,
        email: email || undefined,
        role,
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Registration failed. Please try again.";
      Alert.alert("Registration Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-8">
        <View className="mb-8 items-center">
          <Text className="text-3xl font-extrabold text-primary-900">Create Account</Text>
          <Text className="mt-1 text-sm text-dark-500">Join the Jobsy community</Text>
        </View>

        {/* Role picker */}
        <Text className="mb-2 text-sm font-medium text-dark-700">I am a</Text>
        <View className="mb-4 flex-row gap-3">
          <Pressable
            onPress={() => setRole("user")}
            className={`flex-1 items-center rounded-xl border-2 py-3 ${
              role === "user" ? "border-primary-900 bg-primary-50" : "border-dark-200"
            }`}
          >
            <Ionicons
              name="search-outline"
              size={24}
              color={role === "user" ? COLORS.primary : COLORS.gray[500]}
            />
            <Text
              className={`mt-1 font-medium ${
                role === "user" ? "text-primary-900" : "text-dark-500"
              }`}
            >
              Client
            </Text>
            <Text className="text-xs text-dark-400">Looking for services</Text>
          </Pressable>
          <Pressable
            onPress={() => setRole("provider")}
            className={`flex-1 items-center rounded-xl border-2 py-3 ${
              role === "provider" ? "border-primary-900 bg-primary-50" : "border-dark-200"
            }`}
          >
            <Ionicons
              name="construct-outline"
              size={24}
              color={role === "provider" ? COLORS.primary : COLORS.gray[500]}
            />
            <Text
              className={`mt-1 font-medium ${
                role === "provider" ? "text-primary-900" : "text-dark-500"
              }`}
            >
              Provider
            </Text>
            <Text className="text-xs text-dark-400">Offering services</Text>
          </Pressable>
        </View>

        {/* Phone */}
        <Text className="mb-1.5 text-sm font-medium text-dark-700">Phone Number</Text>
        <View className="mb-4 flex-row items-center rounded-xl border border-dark-200 bg-dark-50 px-4 py-3">
          <Ionicons name="call-outline" size={20} color={COLORS.gray[500]} />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+18761234567"
            keyboardType="phone-pad"
            className="ml-3 flex-1 text-base text-dark-800"
            maxLength={12}
          />
        </View>

        {/* Email (optional) */}
        <Text className="mb-1.5 text-sm font-medium text-dark-700">Email (optional)</Text>
        <View className="mb-4 flex-row items-center rounded-xl border border-dark-200 bg-dark-50 px-4 py-3">
          <Ionicons name="mail-outline" size={20} color={COLORS.gray[500]} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            className="ml-3 flex-1 text-base text-dark-800"
          />
        </View>

        {/* Password */}
        <Text className="mb-1.5 text-sm font-medium text-dark-700">Password</Text>
        <View className="mb-6 flex-row items-center rounded-xl border border-dark-200 bg-dark-50 px-4 py-3">
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[500]} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            className="ml-3 flex-1 text-base text-dark-800"
          />
        </View>

        {/* Register button */}
        <Pressable
          onPress={handleRegister}
          disabled={loading}
          className={`items-center rounded-xl py-4 ${loading ? "bg-primary-300" : "bg-primary-900"}`}
        >
          <Text className="text-base font-bold text-white">
            {loading ? "Creating account..." : "Create Account"}
          </Text>
        </Pressable>

        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-sm text-dark-500">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text className="text-sm font-bold text-primary-900">Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
