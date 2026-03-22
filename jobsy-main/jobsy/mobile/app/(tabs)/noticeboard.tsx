import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { api } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { EmptyState } from "@/components/EmptyState";
import { COLORS } from "@/constants/theme";

// ── Types ────────────────────────────────────────────────────────────────

interface PostAuthor {
  id: string;
  display_name: string;
  avatar_url: string | null;
  parish: string | null;
}

interface Comment {
  id: string;
  author: PostAuthor;
  text: string;
  created_at: string;
}

interface Post {
  id: string;
  author: PostAuthor;
  text: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

const FILTERS = ["All", "Following", "My Parish"] as const;
type FilterName = (typeof FILTERS)[number];

// ── Main Screen ──────────────────────────────────────────────────────────

export default function NoticeboardScreen() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterName>("All");

  // Create post
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Comments
  const [commentModalPost, setCommentModalPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // ── Data Fetching ────────────────────────────────────────────────────

  const fetchPosts = useCallback(async () => {
    try {
      setError(null);
      const params: Record<string, string> = {};
      if (activeFilter === "Following") params.filter = "following";
      if (activeFilter === "My Parish") params.filter = "parish";
      const { data } = await api.get<Post[]>("/api/noticeboard", { params });
      setPosts(data);
    } catch {
      setError("Failed to load posts. Pull down to try again.");
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, [fetchPosts]);

  // Fetch on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Re-fetch when filter changes
  React.useEffect(() => {
    setIsLoading(true);
    fetchPosts();
  }, [activeFilter, fetchPosts]);

  // ── Actions ──────────────────────────────────────────────────────────

  const handleLike = async (postId: string) => {
    try {
      await api.post(`/api/noticeboard/${postId}/like`);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                is_liked: !p.is_liked,
                like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1,
              }
            : p
        )
      );
    } catch {
      // silently fail
    }
  };

