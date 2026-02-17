import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, View, Text } from "react-native";
import createStyles from "./SettingsScreen.styles";
import useTheme from "../../Hooks/useTheme";
import SettingsSection from "../../components/Settings/SettingsSection";
import SettingsNavItem from "../../components/Settings/SettingsNavItem";
import SettingsSwitchItem from "../../components/Settings/SettingsSwitchItem";
import SettingsSelectItem from "../../components/Settings/SettingsSelectItem";
import LogoutButton from "../../components/Settings/LogoutButton";

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [settings, setSettings] = useState<UserSettings>(initialSettings);

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

  const handleSelectFontSize = (value: string) => {
    const normalized = value.toLowerCase() as "small" | "medium" | "large";
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        fontSize: normalized,
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
    settings.appearance.fontSize.charAt(0).toUpperCase() +
    settings.appearance.fontSize.slice(1);
  const priorityLabel =
    settings.tasks.defaultPriority.charAt(0).toUpperCase() +
    settings.tasks.defaultPriority.slice(1);
  const sortByLabel =
    settings.tasks.sortBy.charAt(0).toUpperCase() + settings.tasks.sortBy.slice(1);
  const dailyGoalLabel = String(settings.productivity.dailyGoal);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
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
            <SettingsNavItem
              label="Change Password"
              icon="🔒"
              onPress={() => console.log("Navigate to ChangePasswordScreen")}
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

          {/* 3. History */}
          <SettingsSection title="History">
            <SettingsNavItem
              label="Tasks History"
              icon="🗂"
              onPress={() => console.log("Navigate to HistoryTasksScreen")}
              isFirst
            />
            <SettingsNavItem
              label="Social Events"
              icon="🎉"
              onPress={() => console.log("Navigate to SocialHistoryScreen")}
            />
          </SettingsSection>

          {/* 4. FreeTime */}
          <SettingsSection title="FreeTime">
            <SettingsNavItem
              label="FreeTime List"
              icon="⏱"
              onPress={() => console.log("Navigate to FreeTimeScreen")}
              isFirst
            />
            <SettingsNavItem
              label="Habits"
              icon="📈"
              onPress={() => console.log("Navigate to HabitsScreen")}
            />
            <SettingsNavItem
              label="Applied Recommendations"
              icon="✨"
              onPress={() => console.log("Navigate to RecommendationsScreen")}
            />
          </SettingsSection>

          {/* 5. Notifications */}
          <SettingsSection title="Notifications">
            <SettingsSwitchItem
              label="Enable Notifications"
              value={settings.notifications.enabled}
              onToggle={value => handleToggleNotification("enabled", value)}
              isFirst
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
            />
          </SettingsSection>

          {/* 6. Task Preferences */}
          <SettingsSection title="Task Preferences">
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
          </SettingsSection>

          {/* 7. Appearance */}
          <SettingsSection title="Appearance">
            <SettingsSwitchItem
              label="Dark Mode"
              value={settings.appearance.darkMode}
              onToggle={value => handleToggleAppearance("darkMode", value)}
              isFirst
            />
            <SettingsSelectItem
              label="Font Size"
              selectedValue={fontSizeLabel}
              options={[...fontSizeOptions]}
              onSelect={handleSelectFontSize}
            />
          </SettingsSection>

          {/* 8. Productivity Mode */}
          <SettingsSection title="Productivity Mode">
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
          </SettingsSection>

          {/* 9. Support */}
          <SettingsSection title="Support">
            <SettingsNavItem
              label="Make a Report"
              icon="📝"
              onPress={() => console.log("Navigate to ReportScreen")}
              isFirst
            />
            <SettingsNavItem
              label="Help / FAQ"
              icon="❓"
              onPress={() => console.log("Navigate to HelpScreen")}
            />
          </SettingsSection>

          {/* 10. About */}
          <SettingsSection title="About">
            <SettingsNavItem
              label="App Version 1.0.0"
              icon="ℹ️"
              onPress={() => {}}
              isFirst
            />
            <SettingsNavItem
              label="Terms & Privacy"
              icon="📃"
              onPress={() => console.log("Navigate to TermsPrivacyScreen")}
            />
          </SettingsSection>

          {/* 11. Logout */}
          <LogoutButton />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;
