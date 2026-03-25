import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

import { api } from "@/api/client";
import { uploadFile } from "@/api/storage";
import { useAuthStore } from "@/stores/auth";
import { COLORS } from "@/constants/theme";

// ── Types ───────────────────────────────────────────────────────────────

interface VerificationStatus {
  is_verified: boolean;
  progress: number;
  badges: Record<string, string>;
  missing: string[];
}

interface BadgeStep {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  actionLabel: string;
  type: "otp" | "upload" | "camera";
  otpEndpoint?: string;
  uploadFolder?: string;
}

// ── Step definitions per account type ───────────────────────────────────

const ADDRESS_STEP: BadgeStep = {
  key: "address_verified",
  label: "Address",
  icon: "location-outline",
  description:
    "Upload a utility bill or bank statement dated within the last 3 months. No screenshots or edited documents.",
  actionLabel: "Upload Proof of Address",
  type: "upload",
  uploadFolder: "verification/address",
};

const INDIVIDUAL_STEPS: BadgeStep[] = [
  {
    key: "phone_verified",
    label: "Phone",
    icon: "call-outline",
    description: "Verify your phone number via SMS code",
    actionLabel: "Verify Phone",
    type: "otp",
    otpEndpoint: "/api/verification/phone/send",
  },
  {
    key: "email_verified",
    label: "Email",
    icon: "mail-outline",
    description: "Verify your email address via code",
    actionLabel: "Verify Email",
    type: "otp",
    otpEndpoint: "/api/verification/email/send",
  },
  {
    key: "id_verified",
    label: "Government ID",
    icon: "shield-checkmark-outline",
    description:
      "Upload government-issued ID (TRN, passport, or driver's licence)",
    actionLabel: "Upload ID",
    type: "upload",
    uploadFolder: "verification/id",
  },
  {
    key: "face_verified",
    label: "Face Scan",
    icon: "scan-outline",
    description: "Take a selfie to match your ID photo",
    actionLabel: "Start Face Scan",
    type: "camera",
  },
  ADDRESS_STEP,
];

const ORGANIZATION_STEPS: BadgeStep[] = [
  {
    key: "phone_verified",
    label: "Phone",
    icon: "call-outline",
    description: "Verify your business phone number",
    actionLabel: "Verify Phone",
    type: "otp",
    otpEndpoint: "/api/verification/phone/send",
  },
  {
    key: "email_verified",
    label: "Email",
    icon: "mail-outline",
    description: "Verify your business email address",
    actionLabel: "Verify Email",
    type: "otp",
    otpEndpoint: "/api/verification/email/send",
  },
  {
    key: "company_docs",
    label: "Company Docs",
    icon: "document-text-outline",
    description:
      "Upload Certificate of Incorporation, TRN, or business registration",
    actionLabel: "Upload Documents",
    type: "upload",
    uploadFolder: "verification/company",
  },
  {
    key: "business_background",
    label: "Background",
    icon: "person-circle-outline",
    description: "Complete business background verification",
    actionLabel: "Upload Documents",
    type: "upload",
    uploadFolder: "verification/background",
  },
  ADDRESS_STEP,
];

const SCHOOL_STEPS: BadgeStep[] = [
  {
    key: "phone_verified",
    label: "Phone",
    icon: "call-outline",
    description: "Verify your school phone number",
    actionLabel: "Verify Phone",
    type: "otp",
    otpEndpoint: "/api/verification/phone/send",
  },
  {
    key: "email_verified",
    label: "Email",
    icon: "mail-outline",
    description: "Verify your school email address",
    actionLabel: "Verify Email",
    type: "otp",
    otpEndpoint: "/api/verification/email/send",
  },
  {
    key: "school_registration",
    label: "Registration",
    icon: "school-outline",
    description:
      "Upload Ministry of Education registration or school charter",
    actionLabel: "Upload Registration",
    type: "upload",
    uploadFolder: "verification/school",
  },
  {
    key: "authorized_rep",
    label: "Representative",
    icon: "person-circle-outline",
    description: "Verify authorized representative identity",
    actionLabel: "Upload ID",
    type: "upload",
    uploadFolder: "verification/rep",
  },
  ADDRESS_STEP,
];

