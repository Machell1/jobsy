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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { PhoneInput } from "@/components/PhoneInput";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";
import * as authApi from "@/api/auth";
import { isValidPhone } from "@/utils/validators";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const resetPassword = useAuthStore((s) => s.resetPassword);

  // Step 1: Request OTP
  const [phone, setPhone] = useState("+1876");
  const [sendingOtp, setSendingOtp] = useState(false);

  // Step 2: Verify OTP + new password
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const handleSendOtp = async () => {
    if (!isValidPhone(phone)) {
      Alert.alert("Invalid Phone", "Enter a valid phone number with country code.");
      return;
    }

    setSendingOtp(true);
    try {
      await authApi.forgotPassword(phone);
      setStep(2);
    } catch {
      Alert.alert("Error", "Failed to send reset code. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetPassword = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid Code", "Enter the 6-digit code sent to your phone.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Invalid Password", "Password must be at least 8 characters.");
      return;
    }

    setResetting(true);
    try {
      await resetPassword({ phone, otp, new_password: newPassword });
      // Auth store auto-logs in, AuthGuard will redirect to tabs
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Reset failed. Check your code and try again.";
      Alert.alert("Reset Failed", message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-8">
        {/* Back button */}
        <Pressable onPress={() => router.back()} className="absolute left-8 top-16">
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </Pressable>

        <View className="mb-8 items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
            <Ionicons name="key-outline" size={32} color={COLORS.primary} />
          </View>
          <Text className="text-2xl font-extrabold text-primary-900">
            {step === 1 ? "Reset Password" : "Enter Code"}
          </Text>
          <Text className="mt-2 text-center text-sm text-dark-500">
            {step === 1
              ? "Enter your phone number and we'll send you a reset code."
              : `A 6-digit code was sent to ${phone}`}
          </Text>
        </View>

        {step === 1 ? (
          <>
            <Text className="mb-1.5 text-sm font-medium text-dark-700">Phone Number</Text>
            <View className="mb-6">
              <PhoneInput
                value={phone}
                onChange={setPhone}
                placeholder="Enter phone number"
              />
            </View>

            <Pressable
              onPress={handleSendOtp}
              disabled={sendingOtp}
              className={`items-center rounded-xl py-4 ${
                sendingOtp ? "bg-primary-300" : "bg-primary-900"
              }`}
            >
              <Text className="text-base font-bold text-white">
                {sendingOtp ? "Sending..." : "Send Reset Code"}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="mb-1.5 text-sm font-medium text-dark-700">Reset Code</Text>
            <View className="mb-4 flex-row items-center rounded-xl border border-dark-200 bg-dark-50 px-4 py-3">
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.gray[500]} />
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="123456"
                keyboardType="number-pad"
                className="ml-3 flex-1 text-base text-dark-800"
                maxLength={6}
              />
            </View>

            <Text className="mb-1.5 text-sm font-medium text-dark-700">New Password</Text>
            <View className="mb-6 flex-row items-center rounded-xl border border-dark-200 bg-dark-50 px-4 py-3">
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray[500]} />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                className="ml-3 flex-1 text-base text-dark-800"
              />
            </View>

            <Pressable
              onPress={handleResetPassword}
              disabled={resetting}
              className={`items-center rounded-xl py-4 ${
                resetting ? "bg-primary-300" : "bg-primary-900"
              }`}
            >
              <Text className="text-base font-bold text-white">
                {resetting ? "Resetting..." : "Reset Password"}
              </Text>
            </Pressable>

            <Pressable onPress={() => setStep(1)} className="mt-4 items-center">
              <Text className="text-sm text-primary-900">Didn&apos;t get the code? Send again</Text>
            </Pressable>
          </>
        )}

        <Pressable onPress={() => router.back()} className="mt-6 items-center">
          <Text className="text-sm text-dark-500">Back to Sign In</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
