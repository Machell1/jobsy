import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { changePassword, deleteAccount } from "@/api/auth";
import {
  getMyProfile,
  getVerificationStatus,
  getMyPortfolio,
  addPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  getMyServices,
  createService,
  updateService,
  deleteService,
  getMyAvailability,
  updateAvailability,
  getShareLinks,
  generateShareLink,
} from "@/api/profiles";
import {
  reportUser,
  blockUser,
  unblockUser,
  getBlockedUsers,
  type BlockedUser,
} from "@/api/trust";
import { uploadFile } from "@/api/storage";
import * as ImagePicker from "expo-image-picker";
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

const REPORT_REASONS = [
  "harassment",
  "spam",
  "fraud",
  "inappropriate",
  "other",
] as const;
type ReportReason = (typeof REPORT_REASONS)[number];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();

  // Change Password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Trust & Safety state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportUserId, setReportUserId] = useState('');
  const [reportReason, setReportReason] = useState<ReportReason>('harassment');
  const [reportDescription, setReportDescription] = useState('');
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockUserId, setBlockUserId] = useState('');

  // Portfolio state
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<any | null>(null);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  const [portfolioImageUrl, setPortfolioImageUrl] = useState('');

  // Services state
  const [showServicesModal, setShowServicesModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingService, setEditingService] = useState<any | null>(null);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');

  // Availability state
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [availSchedule, setAvailSchedule] = useState<Record<string, { available: boolean; start: string; end: string }>>(() => {
    const s: Record<string, { available: boolean; start: string; end: string }> = {};
    DAYS.forEach((d) => { s[d] = { available: false, start: '09:00', end: '17:00' }; });
    return s;
  });

  // Share link state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Verification state
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // ——— Queries ———
  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
  });

  const { data: blockedUsers = [], isLoading: loadingBlocked } = useQuery<BlockedUser[]>({
    queryKey: ["blocked-users"],
    queryFn: getBlockedUsers,
    enabled: showBlockedModal,
  });

  const { data: verificationStatus } = useQuery({
    queryKey: ["verification-status"],
    queryFn: getVerificationStatus,
  });

  const { data: portfolio = [], isLoading: loadingPortfolio } = useQuery({
    queryKey: ["my-portfolio"],
    queryFn: getMyPortfolio,
    enabled: showPortfolioModal,
  });

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["my-services"],
    queryFn: getMyServices,
    enabled: showServicesModal,
  });

  const { data: availability } = useQuery({
    queryKey: ["my-availability"],
    queryFn: getMyAvailability,
    enabled: showAvailabilityModal,
  });

  useEffect(() => {
    if (availability?.schedule) {
      const newSched: Record<string, { available: boolean; start: string; end: string }> = {};
      DAYS.forEach((d) => {
        newSched[d] = availability.schedule[d] || { available: false, start: '09:00', end: '17:00' };
      });
      setAvailSchedule(newSched);
    }
  }, [availability]);

  // ——— Mutations ———
  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) => changePassword(data),
    onSuccess: () => {
      setShowPasswordModal(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully');
    },
    onError: () => Alert.alert('Error', 'Failed to change password. Check your current password and try again.'),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (confirmation: string) => deleteAccount(confirmation),
    onSuccess: () => { logout(); router.replace('/(auth)/login'); },
    onError: () => Alert.alert('Error', 'Failed to delete account. Please try again.'),
  });

  const reportUserMutation = useMutation({
    mutationFn: () => reportUser({ reported_user_id: reportUserId.trim(), reason: reportReason, description: reportDescription.trim() || undefined }),
    onSuccess: () => {
      setShowReportModal(false);
      setReportUserId(''); setReportReason('harassment'); setReportDescription('');
      Alert.alert('Reported', 'Your report has been submitted. We will review it shortly.');
    },
    onError: () => Alert.alert('Error', 'Failed to submit report. Please try again.'),
  });

  const blockUserMutation = useMutation({
    mutationFn: () => blockUser(blockUserId.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      setShowBlockModal(false); setBlockUserId('');
      Alert.alert('Blocked', 'User has been blocked.');
    },
    onError: () => Alert.alert('Error', 'Failed to block user. Please try again.'),
  });

  const unblockUserMutation = useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blocked-users'] }),
    onError: () => Alert.alert('Error', 'Failed to unblock user.'),
  });

  // Portfolio mutations
  const addPortfolioMutation = useMutation({
    mutationFn: () => addPortfolioItem({ title: portfolioTitle.trim(), description: portfolioDescription.trim() || undefined, image_url: portfolioImageUrl.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-portfolio'] });
      resetPortfolioForm();
      Alert.alert('Added', 'Portfolio item added.');
    },
    onError: () => Alert.alert('Error', 'Failed to add portfolio item.'),
  });

  const updatePortfolioMutation = useMutation({
    mutationFn: () => updatePortfolioItem(editingPortfolioItem.id, { title: portfolioTitle.trim(), description: portfolioDescription.trim() || undefined, image_url: portfolioImageUrl.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-portfolio'] });
      resetPortfolioForm();
      Alert.alert('Updated', 'Portfolio item updated.');
    },
    onError: () => Alert.alert('Error', 'Failed to update portfolio item.'),
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: (itemId: string) => deletePortfolioItem(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-portfolio'] }),
    onError: () => Alert.alert('Error', 'Failed to delete portfolio item.'),
  });

  // Services mutations
  const createServiceMutation = useMutation({
    mutationFn: () => createService({ title: serviceTitle.trim(), description: serviceDescription.trim() || undefined, base_price: servicePrice ? parseFloat(servicePrice) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-services'] });
      resetServiceForm();
      Alert.alert('Created', 'Service created.');
    },
    onError: () => Alert.alert('Error', 'Failed to create service.'),
  });

  const updateServiceMutation = useMutation({
    mutationFn: () => updateService(editingService.id, { title: serviceTitle.trim(), description: serviceDescription.trim() || undefined, base_price: servicePrice ? parseFloat(servicePrice) : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-services'] });
      resetServiceForm();
      Alert.alert('Updated', 'Service updated.');
    },
    onError: () => Alert.alert('Error', 'Failed to update service.'),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-services'] }),
    onError: () => Alert.alert('Error', 'Failed to delete service.'),
  });

  // Availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: () => updateAvailability({ schedule: availSchedule }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availability'] });
      setShowAvailabilityModal(false);
      Alert.alert('Saved', 'Availability updated.');
    },
    onError: () => Alert.alert('Error', 'Failed to update availability.'),
  });

  // Share link
  const generateShareLinkMutation = useMutation({
    mutationFn: generateShareLink,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: (data: any) => {
      const url = data?.url || data?.share_url || '';
      setShareUrl(url);
    },
    onError: () => Alert.alert('Error', 'Failed to generate share link.'),
  });

  const { data: shareLinks } = useQuery({
    queryKey: ["share-links"],
    queryFn: getShareLinks,
    enabled: showShareModal,
  });

  useEffect(() => {
    if (shareLinks?.profile_url) setShareUrl(shareLinks.profile_url);
  }, [shareLinks]);

  // ——— Helpers ———
  function resetPortfolioForm() {
    setEditingPortfolioItem(null);
    setPortfolioTitle(''); setPortfolioDescription(''); setPortfolioImageUrl('');
  }

  function resetServiceForm() {
    setEditingService(null);
    setServiceTitle(''); setServiceDescription(''); setServicePrice('');
  }

  function handleReportUser() {
    if (!reportUserId.trim()) { Alert.alert('Required', 'Please enter a user ID.'); return; }
    reportUserMutation.mutate();
  }

  function handleBlockUser() {
    if (!blockUserId.trim()) { Alert.alert('Required', 'Please enter a user ID.'); return; }
    blockUserMutation.mutate();
  }

  function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) { Alert.alert('Required', 'Please fill in all password fields.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Mismatch', 'New passwords do not match.'); return; }
    if (newPassword.length < 8) { Alert.alert('Too short', 'New password must be at least 8 characters.'); return; }
    changePasswordMutation.mutate({ current_password: currentPassword, new_password: newPassword });
  }

  function handleDeleteAccount() {
    Alert.alert('Delete Account', 'This action is permanent and cannot be undone. All your data will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue', style: 'destructive',
        onPress: () => Alert.alert('Confirm Deletion', 'Type "DELETE" to confirm account deletion.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete My Account', style: 'destructive', onPress: () => deleteAccountMutation.mutate('DELETE') },
        ]),
      },
    ]);
  }

  async function handleShareProfile() {
    setShowShareModal(true);
  }

  const isVerified = profile?.is_verified;
  const verBadge = verificationStatus?.status || (isVerified ? 'verified' : 'unverified');

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

        {/* Verification badge */}
        <Pressable
          onPress={() => setShowVerificationModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 6,
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 12,
            backgroundColor: isVerified ? '#DCFCE7' : '#FEF9C3',
          }}
        >
          <Ionicons
            name={isVerified ? "shield-checkmark" : "shield-outline"}
            size={13}
            color={isVerified ? "#166534" : "#92400E"}
          />
          <Text style={{ fontSize: 12, fontWeight: '600', marginLeft: 4, color: isVerified ? '#166534' : '#92400E' }}>
            {isVerified ? 'Verified' : verBadge === 'pending' ? 'Verification Pending' : 'Not Verified'}
          </Text>
        </Pressable>

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

      {/* Portfolio Section */}
      <SectionCard
        title="Portfolio"
        icon="images-outline"
        onPress={() => setShowPortfolioModal(true)}
      />

      {/* Services Section (provider only) */}
      {profile?.is_provider && (
        <SectionCard
          title="My Services"
          icon="briefcase-outline"
          onPress={() => setShowServicesModal(true)}
        />
      )}

      {/* Availability Section (provider only) */}
      {profile?.is_provider && (
        <SectionCard
          title="Availability"
          icon="calendar-outline"
          onPress={() => setShowAvailabilityModal(true)}
        />
      )}

      {/* Menu items */}
      <View className="mx-4 mt-4 rounded-2xl bg-white">
        <MenuItem icon="home-outline" label="Dashboard" onPress={() => router.push("/(tabs)/home")} />
        <MenuItem icon="create-outline" label="Edit Profile" onPress={() => router.push("/(tabs)/profile/edit")} />
        <MenuItem icon="shield-checkmark-outline" label="Verify Account" onPress={() => router.push("/(tabs)/verify")} />
        <MenuItem icon="list-outline" label="My Listings" onPress={() => router.push("/(tabs)/listing/my-listings")} />
        <MenuItem icon="star-outline" label="My Reviews" onPress={() => router.push(`/(tabs)/reviews/${user?.id}`)} />
        <MenuItem icon="card-outline" label="Payments" onPress={() => router.push("/(tabs)/payments/")} />
        <MenuItem icon="notifications-outline" label="Notifications" onPress={() => router.push("/(tabs)/notifications")} />
        <MenuItem icon="newspaper-outline" label="Noticeboard" onPress={() => router.push("/(tabs)/noticeboard")} />
        <MenuItem icon="megaphone-outline" label="Advertiser" onPress={() => router.push("/(tabs)/advertiser")} />
        <MenuItem icon="gift-outline" label="Referrals" onPress={() => router.push("/(tabs)/referrals")} />
        <MenuItem icon="alert-circle-outline" label="Disputes" onPress={() => router.push("/(tabs)/disputes")} />
        <MenuItem icon="business-outline" label="Business Profile" onPress={() => router.push("/(tabs)/business")} />
        <MenuItem
          icon="share-social-outline"
          label="Share Profile"
          onPress={handleShareProfile}
        />
        <MenuItem icon="settings-outline" label="Settings" onPress={() => router.push("/(tabs)/settings")} />
        <MenuItem icon="document-text-outline" label="Legal & Info" onPress={() => router.push("/(tabs)/legal")} />
      </View>

      {/* Trust & Safety */}
      <View className="mx-4 mt-4 rounded-2xl bg-white">
        <View className="px-4 pt-3 pb-1">
          <Text className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Trust &amp; Safety</Text>
        </View>
        <MenuItem icon="flag-outline" label="Report a User" onPress={() => setShowReportModal(true)} />
        <MenuItem icon="ban-outline" label="Block a User" onPress={() => setShowBlockModal(true)} />
        <MenuItem icon="shield-checkmark-outline" label="Blocked Users" onPress={() => setShowBlockedModal(true)} />
      </View>

      {/* Logout */}
      <Pressable onPress={logout} className="mx-4 mt-4 items-center rounded-2xl bg-white py-4">
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

      {/* =============== MODALS =============== */}

      {/* Verification Modal */}
      <Modal visible={showVerificationModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowVerificationModal(false)}>
        <View className="flex-1 bg-gray-50 p-4">
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-lg font-bold text-gray-900">Verification Status</Text>
            <Pressable onPress={() => setShowVerificationModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </Pressable>
          </View>

          <View className="items-center py-8">
            <View style={{ backgroundColor: isVerified ? '#DCFCE7' : '#FEF9C3', borderRadius: 50, padding: 20, marginBottom: 16 }}>
              <Ionicons
                name={isVerified ? "shield-checkmark" : "shield-outline"}
                size={48}
                color={isVerified ? "#166534" : "#92400E"}
              />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">
              {isVerified ? 'Account Verified' : verBadge === 'pending' ? 'Verification Pending' : 'Not Verified'}
            </Text>
            <Text className="text-sm text-gray-600 text-center px-4">
              {isVerified
                ? 'Your account has been verified. You have a trust badge on your profile.'
                : verBadge === 'pending'
                ? 'Your verification documents are under review. This usually takes 1–3 business days.'
                : 'Get verified to build trust with clients. Submit government ID or business documents.'}
            </Text>
          </View>

          {!isVerified && verBadge !== 'pending' && (
            <Pressable
              onPress={() => {
                setShowVerificationModal(false);
                Alert.alert('Verification', 'To verify your account, please contact support or use the verification flow in the web app.');
              }}
              className="rounded-lg py-3 items-center mx-4"
              style={{ backgroundColor: '#1B5E20' }}
            >
              <Text className="text-white font-semibold text-base">Start Verification</Text>
            </Pressable>
          )}
        </View>
      </Modal>

      {/* Share Profile Modal */}
      <Modal visible={showShareModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowShareModal(false)}>
        <View className="flex-1 bg-gray-50 p-4">
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-lg font-bold text-gray-900">Share Profile</Text>
            <Pressable onPress={() => setShowShareModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </Pressable>
          </View>

          {shareUrl ? (
            <>
              <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Your profile link</Text>
                <Text style={{ fontSize: 13, color: '#1E40AF', fontWeight: '500' }} numberOfLines={2}>{shareUrl}</Text>
              </View>

              <Pressable
                onPress={() => Share.share({ url: shareUrl, message: `Check out my profile on Jobsy: ${shareUrl}` })}
                className="rounded-lg py-3 items-center mb-3 flex-row justify-center"
                style={{ backgroundColor: '#1B5E20' }}
              >
                <Ionicons name="share-social-outline" size={18} color="#fff" />
                <Text className="text-white font-semibold text-base ml-2">Share Link</Text>
              </Pressable>
            </>
          ) : (
            <View className="items-center py-10">
              <Ionicons name="link-outline" size={48} color="#9CA3AF" />
              <Text className="text-sm text-gray-500 mt-2 mb-6 text-center">Generate a shareable link for your profile</Text>
              <Pressable
                onPress={() => generateShareLinkMutation.mutate()}
                className="rounded-lg py-3 px-8 items-center flex-row"
                style={{ backgroundColor: '#1B5E20' }}
                disabled={generateShareLinkMutation.isPending}
              >
                {generateShareLinkMutation.isPending && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />}
                <Text className="text-white font-semibold text-base">
                  {generateShareLinkMutation.isPending ? 'Generating...' : 'Generate Link'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>

      {/* Portfolio Modal */}
      <Modal visible={showPortfolioModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowPortfolioModal(false); resetPortfolioForm(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-gray-50">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Portfolio</Text>
              <Pressable onPress={() => { setShowPortfolioModal(false); resetPortfolioForm(); }}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {/* Add / Edit form */}
              <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 }}>
                  {editingPortfolioItem ? 'Edit Item' : 'Add Item'}
                </Text>

                <Text style={formLabel}>Title *</Text>
                <TextInput style={formInput} placeholder="Project title" value={portfolioTitle} onChangeText={setPortfolioTitle} />

                <Text style={formLabel}>Description</Text>
                <TextInput style={[formInput, { minHeight: 60 }]} placeholder="Describe the project..." value={portfolioDescription} onChangeText={setPortfolioDescription} multiline textAlignVertical="top" />

                <Text style={formLabel}>Photo</Text>
                {portfolioImageUrl ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Image source={{ uri: portfolioImageUrl }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                    <Pressable onPress={() => setPortfolioImageUrl('')} style={{ marginLeft: 8, padding: 4 }}>
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </Pressable>
                  </View>
                ) : null}
                <PortfolioPhotoUploader imageUrl={portfolioImageUrl} onUploaded={setPortfolioImageUrl} />

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  {editingPortfolioItem && (
                    <Pressable onPress={resetPortfolioForm} style={[btnSecondary, { flex: 1 }]}>
                      <Text style={btnSecondaryText}>Cancel</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => {
                      if (!portfolioTitle.trim()) { Alert.alert('Required', 'Title is required'); return; }
                      if (editingPortfolioItem) { updatePortfolioMutation.mutate(); } else { addPortfolioMutation.mutate(); }
                    }}
                    style={[btnPrimary, { flex: 1 }]}
                    disabled={addPortfolioMutation.isPending || updatePortfolioMutation.isPending}
                  >
                    <Text style={btnPrimaryText}>
                      {(addPortfolioMutation.isPending || updatePortfolioMutation.isPending) ? 'Saving...' : editingPortfolioItem ? 'Update' : 'Add'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Existing portfolio items */}
              {loadingPortfolio ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (Array.isArray(portfolio) ? portfolio : []).length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Ionicons name="images-outline" size={40} color="#9CA3AF" />
                  <Text style={{ color: '#9CA3AF', marginTop: 8, fontSize: 13 }}>No portfolio items yet</Text>
                </View>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (Array.isArray(portfolio) ? portfolio : []).map((item: any) => (
                  <View key={item.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                    {item.image_url && (
                      <Image source={{ uri: item.image_url }} style={{ width: '100%', height: 140, borderRadius: 8, marginBottom: 8 }} resizeMode="cover" />
                    )}
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{item.title}</Text>
                    {item.description && <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{item.description}</Text>}
                    <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
                      <Pressable
                        onPress={() => {
                          setEditingPortfolioItem(item);
                          setPortfolioTitle(item.title || '');
                          setPortfolioDescription(item.description || '');
                          setPortfolioImageUrl(item.image_url || '');
                        }}
                        style={[btnSecondary, { flex: 1 }]}
                      >
                        <Text style={btnSecondaryText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          Alert.alert('Delete', 'Remove this portfolio item?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deletePortfolioMutation.mutate(item.id) },
                          ])
                        }
                        style={[btnDanger, { flex: 1 }]}
                        disabled={deletePortfolioMutation.isPending}
                      >
                        <Text style={btnDangerText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Services Modal */}
      <Modal visible={showServicesModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowServicesModal(false); resetServiceForm(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-gray-50">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>My Services</Text>
              <Pressable onPress={() => { setShowServicesModal(false); resetServiceForm(); }}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {/* Add / Edit form */}
              <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 }}>
                  {editingService ? 'Edit Service' : 'New Service'}
                </Text>

                <Text style={formLabel}>Title *</Text>
                <TextInput style={formInput} placeholder="e.g. Logo Design" value={serviceTitle} onChangeText={setServiceTitle} />

                <Text style={formLabel}>Description</Text>
                <TextInput style={[formInput, { minHeight: 60 }]} placeholder="Describe your service..." value={serviceDescription} onChangeText={setServiceDescription} multiline textAlignVertical="top" />

                <Text style={formLabel}>Base Price ($)</Text>
                <TextInput style={formInput} placeholder="0.00" value={servicePrice} onChangeText={setServicePrice} keyboardType="decimal-pad" />

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  {editingService && (
                    <Pressable onPress={resetServiceForm} style={[btnSecondary, { flex: 1 }]}>
                      <Text style={btnSecondaryText}>Cancel</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => {
                      if (!serviceTitle.trim()) { Alert.alert('Required', 'Title is required'); return; }
                      if (editingService) { updateServiceMutation.mutate(); } else { createServiceMutation.mutate(); }
                    }}
                    style={[btnPrimary, { flex: 1 }]}
                    disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                  >
                    <Text style={btnPrimaryText}>
                      {(createServiceMutation.isPending || updateServiceMutation.isPending) ? 'Saving...' : editingService ? 'Update' : 'Create'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Existing services */}
              {loadingServices ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (Array.isArray(services) ? services : []).length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Ionicons name="briefcase-outline" size={40} color="#9CA3AF" />
                  <Text style={{ color: '#9CA3AF', marginTop: 8, fontSize: 13 }}>No services yet</Text>
                </View>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (Array.isArray(services) ? services : []).map((svc: any) => (
                  <View key={svc.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 }}>{svc.title}</Text>
                      {svc.base_price != null && (
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#166534' }}>${parseFloat(svc.base_price).toFixed(2)}</Text>
                      )}
                    </View>
                    {svc.description && <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{svc.description}</Text>}
                    <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
                      <Pressable
                        onPress={() => {
                          setEditingService(svc);
                          setServiceTitle(svc.title || '');
                          setServiceDescription(svc.description || '');
                          setServicePrice(svc.base_price != null ? String(svc.base_price) : '');
                        }}
                        style={[btnSecondary, { flex: 1 }]}
                      >
                        <Text style={btnSecondaryText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          Alert.alert('Delete', 'Remove this service?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteServiceMutation.mutate(svc.id) },
                          ])
                        }
                        style={[btnDanger, { flex: 1 }]}
                        disabled={deleteServiceMutation.isPending}
                      >
                        <Text style={btnDangerText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Availability Modal */}
      <Modal visible={showAvailabilityModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAvailabilityModal(false)}>
        <View className="flex-1 bg-gray-50">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Weekly Availability</Text>
            <Pressable onPress={() => setShowAvailabilityModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
              Set your available hours for each day of the week.
            </Text>

            {DAYS.map((day) => {
              const s = availSchedule[day];
              return (
                <View key={day} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.available ? 10 : 0 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', width: 44 }}>{day}</Text>
                    <Pressable
                      onPress={() => setAvailSchedule((prev) => ({ ...prev, [day]: { ...prev[day], available: !prev[day].available } }))}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 5,
                        borderRadius: 20,
                        backgroundColor: s.available ? '#DCFCE7' : '#F3F4F6',
                        borderWidth: 1,
                        borderColor: s.available ? '#BBF7D0' : '#E5E7EB',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: s.available ? '#166534' : '#6B7280' }}>
                        {s.available ? 'Available' : 'Off'}
                      </Text>
                    </Pressable>
                  </View>

                  {s.available && (
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Start</Text>
                        <TextInput
                          style={formInput}
                          value={s.start}
                          onChangeText={(v) => setAvailSchedule((prev) => ({ ...prev, [day]: { ...prev[day], start: v } }))}
                          placeholder="09:00"
                        />
                      </View>
                      <Text style={{ color: '#9CA3AF', marginTop: 14 }}>–</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>End</Text>
                        <TextInput
                          style={formInput}
                          value={s.end}
                          onChangeText={(v) => setAvailSchedule((prev) => ({ ...prev, [day]: { ...prev[day], end: v } }))}
                          placeholder="17:00"
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            <Pressable
              onPress={() => updateAvailabilityMutation.mutate()}
              style={[btnPrimary, { marginTop: 8 }]}
              disabled={updateAvailabilityMutation.isPending}
            >
              <Text style={btnPrimaryText}>
                {updateAvailabilityMutation.isPending ? 'Saving...' : 'Save Availability'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Report User Modal */}
      <Modal visible={showReportModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowReportModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-bold text-gray-900">Report a User</Text>
              <Pressable onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-1">User ID</Text>
            <TextInput
              className="bg-white rounded-lg px-3 py-2.5 mb-4 text-sm text-gray-900"
              style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
              placeholder="Enter the user ID to report"
              value={reportUserId}
              onChangeText={setReportUserId}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Reason</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {REPORT_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => setReportReason(reason)}
                  className="rounded-full px-3 py-1.5"
                  style={{ backgroundColor: reportReason === reason ? '#DC2626' : '#F3F4F6' }}
                >
                  <Text style={{ color: reportReason === reason ? '#FFFFFF' : '#374151', fontSize: 13, fontWeight: '500', textTransform: 'capitalize' }}>
                    {reason}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-1">Description (optional)</Text>
            <TextInput
              className="bg-white rounded-lg px-3 py-2.5 mb-6 text-sm text-gray-900"
              style={{ borderWidth: 1, borderColor: '#E5E7EB', minHeight: 80 }}
              placeholder="Provide more details about the issue..."
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
              textAlignVertical="top"
            />

            <Pressable
              onPress={handleReportUser}
              className="rounded-lg py-3 items-center"
              style={{ backgroundColor: '#DC2626' }}
              disabled={reportUserMutation.isPending}
            >
              <Text className="text-white font-semibold text-base">
                {reportUserMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Block User Modal */}
      <Modal visible={showBlockModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBlockModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-bold text-gray-900">Block a User</Text>
              <Pressable onPress={() => setShowBlockModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            <Text className="text-sm text-gray-600 mb-4">
              Blocked users cannot view your profile, contact you, or interact with your listings.
            </Text>

            <Text className="text-sm font-medium text-gray-700 mb-1">User ID</Text>
            <TextInput
              className="bg-white rounded-lg px-3 py-2.5 mb-6 text-sm text-gray-900"
              style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
              placeholder="Enter the user ID to block"
              value={blockUserId}
              onChangeText={setBlockUserId}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              onPress={handleBlockUser}
              className="rounded-lg py-3 items-center"
              style={{ backgroundColor: '#92400E' }}
              disabled={blockUserMutation.isPending}
            >
              <Text className="text-white font-semibold text-base">
                {blockUserMutation.isPending ? 'Blocking...' : 'Block User'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Blocked Users Modal */}
      <Modal visible={showBlockedModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBlockedModal(false)}>
        <View className="flex-1 bg-gray-50 p-4">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-lg font-bold text-gray-900">Blocked Users</Text>
            <Pressable onPress={() => setShowBlockedModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </Pressable>
          </View>

          {loadingBlocked ? (
            <ActivityIndicator size="large" color="#1B5E20" />
          ) : blockedUsers.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="shield-checkmark-outline" size={48} color="#9CA3AF" />
              <Text className="mt-3 text-base text-gray-500 font-medium">No blocked users</Text>
              <Text className="mt-1 text-sm text-gray-400">Users you block will appear here</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {blockedUsers.map((bu) => (
                <View
                  key={bu.id}
                  className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-2"
                  style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                >
                  <View className="h-10 w-10 rounded-full bg-gray-200 items-center justify-center mr-3">
                    {bu.avatar_url ? (
                      <Image source={{ uri: bu.avatar_url }} className="h-full w-full rounded-full" />
                    ) : (
                      <Ionicons name="person" size={20} color="#9CA3AF" />
                    )}
                  </View>
                  <Text className="flex-1 text-sm font-medium text-gray-900">{bu.display_name || bu.id}</Text>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Unblock User', `Unblock ${bu.display_name || 'this user'}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Unblock', onPress: () => unblockUserMutation.mutate(bu.id) },
                      ])
                    }
                    className="rounded-lg px-3 py-1.5"
                    style={{ backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#92400E' }}
                    disabled={unblockUserMutation.isPending}
                  >
                    <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '600' }}>Unblock</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>

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

// ——— Sub-components ———

function SectionCard({ title, icon, onPress }: { title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mt-3 rounded-2xl bg-white p-4 flex-row items-center"
      style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}
    >
      <View style={{ backgroundColor: '#F0FDF4', borderRadius: 10, padding: 8, marginRight: 12 }}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' }}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.gray[400]} />
    </Pressable>
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

function PortfolioPhotoUploader({ imageUrl, onUploaded }: { imageUrl: string; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);

  async function pickAndUpload() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const uploadResult = await uploadFile(result.assets[0].uri, "portfolio");
      onUploaded(uploadResult.url);
    } catch {
      Alert.alert("Upload failed", "Please try again");
    } finally {
      setUploading(false);
    }
  }

  if (imageUrl) return null;

  return (
    <Pressable
      onPress={pickAndUpload}
      disabled={uploading}
      style={{
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 10,
      }}
    >
      <Ionicons name={uploading ? "hourglass" : "camera-outline"} size={20} color="#6B7280" />
      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
        {uploading ? 'Uploading...' : 'Upload Photo'}
      </Text>
    </Pressable>
  );
}

// Shared style tokens
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formLabel: any = { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formInput: any = { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#111827', marginBottom: 10 };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const btnPrimary: any = { backgroundColor: '#1B5E20', borderRadius: 10, paddingVertical: 12, alignItems: 'center' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const btnPrimaryText: any = { color: '#fff', fontWeight: '700', fontSize: 14 };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const btnSecondary: any = { backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const btnSecondaryText: any = { color: '#374151', fontWeight: '600', fontSize: 13 };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const btnDanger: any = { backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const btnDangerText: any = { color: '#991B1B', fontWeight: '600', fontSize: 13 };
