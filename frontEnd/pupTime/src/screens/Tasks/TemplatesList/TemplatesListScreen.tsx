import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { createStyles } from "./TemplatesList.styles";
import { useNavigation } from "@react-navigation/native";
import useTheme from "../../../Hooks/useTheme";
import { useTasks } from "../../../Hooks/useTasks";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/store";
import { BottomBar } from "../../../components/BottomBar/BottomBar";
import { getTemplates } from "../../../services/TaskService/syncService";
import { TaskTemplate } from "../../../DB";

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
  none: "#9CA3AF",
};

type PriorityFilter = "all" | "high" | "medium" | "low";

const FREQ_LABELS: Record<string, string> = {
  DAILY: "📆 Daily",
  WEEKLY: "📅 Weekly",
  MONTHLY: "🗓️ Monthly",
  YEARLY: "🎂 Yearly",
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const parseFrequency = (rrule?: string | null): string => {
  if (!rrule) return "1️⃣ Once";
  const match = rrule.match(/FREQ=(\w+)/);
  if (!match) return "1️⃣ Once";
  return FREQ_LABELS[match[1]] ?? match[1];
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

const TemplatesListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const user = useSelector((state: RootState) => state.user.data);
  const userId = user?.id;
  const { remove } = useTasks(userId as number);

  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = async () => {
    if(userId) {
      setLoading(true);
      const { data } = await getTemplates({
        user_id: userId,
        ordering: '-created_at'
      });
      setTasks(data);
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchTemplates();
    });
    fetchTemplates();
    return unsubscribe;
  }, [userId]);

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  /* ── Filter templates (exclude deleted) ──────── */
  const templates = useMemo(() => {
    let filtered = tasks.filter((t) => !t.is_deleted);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.emoji?.includes(q)
      );
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((t) => t.priority === priorityFilter);
    }

    return filtered;
  }, [tasks, searchQuery, priorityFilter]);

  /* ── Counts ──────────────────────────────────── */
  const allTemplates = useMemo(() => tasks.filter((t) => !t.is_deleted), [tasks]);
  const highCount = useMemo(() => allTemplates.filter((t) => t.priority === "high").length, [allTemplates]);
  const mediumCount = useMemo(() => allTemplates.filter((t) => t.priority === "medium").length, [allTemplates]);
  const lowCount = useMemo(() => allTemplates.filter((t) => t.priority === "low").length, [allTemplates]);

  /* ── Delete handler ──────────────────────────── */
  const handleDelete = useCallback(
    (id: string, title?: string | null) => {
      Alert.alert(
        "Delete Template",
        `Are you sure you want to delete "${title ?? "this template"}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await remove(id);
              setTasks((prv) => prv.filter((t) => t.id !== id));
            },
          },
        ]
      );
    },
    [remove]
  );

  /* ── Render helpers ──────────────────────────── */
  const renderRightActions = (id: string, title?: string | null) => (
    <Pressable style={styles.deleteBox} onPress={() => handleDelete(id, title)}>
      <Text style={styles.deleteBoxIcon}>🗑️</Text>
      <Text style={styles.deleteBoxText}>Delete</Text>
    </Pressable>
  );

  const renderTemplate = ({ item }: { item: TaskTemplate }) => {
    const priorityColor = PRIORITY_COLORS[item.priority ?? "none"] ?? PRIORITY_COLORS.none;
    const freq = parseFrequency(item.rrule);

    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id, item.title)}>
        <Pressable
          style={[styles.templateCard, { borderLeftColor: priorityColor }]}
          onPress={() => navigation.navigate("TemplateDetails", { templateId: item.id })}
        >
          <Text style={styles.templateEmoji}>{item.emoji || "📌"}</Text>
          <View style={styles.templateContent}>
            <Text style={styles.templateTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.templateMeta}>
              {(item.priority ?? "none").charAt(0).toUpperCase() +
                (item.priority ?? "none").slice(1)}{" "}
              priority • {item.duration_minutes ? `${item.duration_minutes} min` : "No duration"}
            </Text>
            <Text style={styles.templateSchedule}>{freq}</Text>
          </View>

          <View style={styles.quickActionsRow}>
            <Pressable
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate("EditTask", { taskId: item.id })}
            >
              <Text style={styles.quickActionText}>✏️</Text>
            </Pressable>
          </View>
        </Pressable>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ========== HERO ========== */}
      <View style={styles.heroContainer}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroTitle}>Templates</Text>
            <Text style={styles.heroSubtitle}>
              Manage your task templates
            </Text>
          </View>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{allTemplates.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{highCount}</Text>
            <Text style={styles.statLabel}>High</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{mediumCount}</Text>
            <Text style={styles.statLabel}>Medium</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{lowCount}</Text>
            <Text style={styles.statLabel}>Low</Text>
          </View>
        </View>
      </View>

      {/* ========== SEARCH BAR ========== */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search templates..."
            placeholderTextColor={colors.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable style={styles.searchClear} onPress={() => setSearchQuery("")}>
              <Text style={styles.searchClearText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ========== FILTER CHIPS ========== */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {(
              [
                { key: "all", label: `All (${allTemplates.length})` },
                { key: "high", label: `🔴 High (${highCount})` },
                { key: "medium", label: `🟠 Medium (${mediumCount})` },
                { key: "low", label: `🟢 Low (${lowCount})` },
              ] as const
            ).map((f) => {
              const active = priorityFilter === f.key;
              return (
                <Pressable
                  key={f.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setPriorityFilter(f.key as PriorityFilter)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ========== SECTION HEADER ========== */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {priorityFilter === "all" ? "All Templates" : `${priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)} Priority`}
          </Text>
          <Text style={styles.sectionCount}>
            {templates.length} template{templates.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* ========== TEMPLATE LIST ========== */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplate}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 160,
            ...(templates.length === 0 && {
              flexGrow: 1,
              justifyContent: "center" as const,
            }),
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>
                {searchQuery ? "No templates found" : "No templates yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? "Try a different search term."
                  : "Create your first task template to get started!"}
              </Text>
            </View>
          }
        />
      )}

      {/* ========== FAB — Add Template ========== */}
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate("AddTask")}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* ========== BOTTOM BAR ========== */}
      <BottomBar current="Tasks" navigation={navigation} />
    </SafeAreaView>
  );
};

export default TemplatesListScreen;
