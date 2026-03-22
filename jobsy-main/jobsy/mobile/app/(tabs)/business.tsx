import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { api } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { COLORS } from "@/constants/theme";

// ── Types ────────────────────────────────────────────────────────────────

type BusinessType = "business" | "ngo" | "school" | "government";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar_url: string | null;
}

interface BusinessDocument {
  id: string;
  type: "registration_certificate" | "trn" | "other";
  file_name: string;
  status: "pending" | "approved" | "rejected";
  uploaded_at: string;
}

interface BusinessProfile {
  id: string;
  name: string;
  registration_number: string;
  type: BusinessType;
  description: string;
  phone: string;
  email: string;
  address: string;
  parish: string;
  website: string;
  representative_name: string;
  representative_title: string;
  representative_email: string;
  representative_phone: string;
  is_verified: boolean;
  team_members: TeamMember[];
  documents: BusinessDocument[];
  logo_url: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────

const BUSINESS_TYPES: { value: BusinessType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "business", label: "Business", icon: "business-outline" },
  { value: "ngo", label: "NGO", icon: "heart-outline" },
  { value: "school", label: "School", icon: "school-outline" },
  { value: "government", label: "Government", icon: "flag-outline" },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  registration_certificate: "Registration Certificate",
  trn: "TRN Document",
  other: "Other Document",
};

function docStatusColor(status: BusinessDocument["status"]): string {
  switch (status) {
    case "approved":
      return COLORS.success;
    case "pending":
      return COLORS.warning;
    case "rejected":
      return COLORS.error;
    default:
      return COLORS.gray[500];
  }
}

// ── Main Screen ──────────────────────────────────────────────────────────

