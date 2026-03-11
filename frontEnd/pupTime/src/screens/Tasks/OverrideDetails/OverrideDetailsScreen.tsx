import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { createStyles } from "./OverrideDetails.styles";
import useTheme from "../../../Hooks/useTheme";
import { useTasks } from "../../../Hooks/useTasks";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/store";
import type { TaskOverride, status } from "../../../types/task";

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "#22C55E",
  SKIPPED: "#9CA3AF",
  RESCHEDULED: "#8B5CF6",
  PENDING: "#F59E0B",
  FAILED: "#EF4444",
};


const STATUS_EMOJIS: Record<string, string> = {
  PENDING: "⏳",
  COMPLETED: "✅",
  SKIPPED: "⏭️",
  FAILED: "❌",
  RESCHEDULED: "🔄",
};

const ALL_STATUSES: status[] = [
  "PENDING",
  "COMPLETED",
  "SKIPPED",
  "FAILED",
  "RESCHEDULED",
];

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

type Props = { route?: any; navigation?: any };

const OverrideDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const user = useSelector((state: RootState) => state.user.data);
  const { tasks, changeOverride } = useTasks(user?.id!);

  const templateId: string | undefined = route?.params?.templateId;
  const overrideId: string | undefined = route?.params?.overrideId;

  /* ── Find the override ──────────────────────── */
  const template = useMemo(
    () => tasks.find((t) => t.id === templateId),
    [tasks, templateId]
  );

  const override = useMemo(() => {
    if (!template) return undefined;
    return template.overrides?.find((o) => o.id === overrideId);
  }, [template, overrideId]);

  /* ── State ──────────────────────────────────── */
  const [selectedStatus, setSelectedStatus] = useState<status | null>(null);
  const [newDatetime, setNewDatetime] = useState<string>(
    new Date().toISOString()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize selected status from override
  const currentStatus = override?.status as status | undefined;

  /**
   * Is the override "locked"?
   * Per the spec: if status is RESCHEDULED, it becomes locked
   * and cannot be changed again.
   */
  const isLocked = currentStatus === "RESCHEDULED";

  /* ── Status selection ──────────────────────── */
  const handleStatusSelect = useCallback(
    (status: status) => {
      if (isLocked) return;
      setSelectedStatus(status);
    },
    [isLocked]
  );

  /* ── Date picker handlers ──────────────────── */
  const onDateChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowDatePicker(false);
    if (_e.type === "dismissed" || !d) return;
    const u = new Date(newDatetime);
    u.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setNewDatetime(u.toISOString());
  };

  const onTimeChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowTimePicker(false);
    if (_e.type === "dismissed" || !d) return;
    const u = new Date(newDatetime);
    u.setHours(d.getHours(), d.getMinutes(), 0, 0);
    setNewDatetime(u.toISOString());
  };

  /* ── Save handler ──────────────────────────── */
  const handleSave = useCallback(async () => {
    if (!override || !selectedStatus || !templateId) return;

    // Validation: RESCHEDULED requires new_datetime
    if (selectedStatus === "RESCHEDULED" && !newDatetime) {
      Alert.alert(
        "Missing Date",
        "Please select a new date/time for the rescheduled task."
      );
      return;
    }

    // Confirm RESCHEDULED since it's irreversible
    if (selectedStatus === "RESCHEDULED") {
      Alert.alert(
        "Reschedule Task",
        "Once rescheduled, this task will be locked and cannot be changed again. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reschedule",
            style: "default",
            onPress: async () => {
              setSaving(true);
              try {
                await changeOverride(templateId, override.id, {
                  status: "RESCHEDULED",
                  new_datetime: newDatetime,
                });
                navigation.goBack();
              } catch (err) {
                console.error("[OverrideDetails] save failed", err);
                Alert.alert("Error", "Failed to update status.");
              } finally {
                setSaving(false);
              }
            },
          },
        ]
      );
      return;
    }

    // For all other statuses
    setSaving(true);
    try {
      await changeOverride(templateId, override.id, {
        status: selectedStatus,
      });
      // Reset selected status so the UI reflects the new current status
      setSelectedStatus(null);
    } catch (err) {
      console.error("[OverrideDetails] save failed", err);
      Alert.alert("Error", "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }, [
    override,
    selectedStatus,
    templateId,
    newDatetime,
    changeOverride,
    navigation,
  ]);

  /* ── Loading state ──────────────────────────── */
  if (!override || !template) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.heroContainer}>
          <View style={styles.heroTopRow}>
            <Pressable
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backBtnText}>←</Text>
            </Pressable>
            <Text style={styles.heroTitle}>Task Details</Text>
          </View>
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading task…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor =
    STATUS_COLORS[currentStatus ?? "PENDING"] ?? STATUS_COLORS.PENDING;

  const displayDate = new Date(newDatetime);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Hero ────────────────────────────── */}
      <View style={styles.heroContainer}>
        <View style={styles.heroTopRow}>
          <Pressable
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Task Details</Text>
            <Text style={styles.heroSubtitle}>
              {template.emoji || "📌"} {template.title}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Current Status Banner ────────── */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBannerText}>
            {STATUS_EMOJIS[currentStatus ?? "PENDING"]}{" "}
            {currentStatus ?? "PENDING"}
          </Text>
          {isLocked && (
            <Text style={styles.statusBannerLock}>🔒 Locked</Text>
          )}
        </View>

        {/* ── Locked Banner ──────────────── */}
        {isLocked && (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedBannerIcon}>🔒</Text>
            <Text style={styles.lockedBannerText}>
              This task has been rescheduled and is now locked. The status
              cannot be changed again.
            </Text>
          </View>
        )}


        {/* ── Override Info ──────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📋</Text>
            <Text style={styles.sectionLabel}>Task Information</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailLabel}>Scheduled</Text>
            <Text style={styles.detailValue}>
              {formatDateTime(override.instance_datetime)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📊</Text>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={[styles.detailValue, { color: statusColor }]}>
              {currentStatus ?? "PENDING"}
            </Text>
          </View>

          {override.new_datetime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🔄</Text>
              <Text style={styles.detailLabel}>New Date</Text>
              <Text style={styles.detailValue}>
                {formatDateTime(override.new_datetime)}
              </Text>
            </View>
          )}

          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={styles.detailIcon}>🔄</Text>
            <Text style={styles.detailLabel}>Updated</Text>
            <Text style={styles.detailValue}>
              {formatDateTime(override.updated_at)}
            </Text>
          </View>
        </View>

        {/* ── Status Update Section ──────── */}
        {!isLocked && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🔄</Text>
              <Text style={styles.sectionLabel}>Update Status</Text>
            </View>

            <Text style={styles.statusChipsTitle}>Select New Status</Text>

            <View style={styles.statusChipsRow}>
              {ALL_STATUSES.map((s) => {
                const sColor = STATUS_COLORS[s];
                const isActive = selectedStatus === s;
                const isCurrent = currentStatus === s && !selectedStatus;

                return (
                  <Pressable
                    key={s}
                    style={[
                      styles.statusChip,
                      isActive && styles.statusChipActive,
                      isActive && {
                        borderColor: sColor,
                        backgroundColor: sColor + "18",
                      },
                      isCurrent && {
                        borderColor: sColor + "60",
                        backgroundColor: sColor + "0C",
                      },
                    ]}
                    onPress={() => handleStatusSelect(s)}
                  >
                    <Text
                      style={[
                        styles.statusChipLabel,
                        isActive && { color: sColor },
                        isCurrent && { color: sColor },
                      ]}
                    >
                      {STATUS_EMOJIS[s]} {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Reschedule Date Picker ───── */}
            {selectedStatus === "RESCHEDULED" && (
              <View style={styles.rescheduleContainer}>
                <Text style={styles.rescheduleTitle}>
                  🔄 New Date & Time (Required)
                </Text>
                <View style={styles.rescheduleDateRow}>
                  <Pressable
                    style={styles.rescheduleDateBtn}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.rescheduleDateIcon}>📅</Text>
                    <View>
                      <Text style={styles.rescheduleDateLabel}>Date</Text>
                      <Text style={styles.rescheduleDateText}>
                        {displayDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    style={styles.rescheduleDateBtn}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.rescheduleDateIcon}>⏰</Text>
                    <View>
                      <Text style={styles.rescheduleDateLabel}>Time</Text>
                      <Text style={styles.rescheduleDateText}>
                        {displayDate.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </Pressable>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={displayDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                  />
                )}
                {showTimePicker && (
                  <DateTimePicker
                    value={displayDate}
                    mode="time"
                    display="default"
                    onChange={onTimeChange}
                  />
                )}
              </View>
            )}
          </View>
        )}

        {/* ── Save Button ──────────────── */}
        {!isLocked && selectedStatus && (
          <View style={styles.saveContainer}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {selectedStatus === "RESCHEDULED"
                    ? "🔄  Reschedule Task"
                    : `${STATUS_EMOJIS[selectedStatus]}  Update to ${selectedStatus}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── View Template Button ──────── */}
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary }]}
            onPress={() => navigation.navigate("TemplateDetails", { templateId })}
            activeOpacity={0.85}
          >
            <Text style={[styles.saveBtnText, { color: colors.primary }]}>
              📌  View Hobby Details
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OverrideDetailsScreen;
