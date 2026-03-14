import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getTransactions,
  getPayouts,
  requestRefund,
  getReceipt,
  Transaction,
} from "@/api/payments";
import { EmptyState } from "@/components/EmptyState";
import { LoadingScreen } from "@/components/LoadingScreen";
import { COLORS } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";
import { formatCurrency, formatDate } from "@/utils/format";

const TABS = ["Transactions", "Payouts"] as const;
type Tab = (typeof TABS)[number];

export default function PaymentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const [activeTab, setActiveTab] = useState<Tab>("Transactions");

  // Refund modal state
  const [refundTransaction, setRefundTransaction] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState('');

  // Receipt modal state
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [receiptData, setReceiptData] = useState<any>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => getTransactions({ limit: 50 }),
  });

  const { data: payouts = [], isLoading: loadingPayouts } = useQuery({
    queryKey: ["payouts"],
    queryFn: getPayouts,
    enabled: activeTab === "Payouts",
  });

  const refundMutation = useMutation({
    mutationFn: () =>
      requestRefund({
        payment_id: refundTransaction!.id,
        reason: refundReason.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setRefundTransaction(null);
      setRefundReason('');
      Alert.alert("Refund Requested", "Your refund request has been submitted.");
    },
    onError: () => Alert.alert("Error", "Failed to submit refund request."),
  });

  async function openReceipt(tx: Transaction) {
    setReceiptTransaction(tx);
    setReceiptData(null);
    setLoadingReceipt(true);
    try {
      const data = await getReceipt(tx.id);
      setReceiptData(data);
    } catch {
      setReceiptData(null);
    } finally {
      setLoadingReceipt(false);
    }
  }

  const isLoading = activeTab === "Transactions" ? loadingTx : loadingPayouts;

  const statusColors: Record<string, { bg: string; text: string }> = {
    completed: { bg: "#DCFCE7", text: "#166534" },
    pending: { bg: "#FEF9C3", text: "#92400E" },
    failed: { bg: "#FEE2E2", text: "#991B1B" },
    processing: { bg: "#DBEAFE", text: "#1E40AF" },
  };

  return (
    <View className="flex-1 bg-dark-50">
      <Stack.Screen
        options={{
          title: "Payments",
          headerRight: () => (
            <Pressable onPress={() => router.push("/(tabs)/payments/setup")}>
              <Ionicons name="settings-outline" size={24} color={COLORS.primary} />
            </Pressable>
          ),
        }}
      />

      {/* Tab switcher */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: activeTab === tab ? COLORS.primary : '#F3F4F6',
              marginHorizontal: 4,
            }}
          >
            <Text style={{
              fontWeight: '600',
              fontSize: 13,
              color: activeTab === tab ? '#fff' : '#374151',
            }}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : activeTab === "Transactions" ? (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: Transaction }) => {
            const isPayer = item.payer_id === userId;
            const sc = statusColors[item.status] || { bg: "#F3F4F6", text: "#374151" };
            return (
              <View className="mx-4 mb-3 rounded-2xl bg-white p-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="font-semibold text-dark-800">
                      {isPayer ? "Payment sent" : "Payment received"}
                    </Text>
                    {item.description && (
                      <Text className="mt-0.5 text-sm text-dark-500">{item.description}</Text>
                    )}
                  </View>
                  <Text className={`text-lg font-bold ${isPayer ? "text-red-600" : "text-green-600"}`}>
                    {isPayer ? "-" : "+"}{formatCurrency(item.amount, item.currency)}
                  </Text>
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-xs text-dark-400">{formatDate(item.created_at)}</Text>
                  <View style={{ backgroundColor: sc.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ color: sc.text, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>{item.status}</Text>
                  </View>
                </View>

                {/* Action buttons */}
                <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
                  <Pressable
                    onPress={() => openReceipt(item)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: '#EFF6FF',
                      borderWidth: 1,
                      borderColor: '#BFDBFE',
                    }}
                  >
                    <Ionicons name="receipt-outline" size={14} color="#1D4ED8" />
                    <Text style={{ color: '#1D4ED8', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>Receipt</Text>
                  </Pressable>

                  {item.status === 'completed' && isPayer && (
                    <Pressable
                      onPress={() => {
                        setRefundTransaction(item);
                        setRefundReason('');
                      }}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: '#FFF7ED',
                        borderWidth: 1,
                        borderColor: '#FED7AA',
                      }}
                    >
                      <Ionicons name="return-down-back-outline" size={14} color="#C2410C" />
                      <Text style={{ color: '#C2410C', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>Refund</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="card-outline"
              title="No transactions yet"
              subtitle="Your payment history will appear here"
            />
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 20, flexGrow: 1 }}
        />
      ) : (
        /* Payouts tab */
        <FlatList
          data={payouts}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          keyExtractor={(item: any) => item.id}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          renderItem={({ item }: { item: any }) => {
            const sc = statusColors[item.status] || { bg: "#F3F4F6", text: "#374151" };
            return (
              <View className="mx-4 mb-3 rounded-2xl bg-white p-4">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-semibold text-dark-800 text-base">
                    {formatCurrency(item.amount, item.currency || 'USD')}
                  </Text>
                  <View style={{ backgroundColor: sc.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ color: sc.text, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>{item.status}</Text>
                  </View>
                </View>
                {item.destination && (
                  <Text className="text-sm text-dark-500">{item.destination}</Text>
                )}
                <Text className="text-xs text-dark-400 mt-1">{formatDate(item.created_at || item.initiated_at)}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="wallet-outline"
              title="No payouts yet"
              subtitle="Your payout history will appear here"
            />
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 20, flexGrow: 1 }}
        />
      )}

      {/* Refund Modal */}
      <Modal
        visible={!!refundTransaction}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRefundTransaction(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <View className="flex-1 bg-gray-50 p-4">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-lg font-bold text-gray-900">Request Refund</Text>
              <Pressable onPress={() => setRefundTransaction(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            {refundTransaction && (
              <View className="bg-white rounded-xl p-4 mb-4" style={{ borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Text className="text-sm text-gray-500">Transaction</Text>
                <Text className="text-base font-semibold text-gray-900 mt-0.5">
                  {formatCurrency(refundTransaction.amount, refundTransaction.currency)}
                </Text>
                {refundTransaction.description && (
                  <Text className="text-sm text-gray-600 mt-1">{refundTransaction.description}</Text>
                )}
              </View>
            )}

            <Text className="text-sm font-medium text-gray-700 mb-1">Reason (optional)</Text>
            <TextInput
              className="bg-white rounded-lg px-3 py-2.5 mb-5 text-sm text-gray-900"
              style={{ borderWidth: 1, borderColor: '#E5E7EB', minHeight: 80 }}
              placeholder="Describe why you're requesting a refund..."
              value={refundReason}
              onChangeText={setRefundReason}
              multiline
              textAlignVertical="top"
            />

            <Pressable
              onPress={() => refundMutation.mutate()}
              className="rounded-lg py-3 items-center"
              style={{ backgroundColor: '#C2410C' }}
              disabled={refundMutation.isPending}
            >
              <Text className="text-white font-semibold text-base">
                {refundMutation.isPending ? 'Submitting...' : 'Submit Refund Request'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        visible={!!receiptTransaction}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReceiptTransaction(null)}
      >
        <View className="flex-1 bg-gray-50">
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              paddingTop: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
              backgroundColor: '#fff',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Receipt</Text>
            <Pressable onPress={() => setReceiptTransaction(null)}>
              <Ionicons name="close" size={24} color="#333" />
            </Pressable>
          </View>

          {loadingReceipt ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {/* Transaction summary (always shown) */}
              {receiptTransaction && (
                <View
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                >
                  <View style={{ alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                    <View style={{ backgroundColor: '#DCFCE7', borderRadius: 40, padding: 12, marginBottom: 8 }}>
                      <Ionicons name="checkmark-circle" size={32} color="#166534" />
                    </View>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827' }}>
                      {formatCurrency(receiptTransaction.amount, receiptTransaction.currency)}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                      {formatDate(receiptTransaction.created_at)}
                    </Text>
                  </View>

                  <ReceiptRow label="Status" value={receiptTransaction.status} capitalize />
                  <ReceiptRow label="Transaction ID" value={receiptTransaction.id} mono />
                  {receiptTransaction.description && (
                    <ReceiptRow label="Description" value={receiptTransaction.description} />
                  )}
                  <ReceiptRow label="Platform Fee" value={formatCurrency(receiptTransaction.platform_fee, receiptTransaction.currency)} />
                  <ReceiptRow label="Net Amount" value={formatCurrency(receiptTransaction.net_amount, receiptTransaction.currency)} />
                </View>
              )}

              {/* Extra data from API if available */}
              {receiptData && Object.keys(receiptData).length > 0 && (
                <View
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 }}>Additional Details</Text>
                  {Object.entries(receiptData)
                    .filter(([k]) => !['id', 'amount', 'currency', 'status', 'created_at', 'description', 'platform_fee', 'net_amount', 'payer_id', 'payee_id'].includes(k))
                    .map(([k, v]) => (
                      <ReceiptRow key={k} label={k.replace(/_/g, ' ')} value={String(v)} capitalize />
                    ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

function ReceiptRow({ label, value, capitalize, mono }: { label: string; value: string; capitalize?: boolean; mono?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6 }}>
      <Text style={{ fontSize: 13, color: '#6B7280', textTransform: 'capitalize', flex: 1 }}>{label}</Text>
      <Text
        style={{
          fontSize: 13,
          color: '#111827',
          fontWeight: '500',
          textTransform: capitalize ? 'capitalize' : 'none',
          fontFamily: mono ? 'monospace' : undefined,
          flex: 1,
          textAlign: 'right',
        }}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}
