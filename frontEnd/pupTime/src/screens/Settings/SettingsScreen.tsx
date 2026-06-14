import React, { useMemo, useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View, Text, Pressable } from "react-native";
import { DrawerActions } from "@react-navigation/native";
import { Menu } from "lucide-react-native";
import createStyles from "./SettingsScreen.styles";
import useTheme from "../../Hooks/useTheme";
import SettingsSection from "../../components/Settings/SettingsSection";
import SettingsNavItem from "../../components/Settings/SettingsNavItem";
import SettingsSwitchItem from "../../components/Settings/SettingsSwitchItem";
import SettingsSelectItem from "../../components/Settings/SettingsSelectItem";
import LogoutButton from "../../components/Settings/LogoutButton";
import DeleteAccountButton from "../../components/Settings/DeleteAccountButton";
import ColorSelectionModal from "../../components/Settings/ColorSelectionModal";
import FontSizeSelectionModal from "../../components/Settings/FontSizeSelectionModal";
import createSettingsStyles from "../../components/Settings/Settings.styles";
import SyncProgressModal from "../../components/Settings/SyncProgressModal";
import syncService from "../../services/TaskService/syncService";
import { AppMetaRepository } from "../../DB";
import { Alert } from "react-native";

export type UserSettings = {
  notifications: {
    enabled: boolean;
    reminderMinutes: 5 | 10 | 30;
    sound: boolean;
    vibration: boolean;
  };
  tasks: {
    defaultPriority: "low" | "medium" | "high";
    autoCompleteExpired: boolean;
    showCompleted: boolean;
    sortBy: "time" | "priority" | "status";
  };
  appearance: {
    darkMode: boolean;
    fontSize: "small" | "medium" | "large";
  };
  productivity: {
    focusMode: boolean;
    dailyGoal: number;
    weeklySummary: boolean;
  };
};

const initialSettings: UserSettings = {
  notifications: {
    enabled: true,
    reminderMinutes: 10,
    sound: true,
    vibration: true,
  },
  tasks: {
    defaultPriority: "medium",
    autoCompleteExpired: false,
    showCompleted: true,
    sortBy: "time",
  },
  appearance: {
    darkMode: false,
    fontSize: "medium",
  },
  productivity: {
    focusMode: false,
    dailyGoal: 3,
    weeklySummary: true,
  },
};

const reminderOptions = ["5 min", "10 min", "30 min"] as const;
const fontSizeOptions = ["Small", "Medium", "Large"] as const;
const priorityOptions = ["Low", "Medium", "High"] as const;
const sortByOptions = ["Time", "Priority", "Status"] as const;
const dailyGoalOptions = ["1", "3", "5", "10"] as const;

