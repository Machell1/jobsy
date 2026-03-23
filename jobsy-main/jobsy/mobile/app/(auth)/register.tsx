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
import { isValidPhone, isValidPassword } from "@/utils/validators";
import type { UserRole } from "@/api/auth";

const ROLE_OPTIONS: { value: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { value: "user", label: "Client", icon: "search-outline", desc: "Looking for services" },
  { value: "provider", label: "Provider", icon: "construct-outline", desc: "Offering services" },
  { value: "hirer", label: "Hirer", icon: "briefcase-outline", desc: "Posting jobs" },
];

type AccountType = "individual" | "organization" | "school";
type OrgType = "" | "business" | "NGO" | "school" | "government";

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "individual", label: "Individual", icon: "person-outline" },
  { value: "organization", label: "Organization", icon: "business-outline" },
  { value: "school", label: "School", icon: "school-outline" },
];

const ORG_TYPE_OPTIONS: { value: OrgType; label: string }[] = [
  { value: "", label: "Select type..." },
  { value: "business", label: "Business" },
  { value: "NGO", label: "NGO" },
  { value: "school", label: "School" },
  { value: "government", label: "Government" },
];

export default function RegisterScreen() {
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("+1876");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [orgName, setOrgName] = useState("");
  const [orgRegistrationNumber, setOrgRegistrationNumber] = useState("");
  const [orgType, setOrgType] = useState<OrgType>("");
  const [orgRepresentativeName, setOrgRepresentativeName] = useState("");
  const [orgRepresentativeTitle, setOrgRepresentativeTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);

  const handleRegister = async () => {
    if (!isValidPhone(phone)) {
      Alert.alert("Invalid Phone", "Enter a valid phone number with country code.");
      return;
    }
    const passError = isValidPassword(password);
    if (passError) {
      Alert.alert("Invalid Password", passError);
      return;
    }
    if (accountType !== "individual" && !orgName.trim()) {
      Alert.alert("Required Field", "Organization name is required for organization and school accounts");
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
        account_type: accountType,
        ...(accountType !== "individual" && {
          org_name: orgName.trim(),
          org_registration_number: orgRegistrationNumber.trim() || undefined,
          org_type: orgType || undefined,
          org_representative_name: orgRepresentativeName.trim() || undefined,
          org_representative_title: orgRepresentativeTitle.trim() || undefined,
        }),
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

          {/* Account Type Selector */}
          <Text className="mb-2 text-sm font-medium text-dark-700">Account Type</Text>
          <View className="mb-4 flex-row gap-3">
            {ACCOUNT_TYPE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setAccountType(opt.value)}
                className={`flex-1 items-center rounded-xl border-2 py-3 ${
                  accountType === opt.value ? "border-primary-900 bg-primary-50" : "border-dark-200"
                }`}
              >
                <Ionicons
                  name={opt.icon}
                  size={22}
                  color={accountType === opt.value ? COLORS.primary : COLORS.gray[500]}
                />
                <Text
                  className={`mt-1 text-xs font-medium ${
                    accountType === opt.value ? "text-primary-900" : "text-dark-500"
                  }`}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Organization / School Fields */}
          {accountType !== "individual" && (
            <View className="mb-4 rounded-xl border border-dark-200 bg-dark-50 p-4">
              <Text className="mb-3 text-sm font-semibold text-dark-700">
                {accountType === "school" ? "School" : "Organization"} Details
              </Text>

              {/* Org Name (required) */}
              <Text className="mb-1 text-sm font-medium text-dark-700">
                {accountType === "school" ? "School" : "Organization"} Name *
              </Text>
              <View className="mb-3 flex-row items-center rounded-xl border border-dark-200 bg-white px-4 py-3">
                <Ionicons name="business-outline" size={20} color={COLORS.gray[500]} />
                <TextInput
                  value={orgName}
                  onChangeText={setOrgName}
                  placeholder={accountType === "school" ? "School name" : "Organization name"}
                  className="ml-3 flex-1 text-base text-dark-800"
                />
              </View>

              {/* Registration Number */}
              <Text className="mb-1 text-xs text-dark-500">Registration Number (optional)</Text>
              <View className="mb-3 flex-row items-center rounded-xl border border-dark-200 bg-white px-4 py-2.5">
                <TextInput
                  value={orgRegistrationNumber}
                  onChangeText={setOrgRegistrationNumber}
                  placeholder="e.g. TRN or registration #"
                  className="flex-1 text-sm text-dark-800"
                />
              </View>

              {/* Org Type Picker */}
              <Text className="mb-1 text-xs text-dark-500">Type (optional)</Text>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {ORG_TYPE_OPTIONS.filter((o) => o.value !== "").map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setOrgType(orgType === opt.value ? "" : opt.value)}
                    className={`rounded-lg border px-3 py-2 ${
                      orgType === opt.value
                        ? "border-primary-900 bg-primary-50"
                        : "border-dark-200 bg-white"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        orgType === opt.value ? "text-primary-900" : "text-dark-600"
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Representative Name */}
              <Text className="mb-1 text-xs text-dark-500">Representative Name (optional)</Text>
              <View className="mb-3 flex-row items-center rounded-xl border border-dark-200 bg-white px-4 py-2.5">
                <TextInput
                  value={orgRepresentativeName}
                  onChangeText={setOrgRepresentativeName}
                  placeholder="Contact person's name"
                  autoCapitalize="words"
                  className="flex-1 text-sm text-dark-800"
                />
              </View>

              {/* Representative Title */}
              <Text className="mb-1 text-xs text-dark-500">Representative Title (optional)</Text>
              <View className="mb-3 flex-row items-center rounded-xl border border-dark-200 bg-white px-4 py-2.5">
                <TextInput
                  value={orgRepresentativeTitle}
                  onChangeText={setOrgRepresentativeTitle}
                  placeholder="e.g. Principal, Manager"
                  autoCapitalize="words"
                  className="flex-1 text-sm text-dark-800"
                />
              </View>
            </View>
          )}

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
          <View className="mb-4">
            <PhoneInput
              value={phone}
              onChange={setPhone}
              placeholder="Enter phone number"
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
