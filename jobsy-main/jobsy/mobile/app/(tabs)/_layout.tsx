import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/constants/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray[400],
        tabBarStyle: {
          borderTopColor: COLORS.gray[200],
          backgroundColor: "#FFFFFF",
          height: 85,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerTitleStyle: {
          fontWeight: "bold",
          color: COLORS.black,
        },
      }}
    >
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          headerTitle: "Job Board",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          headerTitle: "Jobsy",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="albums" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matches",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          headerTitle: "Pan di Ends",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden routes (accessible but not in tab bar) */}
      <Tabs.Screen name="listing" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="payments" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="reviews" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen
        name="verify"
        options={{
          href: null,
          headerTitle: "Verify Account",
          headerTitleStyle: { fontWeight: "bold", color: COLORS.black },
        }}
      />
      <Tabs.Screen
        name="home"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="disputes"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="settings"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="advertiser"
        options={{ href: null, headerShown: false }}
      />
      <Tabs.Screen
        name="noticeboard"
        options={{
          href: null,
          headerTitle: "Noticeboard",
          headerTitleStyle: { fontWeight: "bold", color: COLORS.black },
        }}
      />
      <Tabs.Screen
        name="business"
        options={{
          href: null,
          headerTitle: "Business Profile",
          headerTitleStyle: { fontWeight: "bold", color: COLORS.black },
        }}
      />
      <Tabs.Screen
        name="referrals"
        options={{
          href: null,
          headerTitle: "Referrals",
          headerTitleStyle: { fontWeight: "bold", color: COLORS.black },
        }}
      />
      <Tabs.Screen
        name="legal"
        options={{
          href: null,
          headerTitle: "Legal & Info",
          headerTitleStyle: { fontWeight: "bold", color: COLORS.black },
        }}
      />
    </Tabs>
  );
}
