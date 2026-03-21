import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";
import type { UserRole } from "@/api/auth";

const ROLE_CONFIG: Record<UserRole, { label: string; icon: keyof typeof Ionicons.glyphMap; description: string }> = {
  user: { label: "Client", icon: "search-outline", description: "Browse & hire services" },
  provider: { label: "Provider", icon: "construct-outline", description: "Offer your services" },
  hirer: { label: "Hirer", icon: "briefcase-outline", description: "Post jobs & hire" },
  advertiser: { label: "Advertiser", icon: "megaphone-outline", description: "Promote your business" },
};

export function RoleSwitcher() {
  const { user, switchRole, addRole } = useAuthStore();
  const [switching, setSwitching] = useState(false);

  if (!user) return null;

  const currentRoles = user.roles || ["user"];
  const availableToAdd = (["provider", "hirer", "advertiser"] as UserRole[]).filter(
    (r) => !currentRoles.includes(r),
  );

  const handleSwitch = async (role: UserRole) => {
    if (role === user.activeRole) return;
    setSwitching(true);
    try {
      await switchRole(role);
    } catch {
      Alert.alert("Error", "Failed to switch role");
    } finally {
      setSwitching(false);
    }
  };

  const handleAddRole = async (role: UserRole) => {
    setSwitching(true);
    try {
      await addRole(role);
      await switchRole(role);
    } catch {
      Alert.alert("Error", "Failed to add role");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <View className="mx-4 mt-3 rounded-2xl bg-white p-4">
      <Text className="mb-3 text-sm font-semibold text-dark-700">Active Role</Text>
      <View className="flex-row flex-wrap gap-2">
        {currentRoles.map((role) => {
          const config = ROLE_CONFIG[role as UserRole];
          if (!config) return null;
          const isActive = role === user.activeRole;
          return (
            <Pressable
              key={role}
              onPress={() => handleSwitch(role as UserRole)}
              disabled={switching}
              className={`flex-row items-center rounded-xl px-4 py-2.5 ${
                isActive ? "bg-primary-900" : "border border-dark-200 bg-dark-50"
              }`}
            >
              <Ionicons
                name={config.icon}
                size={18}
                color={isActive ? "#FFFFFF" : COLORS.gray[600]}
              />
              <Text
                className={`ml-2 text-sm font-medium ${
                  isActive ? "text-white" : "text-dark-600"
                }`}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {availableToAdd.length > 0 && (
        <>
          <Text className="mb-2 mt-4 text-xs text-dark-400">Add a role</Text>
          <View className="flex-row flex-wrap gap-2">
            {availableToAdd.map((role) => {
              const config = ROLE_CONFIG[role];
              return (
                <Pressable
                  key={role}
                  onPress={() => handleAddRole(role)}
                  disabled={switching}
                  className="flex-row items-center rounded-xl border border-dashed border-dark-300 px-3 py-2"
                >
                  <Ionicons name="add-circle-outline" size={16} color={COLORS.gray[500]} />
                  <Text className="ml-1.5 text-sm text-dark-500">{config.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}
