import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { getListings, Listing } from "@/api/listings";
import { searchListings } from "@/api/search";
import { CategoryPicker } from "@/components/CategoryPicker";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard } from "@/components/ListingCard";
import { LoadingScreen } from "@/components/LoadingScreen";
import { COLORS } from "@/constants/theme";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["search-listings", debouncedQuery, selectedCategory],
    queryFn: async () => {
      if (debouncedQuery.length > 0) {
        const result = await searchListings({
          q: debouncedQuery,
          category: selectedCategory || undefined,
          limit: 30,
        });
        return result.hits || [];
      }
      return getListings({
        category: selectedCategory || undefined,
        limit: 30,
      });
    },
    staleTime: 1000 * 30,
  });

  const handleCategorySelect = useCallback((cat: string) => {
    setSelectedCategory((prev) => (prev === cat ? null : cat));
  }, []);

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
      </View>

      {/* Category chips */}
      <CategoryPicker
        selected={selectedCategory}
        onSelect={handleCategorySelect}
        horizontal
      />

      {/* Results */}
      {isLoading ? (
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
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
        />
      )}
    </View>
  );
}
