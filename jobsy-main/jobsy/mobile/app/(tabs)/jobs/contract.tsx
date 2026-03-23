import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as SecureStore from "expo-secure-store";

import {
  getContract,
  getContracts,
  signContract,
  getContractPdfUrl,
  type Contract,
} from "@/api/bidding";
import { API_URL } from "@/api/client";
import { useAuthStore } from "@/stores/auth";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending_signatures: { bg: "#FEF3C7", text: "#92400E" },
  hirer_signed: { bg: "#DBEAFE", text: "#1E40AF" },
  provider_signed: { bg: "#DBEAFE", text: "#1E40AF" },
  fully_signed: { bg: "#DCFCE7", text: "#166534" },
  active: { bg: "#F3E8FF", text: "#6B21A8" },
  completed: { bg: "#DCFCE7", text: "#166534" },
  terminated: { bg: "#FEE2E2", text: "#991B1B" },
  disputed: { bg: "#FEF3C7", text: "#92400E" },
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || { bg: "#F3F4F6", text: "#374151" };
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <View style={{ backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ContractDetailScreen() {
  const { contractId, jobId } = useLocalSearchParams<{ contractId?: string; jobId?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [signatureName, setSignatureName] = useState("");

  // If we have a contractId, fetch directly. Otherwise fetch all and find by jobId.
  const { data: directContract, isLoading: loadingDirect } = useQuery({
    queryKey: ["contract", contractId],
    queryFn: () => getContract(contractId!),
    enabled: !!contractId,
  });

  const { data: allContracts = [], isLoading: loadingAll } = useQuery({
    queryKey: ["contracts"],
    queryFn: getContracts,
    enabled: !contractId && !!jobId,
  });

  const contract: Contract | undefined =
    directContract || allContracts.find((c) => c.job_post_id === jobId);

  const isLoading = loadingDirect || loadingAll;

  const signMutation = useMutation({
    mutationFn: () =>
      signContract(contract!.id, {
        signature_data: signatureName.trim(),
        signature_method: "typed",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract", contract?.id] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["biddingStats"] });
      setSignatureName("");
      Alert.alert("Success", "Contract signed successfully!");
    },
    onError: () => Alert.alert("Error", "Failed to sign contract. Please try again."),
  });

  function handleSign() {
    if (!signatureName.trim()) {
      Alert.alert("Required", "Please type your full name as your digital signature.");
      return;
    }
    Alert.alert(
      "Confirm Signature",
      `By typing "${signatureName.trim()}" you are digitally signing this contract. This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign", onPress: () => signMutation.mutate() },
      ],
    );
  }

  async function handleDownloadPdf() {
    if (!contract) return;
    try {
      const token = await SecureStore.getItemAsync("access_token");
      const url = `${API_URL}${getContractPdfUrl(contract.id)}`;
      const fileUri = `${FileSystem.cacheDirectory}contract-${contract.id}.pdf`;
      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Contract PDF",
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }
    } catch {
      Alert.alert("Error", "Failed to download contract PDF. Please try again.");
    }
  }

  const hasSigned = contract?.signatures?.some((s) => s.signer_id === user?.id);
  const isHirer = user?.id === contract?.hirer_id;
  const isProvider = user?.id === contract?.provider_id;
  const canSign = (isHirer || isProvider) && !hasSigned;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  if (!contract) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
        <Text className="text-base text-gray-500 mt-3">No contract found</Text>
        <Text className="text-sm text-gray-400 mt-1">A contract will be generated when a bid is accepted.</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text style={{ color: "#1B5E20", fontWeight: "600" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-4">
        <Pressable onPress={() => router.back()} className="flex-row items-center mb-3">
          <Ionicons name="arrow-back" size={24} color="#374151" />
          <Text className="text-sm text-gray-600 ml-1">Back</Text>
        </Pressable>

        <View className="flex-row items-start justify-between mb-2">
          <Text className="text-xl font-bold text-gray-900 flex-1 mr-2">{contract.title}</Text>
          <StatusBadge status={contract.status} />
        </View>
        <Text className="text-xs text-gray-400">Generated {formatDate(contract.generated_at)}</Text>
      </View>

      {/* Contract Info */}
      <View className="bg-white mx-4 mt-3 rounded-xl p-4" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
        <Text className="text-sm font-semibold text-gray-900 mb-2">Scope of Work</Text>
        <Text className="text-sm text-gray-600 leading-5">{contract.scope_of_work}</Text>
      </View>

      {/* Financial & Timeline */}
      <View className="bg-white mx-4 mt-3 rounded-xl p-4" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
        <View className="flex-row items-center mb-2">
          <Ionicons name="cash-outline" size={18} color="#1B5E20" />
          <Text className="text-sm font-semibold text-gray-900 ml-2">Agreed Amount</Text>
        </View>
        <Text className="text-xl font-bold text-green-700 mb-3">
          J${contract.agreed_amount.toLocaleString()}
        </Text>

        {contract.start_date && (
          <View className="flex-row items-center mb-1">
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600 ml-2">Start: {formatDate(contract.start_date)}</Text>
          </View>
        )}
        {contract.estimated_end_date && (
          <View className="flex-row items-center mb-1">
            <Ionicons name="flag-outline" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600 ml-2">Est. End: {formatDate(contract.estimated_end_date)}</Text>
          </View>
        )}
        {contract.parish && (
          <View className="flex-row items-center">
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600 ml-2">{contract.parish}</Text>
          </View>
        )}
      </View>

      {/* Terms */}
      {contract.terms_and_conditions && (
        <View className="bg-white mx-4 mt-3 rounded-xl p-4" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
          <Text className="text-sm font-semibold text-gray-900 mb-2">Terms & Conditions</Text>
          <Text className="text-xs text-gray-600 leading-4">{contract.terms_and_conditions}</Text>
        </View>
      )}

      {/* Signatures */}
      <View className="bg-white mx-4 mt-3 rounded-xl p-4" style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
        <Text className="text-sm font-semibold text-gray-900 mb-3">Signatures</Text>

        {contract.signatures?.length > 0 ? (
          contract.signatures.map((sig) => (
            <View key={sig.id} className="flex-row items-center mb-2 bg-green-50 rounded-lg p-2">
              <Ionicons name="checkmark-circle" size={18} color="#166534" />
              <View className="ml-2">
                <Text className="text-sm font-medium text-gray-900">
                  {sig.signer_role === "hirer" ? "Hirer" : "Provider"} - Signed
                </Text>
                <Text className="text-xs text-gray-500">
                  {formatDate(sig.signed_at)} via {sig.signature_method}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-sm text-gray-500">No signatures yet</Text>
        )}

        {/* Sign Section */}
        {canSign && (
          <View className="mt-3 pt-3 border-t border-gray-100">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Sign as {isHirer ? "Hirer" : "Provider"}
            </Text>
            <TextInput
              className="bg-gray-50 rounded-lg px-3 py-2.5 mb-3 text-sm text-gray-900"
              style={{ borderWidth: 1, borderColor: "#E5E7EB" }}
              placeholder="Type your full legal name"
              value={signatureName}
              onChangeText={setSignatureName}
              autoCapitalize="words"
            />
            <Pressable
              onPress={handleSign}
              className="rounded-lg py-3 items-center"
              style={{ backgroundColor: "#1B5E20" }}
              disabled={signMutation.isPending}
            >
              <Text className="text-white font-semibold text-base">
                {signMutation.isPending ? "Signing..." : "Sign Contract"}
              </Text>
            </Pressable>
          </View>
        )}

        {hasSigned && (
          <View className="mt-3 bg-green-50 rounded-lg p-3 flex-row items-center">
            <Ionicons name="checkmark-circle" size={20} color="#166534" />
            <Text className="text-sm text-green-700 ml-2 font-medium">You have signed this contract</Text>
          </View>
        )}
      </View>

      {/* Download PDF */}
      {contract.contract_pdf_url && (
        <Pressable
          onPress={handleDownloadPdf}
          className="mx-4 mt-3 rounded-xl py-3 items-center flex-row justify-center"
          style={{ backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" }}
        >
          <Ionicons name="download-outline" size={20} color="#374151" />
          <Text className="text-sm font-semibold text-gray-700 ml-2">Download PDF</Text>
        </Pressable>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
