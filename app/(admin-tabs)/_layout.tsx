import { AntDesign, Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ChatProvider, useChatContext } from "../../contexts/ChatContext";

function AdminTabsContent() {
  const { isInChatView } = useChatContext();
  
  return (
    <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#4facfe",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
            height: 65,
            paddingBottom: 10,
            paddingTop: 8,
            display: isInChatView ? 'none' : 'flex',
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: 2,
          },
          tabBarIconStyle: {
            marginBottom: 2,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size = 22 }) => (
              <AntDesign name="dashboard" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="jobs"
          options={{
            title: "Jobs",
            tabBarIcon: ({ color, size = 22 }) => (
              <Feather name="map" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="messaging"
          options={{
            title: "Messages",
            tabBarIcon: ({ color, size = 22 }) => (
              <AntDesign name="message1" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="employees"
          options={{
            title: "Team",
            tabBarIcon: ({ color, size = 22 }) => (
              <AntDesign name="team" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="news"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="components/BulkToolbar"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="components/ConversationList"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="components/EmployeeRoster"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="components/JobDetailsPanel"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="components/LiveMap"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="employee-allocation/[jobId]"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="hooks/useLiveOpsListeners"
          options={{
            href: null,
          }}
        />
      </Tabs>
  );
}

export default function AdminTabsLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ChatProvider>
        <AdminTabsContent />
      </ChatProvider>
    </GestureHandlerRootView>
  );
}