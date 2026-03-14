import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";

import { changePassword, deleteAccount } from "@/api/auth";
import { getMyProfile } from "@/api/profiles";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ReviewStars } from "@/components/ReviewStars";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";
import { formatCurrency } from "@/utils/format";

const SOCIAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  instagram_url: "logo-instagram",
  twitter_url: "logo-twitter",
  tiktok_url: "logo-tiktok",
  youtube_url: "logo-youtube",
  linkedin_url: "logo-linkedin",
  portfolio_url: "globe-outline",
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // Change Password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) => changePassword(data),
    onSuccess: () => {
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully');
    },
    onError: () => Alert.alert('Error', 'Failed to change password. Check your current password and try again.'),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (confirmation: string) => deleteAccount(confirmation),
    onSuccess: () => {
      logout();
      router.replace('/(auth)/login');
    },
    onError: () => Alert.alert('Error', 'Failed to delete account. Please try again.'),
  });

  function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Required', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Too short', 'New password must be at least 8 characters.');
      return;
    }
    changePasswordMutation.mutate({ current_password: currentPassword, new_password: newPassword });
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Type "DELETE" to confirm account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: () => deleteAccountMutation.mutate('DELETE'),
                },
              ]
            );
          },
        },
      ]
    );
  }

  if (isLoading) return <LoadingScreen />;

  const socialLinks = profile
    ? Object.entries(SOCIAL_ICONS).filter(([key]) => profile[key as keyof typeof profile])
    : [];

  return (
    <ScrollView className="flex-1 bg-dark-50">
      <Stack.Screen options={{ title: "Profile" }} />

      {/* Header */}
      <View className="items-center bg-white px-6 pb-6 pt-12">
        <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary-100">
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} className="h-full w-full" />
          ) : (
            <Ionicons name="person" size={40} color={COLORS.primaryLight} />
          )}
        </View>
        <Text className="mt-3 text-xl font-bold text-dark-800">
          {profile?.display_name || "Set up your profile"}
        </Text>
        {profile?.service_category && (
          <Text className="mt-1 text-sm text-primary-700">{profile.service_category}</Text>
        )}
        <View className="mt-2 flex-row items-center gap-1">
          <ReviewStars rating={Number(profile?.rating_avg || 0)} size={16} />
          <Text className="text-sm text-dark-400">({profile?.rating_count || 0})</Text>
        </View>
        {profile?.hourly_rate && (
          <Text className="mt-1 text-lg font-bold text-primary-900">
            {formatCurrency(Number(profile.hourly_rate))}/hr
          </Text>
        )}

        {/* Follower stats */}
        <View className="mt-4 flex-row gap-8">
          <View className="items-center">
            <Text className="text-lg font-bold text-dark-800">{profile?.follower_count ?? 0}</Text>
            <Text className="text-xs text-dark-400">Followers</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-dark-800">{profile?.following_count ?? 0}</Text>
            <Text className="text-xs text-dark-400">Following</Text>
          </View>
        </View>

        {/* Social links */}
        {socialLinks.length > 0 && (
          <View className="mt-3 flex-row gap-4">
            {socialLinks.map(([key, icon]) => (
              <Pressable
                key={key}
                onPress={() => {
                  const url = profile?.[key as keyof typeof profile] as string;
                  if (url) Linking.openURL(url);
                }}
              >
                <Ionicons name={icon} size={22} color={COLORS.gray[600]} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Role Switcher */}
      <RoleSwitcher />

      {/* Bio */}
      {profile?.bio && (
        <View className="mx-4 mt-3 rounded-2xl bg-white p-4">
          <Text className="text-sm font-semibold text-dark-700">About</Text>
          <Text className="mt-1 text-sm text-dark-500">{profile.bio}</Text>
        </View>
      )}

      {/* Skills */}
      {profile?.skills && profile.skills.length > 0 && (
        <View className="mx-4 mt-3 rounded-2xl bg-white p-4">
          <Text className="text-sm font-semibold text-dark-700">Skills</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <View key={skill} className="rounded-lg bg-primary-50 px-3 py-1.5">
                <Text className="text-sm text-primary-900">{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Menu items */}
      <View className="mx-4 mt-4 rounded-2xl bg-white">
        <MenuItem
          icon="create-outline"
          label="Edit Profile"
          onPress={() => router.push("/(tabs)/profile/edit")}
        />
        <MenuItem
          icon="list-outline"
          label="My Listings"
          onPress={() => router.push("/(tabs)/listing/my-listings")}
        />
        <MenuItem
          icon="star-outline"
          label="My Reviews"
          onPress={() => router.push(`/(tabs)/reviews/${user?.id}`)}
        />
        <MenuItem
          icon="card-outline"
          label="Payments"
          onPress={() => router.push("/(tabs)/payments/")}
        />
        <MenuItem
          icon="notifications-outline"
          label="Notifications"
          onPress={() => router.push("/(tabs)/notifications")}
        />
        <MenuItem
          icon="share-social-outline"
          label="Share Profile"
          onPress={() => router.push("/(tabs)/profile/edit")}
        />
        <MenuItem
          icon="lock-closed-outline"
          label="Change Password"
          onPress={() => setShowPasswordModal(true)}
        />
      </View>

      {/* Logout */}
      <Pressable
        onPress={logout}
        className="mx-4 mt-4 items-center rounded-2xl bg-white py-4"
      >
        <Text className="font-semibold text-red-500">Sign Out</Text>
      </Pressable>

      {/* Danger Zone */}
      <View className="mx-4 mt-4 mb-10 rounded-2xl bg-white">
        <View className="px-4 pt-3 pb-1">
          <Text className="text-xs font-semibold text-red-500 uppercase tracking-wider">Danger Zone</Text>
        </View>
        <Pressable
          onPress={handleDeleteAccount}
          className="flex-row items-center px-4 py-4"
          disabled={deleteAccountMutation.isPending}
        >
          <Ionicons name="trash-outline" size={22} color="#991B1B" />
          <Text className="ml-3 flex-1 text-base text-red-700 font-semibold">Delete Account</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
        </Pressable>
      </View>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPasswordModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-bold text-gray-900">Change Password</Text>
              <Pressable onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-1">Current Password</Text>
            <TextInput
              className="bg-white rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
              style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">New Password</Text>
            <TextInput
              className="bg-white rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
              style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Confirm New Password</Text>
            <TextInput
              className="bg-white rounded-lg px-3 py-2.5 mb-6 text-sm text-gray-900"
              style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Pressable
              onPress={handleChangePassword}
              className="rounded-lg py-3 items-center"
              style={{ backgroundColor: '#1B5E20' }}
              disabled={changePasswordMutation.isPending}
            >
              <Text className="text-white font-semibold text-base">
                {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-dark-100 px-4 py-4 last:border-b-0"
    >
      <Ionicons name={icon} size={22} color={COLORS.gray[600]} />
      <Text className="ml-3 flex-1 text-base text-dark-700">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
    </Pressable>
  );
}