  const handleShare = async (post: Post) => {
    try {
      const { Share } = await import("react-native");
      await Share.share({
        message: `${post.text}\n\nShared from Jobsy`,
        url: `https://jobsyja.com/noticeboard/${post.id}`,
      });
    } catch {
      // user cancelled
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setNewPostImage(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostText.trim()) return;
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append("text", newPostText.trim());
      if (newPostImage) {
        const filename = newPostImage.split("/").pop() || "photo.jpg";
        formData.append("media", {
          uri: newPostImage,
          name: filename,
          type: "image/jpeg",
        } as unknown as Blob);
      }
      await api.post("/api/noticeboard", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNewPostText("");
      setNewPostImage(null);
      setShowCreateModal(false);
      fetchPosts();
    } catch {
      Alert.alert("Error", "Failed to create post. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const openComments = async (post: Post) => {
    setCommentModalPost(post);
    setComments([]);
    setCommentText("");
    setLoadingComments(true);
    try {
      const { data } = await api.get<Comment[]>(
        `/api/noticeboard/${post.id}/comments`
      );
      setComments(data);
    } catch {
      // empty state will show
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !commentModalPost) return;
    setSendingComment(true);
    try {
      const { data } = await api.post<Comment>(
        `/api/noticeboard/${commentModalPost.id}/comments`,
        { text: commentText.trim() }
      );
      setComments((prev) => [...prev, data]);
      setCommentText("");
      setPosts((prev) =>
        prev.map((p) =>
          p.id === commentModalPost.id
            ? { ...p, comment_count: p.comment_count + 1 }
            : p
        )
      );
    } catch {
      Alert.alert("Error", "Failed to send comment.");
    } finally {
      setSendingComment(false);
    }
  };

  // ── Render: Post Card ────────────────────────────────────────────────

  function renderPost({ item }: { item: Post }) {
    return (
      <View className="bg-white mx-4 mb-3 rounded-xl border border-gray-100 overflow-hidden">
        {/* Author Header */}
        <View className="flex-row items-center p-4 pb-2">
          <View className="h-10 w-10 rounded-full bg-gray-200 items-center justify-center overflow-hidden">
            {item.author.avatar_url ? (
              <Image
                source={{ uri: item.author.avatar_url }}
                className="h-10 w-10"
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person" size={20} color={COLORS.gray[500]} />
            )}
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-gray-900">
              {item.author.display_name}
            </Text>
            <View className="flex-row items-center">
              <Text className="text-xs text-gray-500">
                {formatRelativeTime(item.created_at)}
              </Text>
              {item.author.parish && (
                <>
                  <Text className="text-xs text-gray-300 mx-1">|</Text>
                  <Ionicons
                    name="location-outline"
                    size={10}
                    color={COLORS.gray[400]}
                  />
                  <Text className="text-xs text-gray-400 ml-0.5">
                    {item.author.parish}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="px-4 pb-2">
          <Text className="text-sm text-gray-800 leading-5">{item.text}</Text>
        </View>

        {/* Media */}
        {item.media_url && item.media_type === "image" && (
          <Image
            source={{ uri: item.media_url }}
            className="w-full h-56"
            resizeMode="cover"
          />
        )}

        {/* Actions */}
        <View className="flex-row items-center px-4 py-3 border-t border-gray-100">
          {/* Like */}
          <Pressable
            onPress={() => handleLike(item.id)}
            className="flex-row items-center mr-5"
          >
            <Ionicons
              name={item.is_liked ? "thumbs-up" : "thumbs-up-outline"}
              size={18}
              color={item.is_liked ? COLORS.primary : COLORS.gray[500]}
            />
            <Text
              className={`text-xs ml-1.5 font-medium ${
                item.is_liked ? "text-green-700" : "text-gray-500"
              }`}
            >
              {item.like_count > 0 ? item.like_count : "Like"}
            </Text>
          </Pressable>

          {/* Comment */}
          <Pressable
            onPress={() => openComments(item)}
            className="flex-row items-center mr-5"
          >
            <Ionicons
              name="chatbubble-outline"
              size={17}
              color={COLORS.gray[500]}
            />
            <Text className="text-xs ml-1.5 text-gray-500 font-medium">
              {item.comment_count > 0 ? item.comment_count : "Comment"}
            </Text>
          </Pressable>

          {/* Share */}
          <Pressable
            onPress={() => handleShare(item)}
            className="flex-row items-center"
          >
            <Ionicons
              name="share-social-outline"
              size={17}
              color={COLORS.gray[500]}
            />
            <Text className="text-xs ml-1.5 text-gray-500 font-medium">
              Share
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Render: Main ─────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-gray-50">
      {/* Filter Chips */}
      <View className="px-4 pt-4 pb-2">
        <FlatList
          horizontal
          data={FILTERS as unknown as FilterName[]}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isActive = activeFilter === item;
            return (
              <Pressable
                onPress={() => setActiveFilter(item)}
                className={`mr-2 rounded-full px-4 py-2 ${
                  isActive
                    ? "bg-green-700"
                    : "bg-white border border-gray-200"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    isActive ? "text-white" : "text-gray-700"
                  }`}
                >
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Posts */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={COLORS.gray[400]}
          />
          <Text className="mt-4 text-lg font-semibold text-gray-700">
            Something went wrong
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-400">
            {error}
          </Text>
          <Pressable
            onPress={fetchPosts}
            className="mt-4 px-6 py-3 rounded-xl"
            style={{ backgroundColor: COLORS.primary }}
          >
            <Text className="text-white font-semibold">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="newspaper-outline"
              title="No posts yet"
              subtitle="Be the first to share something with the community"
            />
          }
        />
      )}

      {/* FAB — Create Post */}
      <Pressable
        onPress={() => setShowCreateModal(true)}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full"
        style={{
          backgroundColor: COLORS.primary,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Ionicons name="create" size={24} color="white" />
      </Pressable>

      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-white"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200">
            <Pressable onPress={() => setShowCreateModal(false)}>
              <Text className="text-gray-600 text-base">Cancel</Text>
            </Pressable>
            <Text className="text-base font-bold text-gray-900">
              New Post
            </Text>
            <Pressable
              onPress={handleCreatePost}
              disabled={posting || !newPostText.trim()}
            >
              {posting ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text
                  className={`text-base font-semibold ${
                    newPostText.trim() ? "text-green-700" : "text-gray-400"
                  }`}
                >
                  Post
                </Text>
              )}
            </Pressable>
          </View>

          {/* Body */}
          <View className="flex-1 p-5">
            <TextInput
              value={newPostText}
              onChangeText={setNewPostText}
              placeholder="What's on your mind?"
              placeholderTextColor={COLORS.gray[400]}
              multiline
              textAlignVertical="top"
              className="flex-1 text-base text-gray-900"
              autoFocus
            />

            {/* Attached Image Preview */}
            {newPostImage && (
              <View className="mt-3 relative">
                <Image
                  source={{ uri: newPostImage }}
                  className="w-full h-48 rounded-xl"
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => setNewPostImage(null)}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 items-center justify-center"
                >
                  <Ionicons name="close" size={16} color="white" />
                </Pressable>
              </View>
            )}
          </View>

          {/* Bottom Tools */}
          <View className="flex-row items-center px-5 py-3 border-t border-gray-200">
            <Pressable onPress={pickImage} className="flex-row items-center">
              <Ionicons name="image-outline" size={24} color={COLORS.primary} />
              <Text className="text-sm text-green-700 ml-2 font-medium">
                Photo
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={!!commentModalPost}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCommentModalPost(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1 bg-white"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-200">
            <Text className="text-base font-bold text-gray-900">Comments</Text>
            <Pressable onPress={() => setCommentModalPost(null)}>
              <Ionicons name="close" size={24} color={COLORS.gray[600]} />
            </Pressable>
          </View>

          {/* Comments List */}
          {loadingComments ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                padding: 16,
                paddingBottom: 20,
                flexGrow: 1,
              }}
              renderItem={({ item }) => (
                <View className="flex-row mb-4">
                  <View className="h-8 w-8 rounded-full bg-gray-200 items-center justify-center">
                    {item.author.avatar_url ? (
                      <Image
                        source={{ uri: item.author.avatar_url }}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <Ionicons
                        name="person"
                        size={14}
                        color={COLORS.gray[500]}
                      />
                    )}
                  </View>
                  <View className="ml-3 flex-1 bg-gray-50 rounded-xl px-3 py-2">
                    <View className="flex-row items-center">
                      <Text className="text-xs font-semibold text-gray-900">
                        {item.author.display_name}
                      </Text>
                      <Text className="text-xs text-gray-400 ml-2">
                        {formatRelativeTime(item.created_at)}
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-700 mt-1">
                      {item.text}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View className="flex-1 items-center justify-center py-12">
                  <Ionicons
                    name="chatbubble-outline"
                    size={40}
                    color={COLORS.gray[300]}
                  />
                  <Text className="text-sm text-gray-400 mt-3">
                    No comments yet. Be the first!
                  </Text>
                </View>
              }
            />
          )}

          {/* Comment Input */}
          <View className="flex-row items-center px-4 py-3 border-t border-gray-200">
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment..."
              placeholderTextColor={COLORS.gray[400]}
              className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm text-gray-900 mr-3"
            />
            <Pressable
              onPress={handleSendComment}
              disabled={sendingComment || !commentText.trim()}
            >
              {sendingComment ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons
                  name="send"
                  size={22}
                  color={
                    commentText.trim() ? COLORS.primary : COLORS.gray[400]
                  }
                />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