export default function BusinessProfileScreen() {
  const user = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editRegNumber, setEditRegNumber] = useState("");
  const [editType, setEditType] = useState<BusinessType>("business");
  const [editDescription, setEditDescription] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editRepName, setEditRepName] = useState("");
  const [editRepTitle, setEditRepTitle] = useState("");
  const [editRepEmail, setEditRepEmail] = useState("");
  const [editRepPhone, setEditRepPhone] = useState("");

  // ── Data Fetching ────────────────────────────────────────────────────

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get<BusinessProfile>("/api/business/profile");
      setProfile(data);
      populateEditFields(data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        // No profile yet — show empty creation state
        setProfile(null);
        setIsEditing(true);
      } else {
        setError("Failed to load business profile.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const populateEditFields = (data: BusinessProfile) => {
    setEditName(data.name || "");
    setEditRegNumber(data.registration_number || "");
    setEditType(data.type || "business");
    setEditDescription(data.description || "");
    setEditPhone(data.phone || "");
    setEditEmail(data.email || "");
    setEditAddress(data.address || "");
    setEditWebsite(data.website || "");
    setEditRepName(data.representative_name || "");
    setEditRepTitle(data.representative_title || "");
    setEditRepEmail(data.representative_email || "");
    setEditRepPhone(data.representative_phone || "");
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  // Fetch on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editName.trim()) {
      Alert.alert("Required", "Business name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editName.trim(),
        registration_number: editRegNumber.trim(),
        type: editType,
        description: editDescription.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
        website: editWebsite.trim(),
        representative_name: editRepName.trim(),
        representative_title: editRepTitle.trim(),
        representative_email: editRepEmail.trim(),
        representative_phone: editRepPhone.trim(),
      };
      const { data } = await api.put<BusinessProfile>(
        "/api/business/profile",
        payload
      );
      setProfile(data);
      setIsEditing(false);
      Alert.alert("Saved", "Business profile updated successfully.");
    } catch {
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Document Upload ──────────────────────────────────────────────────

  const handleUploadDocument = async (docType: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      setUploadingDoc(true);
      const uri = result.assets[0].uri;
      const filename = uri.split("/").pop() || "document.jpg";
      const formData = new FormData();
      formData.append("document", {
        uri,
        name: filename,
        type: "image/jpeg",
      } as unknown as Blob);
      formData.append("type", docType);

      await api.post("/api/business/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Alert.alert("Uploaded", "Document submitted for review.");
      fetchProfile();
    } catch {
      Alert.alert("Error", "Failed to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  // ── Render: Loading / Error ──────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-gray-500 mt-3">Loading business profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-8">
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.gray[400]} />
        <Text className="mt-4 text-lg font-semibold text-gray-700">{error}</Text>
        <Pressable
          onPress={fetchProfile}
          className="mt-4 px-6 py-3 rounded-xl"
          style={{ backgroundColor: COLORS.primary }}
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  // ── Render: Form Field Helper ────────────────────────────────────────

  function renderField(
    label: string,
    value: string,
    setter: (v: string) => void,
    options?: {
      placeholder?: string;
      keyboardType?: "default" | "email-address" | "phone-pad" | "url";
      multiline?: boolean;
    }
  ) {
    return (
      <View className="mb-4">
        <Text className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
          {label}
        </Text>
        {isEditing ? (
          <TextInput
            value={value}
            onChangeText={setter}
            placeholder={options?.placeholder || label}
            placeholderTextColor={COLORS.gray[400]}
            keyboardType={options?.keyboardType || "default"}
            multiline={options?.multiline}
            textAlignVertical={options?.multiline ? "top" : "center"}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900"
            style={options?.multiline ? { minHeight: 80 } : undefined}
          />
        ) : (
          <Text className="text-sm text-gray-800 py-1">
            {value || "Not set"}
          </Text>
        )}
      </View>
    );
  }

  // ── Render: Main ─────────────────────────────────────────────────────

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-2xl font-bold text-gray-900">
              Business Profile
            </Text>
            {profile?.is_verified && (
              <View className="ml-2 flex-row items-center bg-green-100 px-2 py-0.5 rounded-full">
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={COLORS.success}
                />
                <Text className="text-xs font-semibold text-green-800 ml-1">
                  Verified
                </Text>
              </View>
            )}
          </View>
          <Text className="text-sm text-gray-500 mt-1">
            {profile
              ? "Manage your organization details"
              : "Set up your business profile"}
          </Text>
        </View>
        {!isEditing && profile && (
          <Pressable
            onPress={() => {
              populateEditFields(profile);
              setIsEditing(true);
            }}
            className="px-4 py-2 rounded-lg bg-white border border-gray-200"
          >
            <Text className="text-sm font-semibold text-green-700">Edit</Text>
          </Pressable>
        )}
      </View>

      {/* Business Info Section */}
      <View className="mx-5 mt-3 bg-white rounded-xl p-5 border border-gray-100">
        <View className="flex-row items-center mb-4">
          <Ionicons name="business" size={18} color={COLORS.primary} />
          <Text className="text-base font-semibold text-gray-900 ml-2">
            Business Information
          </Text>
        </View>

        {renderField("Business Name", editName, setEditName, {
          placeholder: "Enter business name",
        })}
        {renderField("Registration Number", editRegNumber, setEditRegNumber, {
          placeholder: "e.g., 123456",
        })}

        {/* Business Type Selector */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Type
          </Text>
          {isEditing ? (
            <View className="flex-row flex-wrap gap-2">
              {BUSINESS_TYPES.map((bt) => (
                <Pressable
                  key={bt.value}
                  onPress={() => setEditType(bt.value)}
                  className={`flex-row items-center px-3 py-2 rounded-lg border ${
                    editType === bt.value
                      ? "bg-green-50 border-green-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Ionicons
                    name={bt.icon}
                    size={16}
                    color={
                      editType === bt.value ? COLORS.primary : COLORS.gray[500]
                    }
                  />
                  <Text
                    className={`text-sm ml-1.5 ${
                      editType === bt.value
                        ? "text-green-800 font-semibold"
                        : "text-gray-600"
                    }`}
                  >
                    {bt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text className="text-sm text-gray-800 py-1 capitalize">
              {profile?.type || "Not set"}
            </Text>
          )}
        </View>

        {renderField("Description", editDescription, setEditDescription, {
          placeholder: "Describe your business",
          multiline: true,
        })}
        {renderField("Phone", editPhone, setEditPhone, {
          placeholder: "+1 (876) 000-0000",
          keyboardType: "phone-pad",
        })}
        {renderField("Email", editEmail, setEditEmail, {
          placeholder: "contact@business.com",
          keyboardType: "email-address",
        })}
        {renderField("Address", editAddress, setEditAddress, {
          placeholder: "Street address",
        })}
        {renderField("Website", editWebsite, setEditWebsite, {
          placeholder: "https://",
          keyboardType: "url",
        })}
      </View>

      {/* Representative Section */}
      <View className="mx-5 mt-3 bg-white rounded-xl p-5 border border-gray-100">
        <View className="flex-row items-center mb-4">
          <Ionicons name="person-circle" size={18} color={COLORS.primary} />
          <Text className="text-base font-semibold text-gray-900 ml-2">
            Authorized Representative
          </Text>
        </View>

        {renderField("Full Name", editRepName, setEditRepName, {
          placeholder: "Representative name",
        })}
        {renderField("Title / Position", editRepTitle, setEditRepTitle, {
          placeholder: "e.g., Managing Director",
        })}
        {renderField("Email", editRepEmail, setEditRepEmail, {
          placeholder: "rep@business.com",
          keyboardType: "email-address",
        })}
        {renderField("Phone", editRepPhone, setEditRepPhone, {
          placeholder: "+1 (876) 000-0000",
          keyboardType: "phone-pad",
        })}
      </View>

      {/* Save / Cancel Buttons */}
      {isEditing && (
        <View className="mx-5 mt-4 flex-row gap-3">
          {profile && (
            <Pressable
              onPress={() => {
                if (profile) populateEditFields(profile);
                setIsEditing(false);
              }}
              className="flex-1 py-3.5 rounded-xl items-center bg-gray-100"
            >
              <Text className="text-gray-700 font-semibold">Cancel</Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="flex-1 py-3.5 rounded-xl items-center"
            style={{ backgroundColor: COLORS.primary }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Save Profile</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Documents Section */}
      <View className="mx-5 mt-4 bg-white rounded-xl p-5 border border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <Ionicons name="document-text" size={18} color={COLORS.primary} />
            <Text className="text-base font-semibold text-gray-900 ml-2">
              Documents
            </Text>
          </View>
          {uploadingDoc && (
            <ActivityIndicator size="small" color={COLORS.primary} />
          )}
        </View>

        {/* Existing Documents */}
        {profile?.documents && profile.documents.length > 0 ? (
          <View className="mb-4 gap-2">
            {profile.documents.map((doc) => (
              <View
                key={doc.id}
                className="flex-row items-center p-3 bg-gray-50 rounded-lg"
              >
                <Ionicons
                  name="document-attach"
                  size={20}
                  color={COLORS.gray[500]}
                />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-medium text-gray-800">
                    {DOC_TYPE_LABELS[doc.type] || doc.type}
                  </Text>
                  <Text className="text-xs text-gray-500">{doc.file_name}</Text>
                </View>
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${docStatusColor(doc.status)}15`,
                  }}
                >
                  <Text
                    className="text-xs font-semibold capitalize"
                    style={{ color: docStatusColor(doc.status) }}
                  >
                    {doc.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="items-center py-4 mb-4">
            <Ionicons
              name="cloud-upload-outline"
              size={32}
              color={COLORS.gray[400]}
            />
            <Text className="text-sm text-gray-400 mt-2">
              No documents uploaded yet
            </Text>
          </View>
        )}

        {/* Upload Buttons */}
        <View className="gap-2">
          <Pressable
            onPress={() => handleUploadDocument("registration_certificate")}
            disabled={uploadingDoc}
            className="flex-row items-center p-3 rounded-xl border border-dashed border-gray-300"
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text className="text-sm text-green-700 font-medium ml-2">
              Upload Registration Certificate
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleUploadDocument("trn")}
            disabled={uploadingDoc}
            className="flex-row items-center p-3 rounded-xl border border-dashed border-gray-300"
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text className="text-sm text-green-700 font-medium ml-2">
              Upload TRN Document
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Team Members */}
      {profile?.team_members && profile.team_members.length > 0 && (
        <View className="mx-5 mt-4 bg-white rounded-xl p-5 border border-gray-100">
          <View className="flex-row items-center mb-4">
            <Ionicons name="people" size={18} color={COLORS.primary} />
            <Text className="text-base font-semibold text-gray-900 ml-2">
              Team Members
            </Text>
          </View>

          <View className="gap-2">
            {profile.team_members.map((member) => (
              <View
                key={member.id}
                className="flex-row items-center p-3 bg-gray-50 rounded-lg"
              >
                <View className="h-9 w-9 rounded-full bg-gray-200 items-center justify-center">
                  {member.avatar_url ? (
                    <Image
                      source={{ uri: member.avatar_url }}
                      className="h-9 w-9 rounded-full"
                    />
                  ) : (
                    <Ionicons
                      name="person"
                      size={16}
                      color={COLORS.gray[500]}
                    />
                  )}
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-semibold text-gray-800">
                    {member.name}
                  </Text>
                  <Text className="text-xs text-gray-500">{member.role}</Text>
                </View>
                <Text className="text-xs text-gray-400">{member.email}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
