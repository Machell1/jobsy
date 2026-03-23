import { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteListing, getMyListings, Listing, updateListing } from "@/api/listings";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard } from "@/components/ListingCard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { COLORS } from "@/constants/theme";

export default function MyListingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBudgetMin, setEditBudgetMin] = useState("");
  const [editBudgetMax, setEditBudgetMax] = useState("");

  // Fetch all statuses for user's own listings
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["my-listings"],
    queryFn: () => getMyListings({ limit: 50 }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateListing>[1] }) =>
      updateListing(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      setEditingListing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-listings"] }),
  });

  function openEdit(listing: Listing) {
    setEditingListing(listing);
    setEditTitle(listing.title);
    setEditDescription(listing.description);
    setEditBudgetMin(listing.budget_min != null ? String(listing.budget_min) : "");
    setEditBudgetMax(listing.budget_max != null ? String(listing.budget_max) : "");
  }

  function confirmDelete(listing: Listing) {
    Alert.alert(
      "Delete Listing",
      `Are you sure you want to delete "${listing.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(listing.id),
        },
      ],
    );
  }

  function submitEdit() {
    if (!editingListing) return;
    editMutation.mutate({
      id: editingListing.id,
      data: {
        title: editTitle.trim() || undefined,
        description: editDescription.trim() || undefined,
        budget_min: editBudgetMin ? Number(editBudgetMin) : undefined,
        budget_max: editBudgetMax ? Number(editBudgetMax) : undefined,
      },
    });
  }

  if (isLoading) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-dark-50">
      <Stack.Screen
        options={{
          title: "My Listings",
          headerRight: () => (
            <Pressable onPress={() => router.push("/(tabs)/listing/create")}>
              <Ionicons name="add-circle" size={28} color={COLORS.primary} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <ListingCard
              listing={item}
              onPress={() => router.push(`/(tabs)/listing/${item.id}`)}
            />
            <View className="mx-4 mb-3 -mt-2 flex-row justify-end gap-2">
              <Pressable
                onPress={() => router.push({ pathname: "/(tabs)/listing/create", params: { editId: item.id } })}
                className="flex-row items-center rounded-lg bg-primary-100 px-3 py-1.5"
              >
                <Ionicons name="pencil-outline" size={14} color={COLORS.primary} />
                <Text className="ml-1 text-xs font-medium text-primary-900">Edit</Text>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(item)}
                className="flex-row items-center rounded-lg bg-red-100 px-3 py-1.5"
              >
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text className="ml-1 text-xs font-medium text-red-600">Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="document-outline"
            title="No listings yet"
            subtitle="Post your first job listing to get started"
          />
        }
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 20, flexGrow: 1 }}
      />

      {/* Edit Modal */}
      <Modal
        visible={editingListing != null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingListing(null)}
      >
        <View className="flex-1 bg-dark-50 p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-dark-900">Edit Listing</Text>
            <Pressable onPress={() => setEditingListing(null)}>
              <Ionicons name="close" size={24} color={COLORS.black} />
            </Pressable>
          </View>

          <Text className="mb-1 text-sm font-medium text-dark-700">Title</Text>
          <TextInput
            value={editTitle}
            onChangeText={setEditTitle}
            className="mb-3 rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-900"
            placeholder="Listing title"
          />

          <Text className="mb-1 text-sm font-medium text-dark-700">Description</Text>
          <TextInput
            value={editDescription}
            onChangeText={setEditDescription}
            className="mb-3 rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-900"
            placeholder="Describe the listing"
            multiline
            numberOfLines={4}
            style={{ textAlignVertical: "top" }}
          />

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <Text className="mb-1 text-sm font-medium text-dark-700">Budget Min</Text>
              <TextInput
                value={editBudgetMin}
                onChangeText={setEditBudgetMin}
                className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-900"
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-sm font-medium text-dark-700">Budget Max</Text>
              <TextInput
                value={editBudgetMax}
                onChangeText={setEditBudgetMax}
                className="rounded-xl border border-dark-200 bg-white px-4 py-3 text-dark-900"
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Pressable
            onPress={submitEdit}
            disabled={editMutation.isPending}
            className="items-center rounded-2xl bg-primary-500 py-4"
          >
            <Text className="font-semibold text-white">
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
