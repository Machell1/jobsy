import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { api } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { COLORS } from "@/constants/theme";

// ── Types ────────────────────────────────────────────────────────────────

interface UserSettings {
  notification_preferences: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  privacy: {
    profile_visible: boolean;
    show_phone: boolean;
  };
}

interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// ── Legal/support link definitions ───────────────────────────────────────

const LEGAL_LINKS: { label: string; icon: keyof typeof Ionicons.glyphMap; url: string }[] = [
  {
    label: "Privacy Policy",
    icon: "shield-outline",
    url: "https://jobsyja.com/privacy",
  },
  {
    label: "Terms of Service",
    icon: "document-text-outline",
    url: "https://jobsyja.com/terms",
  },
  {
    label: "Refund Policy",
    icon: "cash-outline",
    url: "https://jobsyja.com/refund-policy",
  },
  {
    label: "Community Guidelines",
    icon: "people-outline",
    url: "https://jobsyja.com/community-guidelines",
  },
];

const SUPPORT_LINKS: { label: string; icon: keyof typeof Ionicons.glyphMap; action: string }[] = [
  { label: "Contact Us", icon: "mail-outline", action: "contact" },
  { label: "Report a Bug", icon: "bug-outline", action: "bug" },
  { label: "FAQs", icon: "help-circle-outline", action: "faq" },
];