const HIRER_STEPS: BadgeStep[] = [
  {
    key: "phone_verified",
    label: "Phone",
    icon: "call-outline",
    description: "Verify your phone number via SMS code",
    actionLabel: "Verify Phone",
    type: "otp",
    otpEndpoint: "/api/verification/phone/send",
  },
  {
    key: "email_verified",
    label: "Email",
    icon: "mail-outline",
    description: "Verify your email address via code",
    actionLabel: "Verify Email",
    type: "otp",
    otpEndpoint: "/api/verification/email/send",
  },
  {
    key: "id_verified",
    label: "Government ID",
    icon: "shield-checkmark-outline",
    description: "Upload government-issued ID (TRN, passport, or driver's licence)",
    actionLabel: "Upload ID",
    type: "upload",
    uploadFolder: "verification/id",
  },
  ADDRESS_STEP,
];

const REQUIRED_MAP: Record<string, string[]> = {
  individual_provider: [
    "phone_verified",
    "email_verified",
    "id_verified",
    "face_verified",
    "address_verified",
  ],
  individual_hirer: [
    "phone_verified",
    "email_verified",
    "id_verified",
    "address_verified",
  ],
  organization_provider: [
    "phone_verified",
    "email_verified",
    "company_docs",
    "address_verified",
  ],
  organization_hirer: [
    "phone_verified",
    "email_verified",
    "company_docs",
    "address_verified",
  ],
  school_provider: [
    "phone_verified",
    "email_verified",
    "school_registration",
    "address_verified",
  ],
  school_hirer: [
    "phone_verified",
    "email_verified",
    "school_registration",
    "address_verified",
  ],
};

function getStepsForUser(user: { activeRole?: string; role?: string } | null): {
  steps: BadgeStep[];
  required: string[];
} {
  // Mobile auth store doesn't expose account_type yet — default to individual
  const accountType: string = "individual";
  const role = user?.activeRole || user?.role || "user";
  const isHirer = role === "user" || role === "hirer";

  const key = `${accountType}_${isHirer ? "hirer" : "provider"}`;
  const required = REQUIRED_MAP[key] || REQUIRED_MAP.individual_hirer;

  if (accountType === "organization") return { steps: ORGANIZATION_STEPS, required };
  if (accountType === "school") return { steps: SCHOOL_STEPS, required };
  if (isHirer) return { steps: HIRER_STEPS, required };
  return { steps: INDIVIDUAL_STEPS, required };
}

// ── Status helpers ──────────────────────────────────────────────────────

function statusIcon(status: string): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case "approved":
      return "checkmark-circle";
    case "pending":
      return "time-outline";
    case "rejected":
      return "close-circle";
    default:
      return "ellipse-outline";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "approved":
      return COLORS.success;
    case "pending":
      return COLORS.warning;
    case "rejected":
      return COLORS.error;
    default:
      return COLORS.gray[400];
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "approved":
      return "Verified";
    case "pending":
      return "Under Review";
    case "rejected":
      return "Rejected — Resubmit";
    default:
      return "Not Started";
  }
}

// ── Main Screen ─────────────────────────────────────────────────────────

