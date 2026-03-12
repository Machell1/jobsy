import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";

import { useAuthStore } from "@/stores/auth";
import type { UserRole } from "@/api/auth";

WebBrowser.maybeCompleteAuthSession();

interface OAuthButtonsProps {
  role?: UserRole;
}

export function OAuthButtons({ role = "user" }: OAuthButtonsProps) {
  const oauthLogin = useAuthStore((s) => s.oauthLogin);
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);

  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success" && response.params.id_token) {
      handleOAuth("google", response.params.id_token);
    }
  }, [response]);

  async function handleOAuth(provider: "google" | "apple", idToken: string) {
    setLoading(provider);
    try {
      await oauthLogin(provider, idToken, role);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Sign in failed. Please try again.";
      Alert.alert("Sign In Failed", message);
    } finally {
      setLoading(null);
    }
  }

  async function handleAppleSignIn() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      if (credential.identityToken) {
        await handleOAuth("apple", credential.identityToken);
      }
    } catch (e: unknown) {
      if ((e as { code?: string })?.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Apple Sign In Failed", "Please try again.");
      }
    }
  }

  return (
    <View className="mt-6">
      {/* Divider */}
      <View className="mb-5 flex-row items-center">
        <View className="h-px flex-1 bg-dark-200" />
        <Text className="mx-4 text-sm text-dark-400">or continue with</Text>
        <View className="h-px flex-1 bg-dark-200" />
      </View>

      {/* Google button */}
      <Pressable
        onPress={() => promptAsync()}
        disabled={loading !== null}
        className={`mb-3 flex-row items-center justify-center rounded-xl border border-dark-200 py-3.5 ${
          loading === "google" ? "bg-dark-100" : "bg-white"
        }`}
      >
        <Ionicons name="logo-google" size={20} color="#DB4437" />
        <Text className="ml-3 text-base font-semibold text-dark-700">
          {loading === "google" ? "Signing in..." : "Continue with Google"}
        </Text>
      </Pressable>

      {/* Apple button -- iOS only */}
      {Platform.OS === "ios" && (
        <Pressable
          onPress={handleAppleSignIn}
          disabled={loading !== null}
          className={`flex-row items-center justify-center rounded-xl py-3.5 ${
            loading === "apple" ? "bg-dark-700" : "bg-black"
          }`}
        >
          <Ionicons name="logo-apple" size={22} color="white" />
          <Text className="ml-3 text-base font-semibold text-white">
            {loading === "apple" ? "Signing in..." : "Continue with Apple"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
