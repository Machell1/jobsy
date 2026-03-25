import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getListings, Listing } from "@/api/listings";
import {
  searchListings,
  searchProfiles,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
  getTrending,
  type SearchParams,
} from "@/api/search";
import { CategoryPicker } from "@/components/CategoryPicker";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard } from "@/components/ListingCard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { COLORS } from "@/constants/theme";

type SearchTab = "services" | "providers";

interface ProviderResult {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  parish: string | null;
  service_category: string | null;
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
  bio: string | null;
  skills: string[];
}

interface SavedSearch {
  id: string;
  name?: string;
  query?: string;
  filters?: { category?: string; parish?: string; [key: string]: unknown };
  notification_enabled?: boolean;
}

interface TrendingItem {
  query?: string;
  term?: string;
  name?: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [availabilityFilter, setAvailabilityFilter] = useState<"today" | "this_week" | null>(null);
  const [searchTab, setSearchTab] = useState<SearchTab>("services");
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [showSavedModal, setShowSavedModal] = useState(false);

  useEffect(() => {
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["search-listings", debouncedQuery, selectedCategory, availabilityFilter],
    queryFn: async () => {
      const availabilityParam = availabilityFilter || undefined;
      if (debouncedQuery.length > 0) {
        const result = await searchListings({
          q: debouncedQuery,
          category: selectedCategory || undefined,
          availability: availabilityParam,
          limit: 30,
        } as SearchParams & { availability?: string });
        return result.hits || [];
      }
      return getListings({
        category: selectedCategory || undefined,
        availability: availabilityParam,
        limit: 30,
      } as Parameters<typeof getListings>[0] & { availability?: string });
    },
    staleTime: 1000 * 30,
  });

  const { data: providers = [], isLoading: loadingProviders } = useQuery({
    queryKey: ["search-providers", debouncedQuery, selectedCategory],
    queryFn: async () => {
      const result = await searchProfiles({
        q: debouncedQuery || undefined,
        skills: selectedCategory || undefined,
        limit: 30,
      });
      return (result.hits || result || []) as ProviderResult[];
    },
    enabled: searchTab === "providers",
    staleTime: 1000 * 30,
  });

