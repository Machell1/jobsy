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
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";
import { isValidJamaicanPhone, isValidPassword } from "@/utils/validators";
import type { UserRole } from "@/api/auth";

const ROLE_OPTIONS: { value: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { value: "user", label: "Client", icon: "search-outline", desc: "Looking for services" },
  { value: "provider", label: "Provider", icon: "construct-outline", desc: "Offering services" },
  { value: "hirer", label: "Hirer", icon: "briefcase-outline", desc: "Posting jobs" },
];

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("+1876");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
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
        display_name: displayName.trim() || undefined,
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
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-8">
          <View className="mb-8 items-center">
            <Text className="text-3xl font-extrabold text-primary-900">Create Account</Text>
            <Text className="mt-1 text-sm text-dark-500">Join the Jobsy community</Text>
          </View>

          {/* Role picker */}
          <Text className="mb-2 text-sm font-medium text-dark-700">I am a</Text>
          <View className="mb-4 flex-row gap-3">
            {ROLE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setRole(opt.value)}
                className={`flex-1 items-center rounded-xl border-2 py-3 ${
                  role === opt.value ? "border-primary-900 bg-primary-50" : "border-dark-200"
                }`}
              >
                <Ionicons
                  name={opt.icon}
                  size={24}
                  color={role === opt.value ? COLORS.primary : COLORS.gray[500]}
                />
                <Text
                  className={`mt-1 font-medium ${
                    role === opt.value ? "text-primary-900" : "text-dark-500"
                  }`}
                >
                  {opt.label}
                </Text>
                <Text className="text-xs text-dark-400">{opt.desc}</Text>
              </Pressable>
            ))}
          </View>

          {/* Full Name */}
          <Text className="mb-1.5 text-sm font-medium text-dark-700">Full Name</Text>
          <View className="mb-4 flex-row items-center rounded-xl border border-dark-200 bg-dark-50 px-4 py-3">
            <Ionicons name="person-outline" size={20} color={COLORS.gray[500]} />
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your full name"
              autoCapitalize="words"
              className="ml-3 flex-1 text-base text-dark-800"
            />
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

          {/* OAuth buttons */}
          <OAuthButtons role={role} />

          <View className="mt-6 flex-row items-center justify-center pb-8">
            <Text className="text-sm text-dark-500">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text className="text-sm font-bold text-primary-900">Sign In</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