const SettingsScreen = ({ navigation }: { navigation: any }) => {
  const { colors, themeMode, colorScheme, fontSize, theme, setThemeMode, setColorScheme, setFontSize } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const itemStyles = useMemo(() => createSettingsStyles(colors), [colors]);

  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [fontSizeModalVisible, setFontSizeModalVisible] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSyncing) {
      setSyncProgress(0);
      interval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.floor(Math.random() * 15) + 5;
        });
      }, 500);
    } else {
      setSyncProgress(100);
    }
    return () => clearInterval(interval);
  }, [isSyncing]);

  useEffect(() => {
    const fetchLastSync = async () => {
      const meta = await AppMetaRepository.get('lastSyncDate');
      if (meta?.value) {
        setLastSyncDate(meta.value);
      }
    };
    fetchLastSync();
  }, []);

  const handleSyncData = async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      await syncService.fullSync();
      const meta = await AppMetaRepository.get('lastSyncDate');
      if (meta?.value) {
        setLastSyncDate(meta.value);
      }
      Alert.alert("Success", "Data synced successfully.");
    } catch (e) {
      Alert.alert("Error", "Failed to sync data.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResyncData = async () => {
    if (isSyncing) return;
    Alert.alert(
      "Resync Data",
      "This will reset your sync state and pull all data from the server. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Resync", 
          style: "destructive",
          onPress: async () => {
            try {
              setIsSyncing(true);
              await syncService.resetSyncState();
              await syncService.fullSync();
              const meta = await AppMetaRepository.get('lastSyncDate');
              if (meta?.value) {
                setLastSyncDate(meta.value);
              } else {
                setLastSyncDate(null);
              }
              Alert.alert("Success", "Data resynced successfully.");
            } catch (e) {
              Alert.alert("Error", "Failed to resync data.");
            } finally {
              setIsSyncing(false);
            }
          }
        }
      ]
    );
  };

  const colorSchemeOptions = [
    "Emerald Green",
    "Ocean Blue",
    "Royal Purple",
    "Sunset Orange",
    "Pink Rose",
  ];

  const colorSchemeMap: Record<string, string> = {
    emerald: "Emerald Green",
    ocean: "Ocean Blue",
    royal: "Royal Purple",
    sunset: "Sunset Orange",
    rose: "Pink Rose",
  };

  const colorSchemeLabel = colorSchemeMap[colorScheme] || "Emerald Green";

  const handleSelectColorScheme = (value: string) => {
    const optionMap: Record<string, any> = {
      "Emerald Green": "emerald",
      "Ocean Blue": "ocean",
      "Royal Purple": "royal",
      "Sunset Orange": "sunset",
      "Pink Rose": "rose",
    };
    const key = optionMap[value];
    if (key) {
      setColorScheme(key);
    }
  };

  const handleToggleNotification = (key: keyof UserSettings["notifications"], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  const handleToggleTasks = (key: keyof UserSettings["tasks"], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [key]: value,
      },
    }));
  };

  const handleToggleAppearance = (key: keyof UserSettings["appearance"], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [key]: value,
      },
    }));
  };

  const handleToggleProductivity = (key: keyof UserSettings["productivity"], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      productivity: {
        ...prev.productivity,
        [key]: value,
      },
    }));
  };

  const handleSelectReminder = (value: string) => {
    const minutes = parseInt(value, 10) as 5 | 10 | 30;
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        reminderMinutes: minutes,
      },
    }));
  };

  const handleSelectPriority = (value: string) => {
    const normalized = value.toLowerCase() as "low" | "medium" | "high";
    setSettings(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        defaultPriority: normalized,
      },
    }));
  };

  const handleSelectSortBy = (value: string) => {
    const normalized = value.toLowerCase() as "time" | "priority" | "status";
    setSettings(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        sortBy: normalized,
      },
    }));
  };

  const handleSelectDailyGoal = (value: string) => {
    const goal = parseInt(value, 10) || 1;
    setSettings(prev => ({
      ...prev,
      productivity: {
        ...prev.productivity,
        dailyGoal: goal,
      },
    }));
  };

  const reminderLabel = `${settings.notifications.reminderMinutes} min`;
  const fontSizeLabel =
    fontSize.charAt(0).toUpperCase() +
    fontSize.slice(1);
  const priorityLabel =
    settings.tasks.defaultPriority.charAt(0).toUpperCase() +
    settings.tasks.defaultPriority.slice(1);
  const sortByLabel =
    settings.tasks.sortBy.charAt(0).toUpperCase() + settings.tasks.sortBy.slice(1);
  const dailyGoalLabel = String(settings.productivity.dailyGoal);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginRight: 12 }}>
                <Menu color={colors.primary} size={28} strokeWidth={2.5} />
              </Pressable>
              <Text style={[styles.headerTitle, { marginBottom: 0 }]}>Settings</Text>
            </View>
            <Text style={styles.headerSubtitle}>Customize your PupTime experience</Text>
          </View>

          {/* 1. Account */}
          <SettingsSection title="Account">
            <SettingsNavItem
              label="Edit Profile"
              icon="👤"
              onPress={() => navigation.navigate("EditProfile")}
              isFirst
            />
          </SettingsSection>

          {/* 2. Friends */}
          <SettingsSection title="Friends">
            <SettingsNavItem
              label="Friends List"
              icon="👥"
              onPress={() => navigation.navigate("Friends")}
              isFirst
            />
            <SettingsNavItem
              label="Add Friend"
              icon="➕"
              onPress={() => navigation.navigate("AddFriend")}
            />
            <SettingsNavItem
              label="Blocked List"
              icon="🚫"
              onPress={() => navigation.navigate("BlockedFriends")}
            />
          </SettingsSection>



          {/* 5. Notifications */}
          <SettingsSection title="Notifications">
            <SettingsNavItem
              label="Notification Inbox"
              icon="🔔"
              onPress={() => navigation.navigate("Notifications")}
              isFirst
            />
            {/* <SettingsSwitchItem
              label="Enable Notifications"
              value={settings.notifications.enabled}
              onToggle={value => handleToggleNotification("enabled", value)}
            />
            <SettingsSelectItem
              label="Reminder Time"
              selectedValue={reminderLabel}
              options={[...reminderOptions]}
              onSelect={handleSelectReminder}
            />
            <SettingsSwitchItem
              label="Sound"
              value={settings.notifications.sound}
              onToggle={value => handleToggleNotification("sound", value)}
            />
            <SettingsSwitchItem
              label="Vibration"
              value={settings.notifications.vibration}
              onToggle={value => handleToggleNotification("vibration", value)}
            /> */}
          </SettingsSection>

          {/* 6. Task Preferences */}
          {/* <SettingsSection title="Task Preferences">
            <SettingsSelectItem
              label="Default Priority"
              selectedValue={priorityLabel}
              options={[...priorityOptions]}
              onSelect={handleSelectPriority}
              isFirst
            />
            <SettingsSwitchItem
              label="Auto-complete expired tasks"
              value={settings.tasks.autoCompleteExpired}
              onToggle={value => handleToggleTasks("autoCompleteExpired", value)}
            />
            <SettingsSwitchItem
              label="Show completed tasks"
              value={settings.tasks.showCompleted}
              onToggle={value => handleToggleTasks("showCompleted", value)}
            />
            <SettingsSelectItem
              label="Sort Tasks By"
              selectedValue={sortByLabel}
              options={[...sortByOptions]}
              onSelect={handleSelectSortBy}
            />
          </SettingsSection> */}

          {/* 7. Appearance */}
          <SettingsSection title="Appearance">
            <SettingsSwitchItem
              label="Dark Mode"
              value={themeMode === "dark"}
              onToggle={value => setThemeMode(value ? "dark" : "light")}
              isFirst
            />
            <Pressable
              onPress={() => setColorModalVisible(true)}
              style={({ pressed }) => [
                itemStyles.itemRow,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={itemStyles.itemLeft}>
                <Text style={itemStyles.itemLabel}>Color Scheme</Text>
              </View>
              <View style={itemStyles.itemValueContainer}>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: colors.primary,
                    marginRight: 8,
                  }}
                />
                <Text style={itemStyles.itemValue}>{colorSchemeLabel}</Text>
                <Text style={itemStyles.selectChevron}>{"▾"}</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => setFontSizeModalVisible(true)}
              style={({ pressed }) => [
                itemStyles.itemRow,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={itemStyles.itemLeft}>
                <Text style={itemStyles.itemLabel}>Font Size</Text>
              </View>
              <View style={itemStyles.itemValueContainer}>
                <Text style={itemStyles.itemValue}>{fontSizeLabel}</Text>
                <Text style={itemStyles.selectChevron}>{"▾"}</Text>
              </View>
            </Pressable>
          </SettingsSection>

          {/* 8. Productivity Mode */}
          {/* <SettingsSection title="Productivity Mode">
            <SettingsSwitchItem
              label="Focus Mode (Disable distractions)"
              value={settings.productivity.focusMode}
              onToggle={value => handleToggleProductivity("focusMode", value)}
              isFirst
            />
            <SettingsSelectItem
              label="Daily Goal Counter"
              selectedValue={dailyGoalLabel}
              options={[...dailyGoalOptions]}
              onSelect={handleSelectDailyGoal}
            />
            <SettingsSwitchItem
              label="Weekly Progress Summary"
              value={settings.productivity.weeklySummary}
              onToggle={value => handleToggleProductivity("weeklySummary", value)}
            />
          </SettingsSection> */}



          {/* 9. Sync */}
          <SettingsSection title="Sync Data">
            <SettingsNavItem
              label={isSyncing ? "Syncing..." : "Sync All Data"}
              icon="🔄"
              onPress={handleSyncData}
              isFirst
            />
            <SettingsNavItem
              label="Resync Data"
              icon="⚠️"
              onPress={handleResyncData}
            />
            <View style={[itemStyles.itemRow, { paddingVertical: 12 }]}>
              <View style={itemStyles.itemLeft}>
                <Text style={itemStyles.itemIcon}>🕒</Text>
                <Text style={itemStyles.itemLabel}>Last Sync</Text>
              </View>
              <View style={itemStyles.itemValueContainer}>
                <Text style={itemStyles.itemValue}>
                  {lastSyncDate ? new Date(lastSyncDate).toLocaleString() : 'Never'}
                </Text>
              </View>
            </View>
          </SettingsSection>

          {/* 10. About */}
          <SettingsSection title="About">
            <SettingsNavItem
              label="App Version 1.0.0"
              icon="ℹ️"
              onPress={() => {}}
              isFirst
            />
          </SettingsSection>

          {/* 11. Logout */}
          <LogoutButton />
          <DeleteAccountButton />
        </ScrollView>
        <ColorSelectionModal
          visible={colorModalVisible}
          onClose={() => setColorModalVisible(false)}
          currentScheme={colorScheme}
          onSelectScheme={setColorScheme}
          colors={colors}
          isDark={theme === "dark"}
        />
        <FontSizeSelectionModal
          visible={fontSizeModalVisible}
          onClose={() => setFontSizeModalVisible(false)}
          currentSize={fontSize}
          onSelectSize={setFontSize}
          colors={colors}
        />
        <SyncProgressModal 
          visible={isSyncing} 
          progress={syncProgress} 
          colors={colors} 
        />
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;