export default function VerifyScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [verificationData, setVerificationData] =
    useState<VerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // OTP modal state
  const [otpStep, setOtpStep] = useState<BadgeStep | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Upload state
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const { steps, required } = getStepsForUser(user);
  const badges: Record<string, string> = verificationData?.badges || {};
  const approvedCount = steps.filter((s) => badges[s.key] === "approved").length;
  const progress =
    verificationData?.progress ??
    Math.round((approvedCount / steps.length) * 100);
  const isVerified =
    verificationData?.is_verified ??
    required.every((b) => badges[b] === "approved");

  // Fetch verification status
  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get<VerificationStatus>(
        "/api/verification/status"
      );
      setVerificationData(data);
      setError(null);
    } catch (err) {
      setError("Could not load verification status");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  // ── OTP flow ──────────────────────────────────────────────────────────

  const handleSendOtp = async (step: BadgeStep) => {
    setOtpStep(step);
    setOtpCode("");
    setOtpSent(false);
    setOtpError(null);
    setOtpLoading(true);
    try {
      await api.post(step.otpEndpoint!);
      setOtpSent(true);
    } catch (err) {
      setOtpError("Failed to send verification code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpStep || otpCode.length < 4) return;
    const endpoint =
      otpStep.key === "phone_verified"
        ? "/api/verification/phone/verify"
        : "/api/verification/email/verify";
    setOtpLoading(true);
    setOtpError(null);
    try {
      await api.post(endpoint, { code: otpCode });
      setOtpStep(null);
      fetchStatus();
    } catch {
      setOtpError("Invalid code. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Upload flow ───────────────────────────────────────────────────────

  const handleUpload = async (step: BadgeStep) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      setUploadingKey(step.key);
      const uri = result.assets[0].uri;
      await uploadFile(uri, step.uploadFolder || "verification");
      // Notify backend of the verification upload
      await api.post(`/api/verification/${step.key}/submit`);
      setUploadingKey(null);
      fetchStatus();
    } catch {
      setUploadingKey(null);
      Alert.alert("Upload Failed", "Could not upload the document. Please try again.");
    }
  };

  // ── Camera flow (face scan) ───────────────────────────────────────────

  const handleCamera = async (step: BadgeStep) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Access Required",
        "Please allow camera access in your device settings to complete face verification."
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
        cameraType: ImagePicker.CameraType.front,
      });
      if (result.canceled || !result.assets?.[0]) return;

      setUploadingKey(step.key);
      const uri = result.assets[0].uri;
      await uploadFile(uri, "verification/face");
      await api.post(`/api/verification/${step.key}/submit`);
      setUploadingKey(null);
      fetchStatus();
    } catch {
      setUploadingKey(null);
      Alert.alert("Upload Failed", "Could not capture photo. Please try again.");
    }
  };

  // ── Action handler ────────────────────────────────────────────────────

  const handleStepAction = (step: BadgeStep, currentStatus: string) => {
    if (currentStatus === "approved" || currentStatus === "pending") return;

    switch (step.type) {
      case "otp":
        handleSendOtp(step);
        break;
      case "upload":
        handleUpload(step);
        break;
      case "camera":
        handleCamera(step);
        break;
    }
  };

  // ── Progress bar color ────────────────────────────────────────────────

  const progressBarBg = isVerified
    ? COLORS.success
    : progress >= 60
    ? COLORS.warning
    : COLORS.error;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">
          Verify Your Account
        </Text>
        <Text className="text-sm text-gray-500 mt-1">
          Complete each step to unlock all platform features.
        </Text>
      </View>

      {/* Progress Card */}
      <View
        className={`mx-5 mt-3 p-4 rounded-2xl border ${
          isVerified
            ? "bg-green-50 border-green-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <Ionicons
              name={isVerified ? "checkmark-circle" : "alert-circle"}
              size={20}
              color={isVerified ? COLORS.success : COLORS.warning}
            />
            <Text className="text-sm font-semibold text-gray-900">
              {isVerified ? "Account Verified" : "Verification Progress"}
            </Text>
          </View>
          <Text
            className="text-lg font-bold"
            style={{ color: isVerified ? COLORS.success : COLORS.warning }}
          >
            {progress}%
          </Text>
        </View>
        <View className="h-3 bg-white/60 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{ width: `${progress}%`, backgroundColor: progressBarBg }}
          />
        </View>
        <Text className="text-xs text-gray-600 mt-2">
          {isVerified
            ? "Your account is fully verified."
            : `${approvedCount} of ${steps.length} steps completed.`}
        </Text>
      </View>

      {/* Loading */}
      {isLoading && (
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="text-gray-500 mt-3">Loading verification status...</Text>
        </View>
      )}

      {/* Error */}
      {error && !isLoading && (
        <View className="mx-5 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <Text className="text-red-700 text-sm">{error}</Text>
          <Pressable onPress={fetchStatus} className="mt-2">
            <Text className="text-red-600 font-semibold text-sm">Tap to retry</Text>
          </Pressable>
        </View>
      )}

      {/* Step Cards */}
      {!isLoading && (
        <View className="px-5 mt-4 gap-3">
          {steps.map((step) => {
            const currentStatus = badges[step.key] || "missing";
            const isRequired = required.includes(step.key);
            const isUploading = uploadingKey === step.key;
            const canAct =
              currentStatus !== "approved" && currentStatus !== "pending";

            return (
              <Pressable
                key={step.key}
                onPress={() => handleStepAction(step, currentStatus)}
                disabled={!canAct || isUploading}
                className={`p-4 rounded-xl border ${
                  currentStatus === "approved"
                    ? "bg-green-50 border-green-200"
                    : currentStatus === "pending"
                    ? "bg-yellow-50 border-yellow-200"
                    : currentStatus === "rejected"
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-gray-200"
                }`}
              >
                <View className="flex-row items-start gap-3">
                  {/* Icon */}
                  <View
                    className={`p-2.5 rounded-xl ${
                      currentStatus === "approved"
                        ? "bg-green-100"
                        : currentStatus === "pending"
                        ? "bg-yellow-100"
                        : currentStatus === "rejected"
                        ? "bg-red-100"
                        : "bg-gray-100"
                    }`}
                  >
                    <Ionicons
                      name={step.icon}
                      size={22}
                      color={statusColor(currentStatus)}
                    />
                  </View>

                  {/* Content */}
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-base font-semibold text-gray-900">
                        {step.label}
                      </Text>
                      {isRequired && currentStatus !== "approved" && (
                        <Text className="text-xs text-red-400">Required</Text>
                      )}
                    </View>
                    <Text className="text-xs text-gray-500 mt-0.5 leading-4">
                      {step.description}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-1.5">
                      <Ionicons
                        name={statusIcon(currentStatus)}
                        size={14}
                        color={statusColor(currentStatus)}
                      />
                      <Text
                        className="text-xs font-medium"
                        style={{ color: statusColor(currentStatus) }}
                      >
                        {statusLabel(currentStatus)}
                      </Text>
                    </View>

                    {isUploading && (
                      <View className="flex-row items-center gap-2 mt-2">
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text className="text-xs text-gray-500">Uploading...</Text>
                      </View>
                    )}
                  </View>

                  {/* Action indicator */}
                  {canAct && !isUploading && (
                    <View className="justify-center">
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={COLORS.gray[400]}
                      />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Info */}
      <View className="mx-5 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Text className="text-sm font-medium text-blue-800 mb-1">
          Why verification matters
        </Text>
        <Text className="text-xs text-blue-700 leading-4">
          Verification protects everyone on Jobsy. Verified providers get more
          bookings, and verified hirers can enter trusted contracts. All uploaded
          documents are encrypted and handled in compliance with Jamaica's Data
          Protection Act.
        </Text>
      </View>

      {/* OTP Modal */}
      <Modal
        visible={!!otpStep}
        transparent
        animationType="slide"
        onRequestClose={() => setOtpStep(null)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">
                {otpStep?.label} Verification
              </Text>
              <Pressable onPress={() => setOtpStep(null)}>
                <Ionicons name="close" size={24} color={COLORS.gray[600]} />
              </Pressable>
            </View>

            {!otpSent ? (
              <>
                <Text className="text-sm text-gray-600 mb-4">
                  {otpStep?.description}
                </Text>
                {otpError && (
                  <Text className="text-sm text-red-600 mb-3 bg-red-50 p-2 rounded-lg">
                    {otpError}
                  </Text>
                )}
                {otpLoading ? (
                  <ActivityIndicator
                    size="large"
                    color={COLORS.primary}
                    style={{ marginVertical: 16 }}
                  />
                ) : (
                  <Pressable
                    onPress={() => otpStep && handleSendOtp(otpStep)}
                    className="bg-green-700 py-3.5 rounded-xl items-center"
                  >
                    <Text className="text-white font-semibold text-base">
                      Send Code
                    </Text>
                  </Pressable>
                )}
              </>
            ) : (
              <>
                <Text className="text-sm text-gray-600 mb-4">
                  We sent a verification code to your{" "}
                  {otpStep?.key === "phone_verified" ? "phone" : "email"}.
                  Enter it below.
                </Text>
                <TextInput
                  value={otpCode}
                  onChangeText={(t) => setOtpCode(t.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit code"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  className="border border-gray-300 rounded-xl px-4 py-3.5 text-center text-2xl tracking-widest font-mono mb-4"
                />
                {otpError && (
                  <Text className="text-sm text-red-600 mb-3 bg-red-50 p-2 rounded-lg">
                    {otpError}
                  </Text>
                )}
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => {
                      setOtpSent(false);
                      setOtpError(null);
                      if (otpStep) handleSendOtp(otpStep);
                    }}
                    className="flex-1 py-3.5 rounded-xl items-center bg-gray-100"
                  >
                    <Text className="text-gray-700 font-semibold">Resend</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleVerifyOtp}
                    disabled={otpLoading || otpCode.length < 4}
                    className={`flex-1 py-3.5 rounded-xl items-center ${
                      otpCode.length >= 4 ? "bg-green-700" : "bg-gray-300"
                    }`}
                  >
                    {otpLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white font-semibold">Verify</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