// ── Section Component ────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 mt-6 mb-2">
      {title}
    </Text>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  rightElement,
  destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white flex-row items-center px-5 py-3.5 border-b border-gray-100"
    >
      <View
        className={`w-8 h-8 rounded-lg items-center justify-center mr-3 ${
          destructive ? "bg-red-50" : "bg-gray-100"
        }`}
      >
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? COLORS.error : COLORS.gray[600]}
        />
      </View>
      <Text
        className={`flex-1 text-sm font-medium ${
          destructive ? "text-red-600" : "text-gray-800"
        }`}
      >
        {label}
      </Text>
      {rightElement || (
        <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
      )}
    </Pressable>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // ── Fetch settings ───────────────────────────────────────────────────

  const fetchSettings = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get<UserSettings>("/api/settings");
      setSettings(data);
    } catch {
      setError("Could not load settings. Please try again.");
      // Set defaults so page is usable
      setSettings({
        notification_preferences: { push: true, email: true, sms: false },
        privacy: { profile_visible: true, show_phone: false },
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useState(() => {
    fetchSettings();
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSettings();
  }, [fetchSettings]);

  // ── Update helpers ───────────────────────────────────────────────────

  const updateNotificationPref = async (
    key: "push" | "email" | "sms",
    value: boolean,
  ) => {
    if (!settings) return;
    const updated = {
      ...settings,
      notification_preferences: {
        ...settings.notification_preferences,
        [key]: value,
      },
    };
    setSettings(updated);
    setSavingKey(`notif_${key}`);
    try {
      await api.put("/api/settings", {
        notification_preferences: updated.notification_preferences,
      });
    } catch {
      // Revert
      setSettings(settings);
      Alert.alert("Error", "Could not update notification preferences.");
    } finally {
      setSavingKey(null);
    }
  };

  const updatePrivacy = async (
    key: "profile_visible" | "show_phone",
    value: boolean,
  ) => {
    if (!settings) return;
    const updated = {
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: value,
      },
    };
    setSettings(updated);
    setSavingKey(`privacy_${key}`);
    try {
      await api.put("/api/settings", { privacy: updated.privacy });
    } catch {
      setSettings(settings);
      Alert.alert("Error", "Could not update privacy settings.");
    } finally {
      setSavingKey(null);
    }
  };

  // ── Change password ──────────────────────────────────────────────────

  const handleChangePassword = async () => {
    const { current_password, new_password, confirm_password } = passwordForm;
    if (!current_password || !new_password) {
      Alert.alert("Missing Info", "Please fill in all password fields.");
      return;
    }
    if (new_password.length < 8) {
      Alert.alert("Weak Password", "New password must be at least 8 characters.");
      return;
    }
    if (new_password !== confirm_password) {
      Alert.alert("Mismatch", "New passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      await api.put("/api/settings", {
        current_password,
        new_password,
      });
      setShowPasswordModal(false);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      Alert.alert("Success", "Your password has been updated.");
    } catch {
      Alert.alert("Error", "Could not change password. Check your current password and try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  // ── Danger zone ──────────────────────────────────────────────────────

  const handleDeactivateAccount = () => {
    Alert.alert(
      "Deactivate Account",
      "Your account will be hidden and you will be logged out. You can reactivate by logging back in. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              await api.put("/api/settings", { active: false });
              await logout();
            } catch {
              Alert.alert("Error", "Could not deactivate account.");
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. All your data will be removed. Are you absolutely sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: () => {
            // Second confirmation
            Alert.alert(
              "Final Confirmation",
              "Type DELETE to confirm account deletion.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Confirm Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await api.delete("/api/auth/account");
                      await logout();
                    } catch {
                      Alert.alert("Error", "Could not delete account. Please contact support.");
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleSupportAction = (action: string) => {
    switch (action) {
      case "contact":
        Linking.openURL("mailto:support@jobsyja.com");
        break;
      case "bug":
        Linking.openURL("mailto:bugs@jobsyja.com?subject=Bug%20Report");
        break;
      case "faq":
        Linking.openURL("https://jobsyja.com/faq");
        break;
    }
  };

  // ── Render ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-gray-500 mt-3">Loading settings...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 pt-14 pb-4 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Settings</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Error */}
        {error && (
          <View className="mx-5 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <Text className="text-red-700 text-sm">{error}</Text>
            <Pressable onPress={fetchSettings} className="mt-2">
              <Text className="text-red-600 font-semibold text-sm">Tap to retry</Text>
            </Pressable>
          </View>
        )}

        {/* Account */}
        <SectionHeader title="Account" />
        <View className="bg-white rounded-xl mx-4 overflow-hidden border border-gray-100">
          <SettingsRow
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => setShowPasswordModal(true)}
          />
          <SettingsRow
            icon="mail-outline"
            label="Email"
            rightElement={
              <Text className="text-sm text-gray-400 mr-2">
                {user?.email || "Not set"}
              </Text>
            }
          />
          <SettingsRow
            icon="call-outline"
            label="Phone"
            rightElement={
              <Text className="text-sm text-gray-400 mr-2">
                {user?.phone || "Not set"}
              </Text>
            }
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View className="bg-white rounded-xl mx-4 overflow-hidden border border-gray-100">
          <SettingsRow
            icon="notifications-outline"
            label="Push Notifications"
            rightElement={
              <Switch
                value={settings?.notification_preferences.push ?? true}
                onValueChange={(v) => updateNotificationPref("push", v)}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsRow
            icon="mail-outline"
            label="Email Notifications"
            rightElement={
              <Switch
                value={settings?.notification_preferences.email ?? true}
                onValueChange={(v) => updateNotificationPref("email", v)}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsRow
            icon="chatbox-outline"
            label="SMS Notifications"
            rightElement={
              <Switch
                value={settings?.notification_preferences.sms ?? false}
                onValueChange={(v) => updateNotificationPref("sms", v)}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Privacy */}
        <SectionHeader title="Privacy" />
        <View className="bg-white rounded-xl mx-4 overflow-hidden border border-gray-100">
          <SettingsRow
            icon="eye-outline"
            label="Profile Visible"
            rightElement={
              <Switch
                value={settings?.privacy.profile_visible ?? true}
                onValueChange={(v) => updatePrivacy("profile_visible", v)}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsRow
            icon="call-outline"
            label="Show Phone Number"
            rightElement={
              <Switch
                value={settings?.privacy.show_phone ?? false}
                onValueChange={(v) => updatePrivacy("show_phone", v)}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Payment Methods */}
        <SectionHeader title="Payment" />
        <View className="bg-white rounded-xl mx-4 overflow-hidden border border-gray-100">
          <SettingsRow
            icon="card-outline"
            label="Payment Methods"
            onPress={() => router.push("/(tabs)/payments" as never)}
          />
        </View>

        {/* Legal */}
        <SectionHeader title="Legal" />
        <View className="bg-white rounded-xl mx-4 overflow-hidden border border-gray-100">
          {LEGAL_LINKS.map((link) => (
            <SettingsRow
              key={link.label}
              icon={link.icon}
              label={link.label}
              onPress={() => Linking.openURL(link.url)}
            />
          ))}
        </View>

        {/* Support */}
        <SectionHeader title="Support" />
        <View className="bg-white rounded-xl mx-4 overflow-hidden border border-gray-100">
          {SUPPORT_LINKS.map((link) => (
            <SettingsRow
              key={link.label}
              icon={link.icon}
              label={link.label}
              onPress={() => handleSupportAction(link.action)}
            />
          ))}
        </View>

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" />
        <View className="bg-white rounded-xl mx-4 overflow-hidden border border-red-100">
          <SettingsRow
            icon="pause-circle-outline"
            label="Deactivate Account"
            onPress={handleDeactivateAccount}
            destructive
          />
          <SettingsRow
            icon="trash-outline"
            label="Delete Account"
            onPress={handleDeleteAccount}
            destructive
          />
        </View>

        {/* Logout */}
        <View className="px-4 mt-6">
          <Pressable
            onPress={handleLogout}
            className="bg-red-50 border border-red-200 rounded-xl py-3.5 items-center flex-row justify-center gap-2"
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text className="text-red-600 font-semibold text-base">Log Out</Text>
          </Pressable>
        </View>

        {/* App version */}
        <Text className="text-center text-xs text-gray-400 mt-6">
          Jobsy v1.0.0
        </Text>
      </ScrollView>

      {/* ── Change Password Modal ─────────────────────────────────────── */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View className="flex-1 bg-gray-50">
          <View className="bg-white px-5 pt-6 pb-4 border-b border-gray-200 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">Change Password</Text>
            <Pressable onPress={() => setShowPasswordModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.gray[600]} />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Current Password
            </Text>
            <TextInput
              value={passwordForm.current_password}
              onChangeText={(t) =>
                setPasswordForm((p) => ({ ...p, current_password: t }))
              }
              placeholder="Enter current password"
              secureTextEntry
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
              placeholderTextColor={COLORS.gray[400]}
            />

            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              New Password
            </Text>
            <TextInput
              value={passwordForm.new_password}
              onChangeText={(t) =>
                setPasswordForm((p) => ({ ...p, new_password: t }))
              }
              placeholder="At least 8 characters"
              secureTextEntry
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
              placeholderTextColor={COLORS.gray[400]}
            />

            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              Confirm New Password
            </Text>
            <TextInput
              value={passwordForm.confirm_password}
              onChangeText={(t) =>
                setPasswordForm((p) => ({ ...p, confirm_password: t }))
              }
              placeholder="Re-enter new password"
              secureTextEntry
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
              placeholderTextColor={COLORS.gray[400]}
            />

            <Pressable
              onPress={handleChangePassword}
              disabled={changingPassword}
              className={`py-3.5 rounded-xl items-center mt-2 ${
                changingPassword ? "bg-gray-300" : "bg-green-700"
              }`}
            >
              {changingPassword ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Update Password
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