  const { data: savedSearches = [], isLoading: loadingSaved } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: getSavedSearches,
    enabled: showSavedModal,
  });

  const { data: trending = [], isLoading: loadingTrending } = useQuery({
    queryKey: ["trending"],
    queryFn: getTrending,
    staleTime: 1000 * 60 * 5,
  });

  const saveSearchMutation = useMutation({
    mutationFn: () =>
      saveSearch({
        query: debouncedQuery || undefined,
        filters: selectedCategory ? { category: selectedCategory } : undefined,
        notification_enabled: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      Alert.alert("Saved", "Search saved successfully.");
    },
    onError: () => Alert.alert("Error", "Failed to save search."),
  });

  const deleteSearchMutation = useMutation({
    mutationFn: (id: string) => deleteSavedSearch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-searches"] }),
    onError: () => Alert.alert("Error", "Failed to delete saved search."),
  });

  const handleCategorySelect = useCallback((cat: string) => {
    setSelectedCategory((prev) => (prev === cat ? null : cat));
  }, []);

  function loadSavedSearch(s: SavedSearch) {
    if (s.query) setQuery(s.query);
    if (s.filters?.category) setSelectedCategory(s.filters.category);
    setShowSavedModal(false);
  }

  const hasTrending = Array.isArray(trending) && trending.length > 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _hasSavedContent = !isLoading && listings.length === 0 && !debouncedQuery;

  return (
    <View className="flex-1 bg-dark-50">
      {/* Search bar */}
      <View className="bg-white px-4 pb-2 pt-2">
        <View className="flex-row items-center rounded-xl bg-dark-50 px-4 py-2.5">
          <Ionicons name="search" size={20} color={COLORS.gray[500]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search services, skills, providers..."
            className="ml-3 flex-1 text-base text-dark-800"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray[400]} />
            </Pressable>
          )}
        </View>

        {/* Save / Saved searches buttons */}
        <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
          <Pressable
            onPress={() => {
              if (!debouncedQuery && !selectedCategory) {
                Alert.alert("Nothing to save", "Enter a search query or pick a category first.");
                return;
              }
              saveSearchMutation.mutate();
            }}
            disabled={saveSearchMutation.isPending}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: '#EEF2FF',
              borderWidth: 1,
              borderColor: '#C7D2FE',
            }}
          >
            <Ionicons name="bookmark-outline" size={14} color="#4338CA" />
            <Text style={{ color: '#4338CA', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
              {saveSearchMutation.isPending ? 'Saving...' : 'Save Search'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setShowSavedModal(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: '#F0FDF4',
              borderWidth: 1,
              borderColor: '#BBF7D0',
            }}
          >
            <Ionicons name="bookmarks-outline" size={14} color="#166534" />
            <Text style={{ color: '#166534', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>Saved Searches</Text>
          </Pressable>
        </View>
      </View>

      {/* Search Tab Toggle: Services | Providers */}
      <View className="bg-white px-4 pb-2">
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#F3F4F6",
            borderRadius: 10,
            padding: 3,
          }}
        >
          <Pressable
            onPress={() => setSearchTab("services")}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: "center",
              backgroundColor: searchTab === "services" ? "#FFFFFF" : "transparent",
              shadowColor: searchTab === "services" ? "#000" : "transparent",
              shadowOpacity: searchTab === "services" ? 0.08 : 0,
              shadowRadius: 2,
              elevation: searchTab === "services" ? 2 : 0,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons
                name="briefcase-outline"
                size={14}
                color={searchTab === "services" ? "#1B5E20" : "#6B7280"}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: searchTab === "services" ? "#1B5E20" : "#6B7280",
                }}
              >
                Services
              </Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setSearchTab("providers")}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: "center",
              backgroundColor: searchTab === "providers" ? "#FFFFFF" : "transparent",
              shadowColor: searchTab === "providers" ? "#000" : "transparent",
              shadowOpacity: searchTab === "providers" ? 0.08 : 0,
              shadowRadius: 2,
              elevation: searchTab === "providers" ? 2 : 0,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons
                name="people-outline"
                size={14}
                color={searchTab === "providers" ? "#1B5E20" : "#6B7280"}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: searchTab === "providers" ? "#1B5E20" : "#6B7280",
                }}
              >
                Providers
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Availability filter chips */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
        <Pressable
          onPress={() => setAvailabilityFilter(availabilityFilter === "today" ? null : "today")}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 20,
            backgroundColor: availabilityFilter === "today" ? '#1B5E20' : '#F3F4F6',
            borderWidth: 1,
            borderColor: availabilityFilter === "today" ? '#1B5E20' : '#E5E7EB',
          }}
        >
          <Ionicons name="today-outline" size={14} color={availabilityFilter === "today" ? '#fff' : '#374151'} />
          <Text style={{ fontSize: 13, fontWeight: '600', marginLeft: 4, color: availabilityFilter === "today" ? '#fff' : '#374151' }}>
            Available Today
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setAvailabilityFilter(availabilityFilter === "this_week" ? null : "this_week")}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 20,
            backgroundColor: availabilityFilter === "this_week" ? '#1B5E20' : '#F3F4F6',
            borderWidth: 1,
            borderColor: availabilityFilter === "this_week" ? '#1B5E20' : '#E5E7EB',
          }}
        >
          <Ionicons name="calendar-outline" size={14} color={availabilityFilter === "this_week" ? '#fff' : '#374151'} />
          <Text style={{ fontSize: 13, fontWeight: '600', marginLeft: 4, color: availabilityFilter === "this_week" ? '#fff' : '#374151' }}>
            Available This Week
          </Text>
        </Pressable>
      </View>

      {/* Category chips */}
      <CategoryPicker
        selected={selectedCategory}
        onSelect={handleCategorySelect}
        horizontal
      />

      {/* Results */}
      {searchTab === "services" ? (
        isLoading ? (
          <LoadingScreen />
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item: Listing) => item.id}
            renderItem={({ item }) => (
              <ListingCard
                listing={item}
                onPress={() => router.push(`/(tabs)/listing/${item.id}`)}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                icon="search-outline"
                title="No results found"
                subtitle="Try different keywords or browse categories"
              />
            }
            ListFooterComponent={
              hasTrending ? (
                <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 }}>
                    Trending
                  </Text>
                  {loadingTrending ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {(Array.isArray(trending) ? trending : []).map((item: string | TrendingItem, idx: number) => {
                        const label = typeof item === 'string' ? item : (item.query || item.term || item.name || String(item));
                        return (
                          <Pressable
                            key={idx}
                            onPress={() => setQuery(label)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: '#FFF7ED',
                              borderWidth: 1,
                              borderColor: '#FED7AA',
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 20,
                            }}
                          >
                            <Ionicons name="trending-up" size={13} color="#C2410C" />
                            <Text style={{ color: '#C2410C', fontSize: 13, fontWeight: '500', marginLeft: 4 }}>{label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : null
            }
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          />
        )
      ) : (
        /* Provider Results */
        loadingProviders ? (
          <LoadingScreen />
        ) : (
          <FlatList
            data={providers}
            keyExtractor={(item: ProviderResult) => item.id || item.user_id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/profile/[id]",
                    params: { id: item.user_id || item.id },
                  })
                }
                style={{
                  flexDirection: "row",
                  backgroundColor: "#FFFFFF",
                  marginHorizontal: 16,
                  marginBottom: 10,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  shadowColor: "#000",
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                {/* Avatar */}
                {item.avatar_url ? (
                  <Image
                    source={{ uri: item.avatar_url }}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      marginRight: 12,
                      backgroundColor: "#F3F4F6",
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      marginRight: 12,
                      backgroundColor: "#EEF2FF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="person" size={22} color="#4338CA" />
                  </View>
                )}

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: "#111827",
                      }}
                      numberOfLines={1}
                    >
                      {item.display_name}
                    </Text>
                    {item.is_verified && (
                      <Ionicons name="checkmark-circle" size={14} color="#1B5E20" />
                    )}
                  </View>

                  {/* Rating */}
                  {item.rating_count > 0 && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 2,
                        gap: 2,
                      }}
                    >
                      <Ionicons name="star" size={12} color="#FFC107" />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        {item.rating_avg.toFixed(1)}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                        ({item.rating_count})
                      </Text>
                    </View>
                  )}

                  {/* Category & Parish */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 4,
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    {item.service_category && (
                      <View
                        style={{
                          backgroundColor: "#EEF2FF",
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: "#4338CA",
                            fontSize: 11,
                            fontWeight: "600",
                          }}
                        >
                          {item.service_category}
                        </Text>
                      </View>
                    )}
                    {item.parish && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Ionicons
                          name="location-outline"
                          size={12}
                          color="#6B7280"
                        />
                        <Text style={{ fontSize: 11, color: "#6B7280" }}>
                          {item.parish}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Chevron */}
                <View style={{ justifyContent: "center" }}>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <EmptyState
                icon="people-outline"
                title="No providers found"
                subtitle="Try different keywords or browse categories"
              />
            }
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 20, flexGrow: 1 }}
          />
        )
      )}

      {/* Saved Searches Modal */}
      <Modal
        visible={showSavedModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSavedModal(false)}
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
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Saved Searches</Text>
            <Pressable onPress={() => setShowSavedModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </Pressable>
          </View>

          {loadingSaved ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (Array.isArray(savedSearches) && savedSearches.length === 0) ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
              <Ionicons name="bookmark-outline" size={48} color="#9CA3AF" />
              <Text style={{ marginTop: 12, fontSize: 15, fontWeight: '600', color: '#6B7280' }}>No saved searches</Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
                Tap "Save Search" after searching to save your query here.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {(Array.isArray(savedSearches) ? savedSearches : []).map((s: SavedSearch) => (
                <View
                  key={s.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                >
                  <Ionicons name="search" size={16} color="#6B7280" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    {s.name && (
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{s.name}</Text>
                    )}
                    {s.query && (
                      <Text style={{ fontSize: 13, color: '#374151' }}>{s.query}</Text>
                    )}
                    {s.filters?.category && (
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>Category: {s.filters.category}</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => loadSavedSearch(s)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: '#EEF2FF',
                      marginRight: 6,
                    }}
                  >
                    <Text style={{ color: '#4338CA', fontSize: 12, fontWeight: '600' }}>Load</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Delete', 'Remove this saved search?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteSearchMutation.mutate(s.id) },
                      ])
                    }
                    style={{ padding: 6 }}
                    disabled={deleteSearchMutation.isPending}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}
