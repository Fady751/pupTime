import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import useTheme from "../../Hooks/useTheme";
import { createSocialTasksStyles } from "./styles";
import type { RootState } from "../../redux/store";
import { getFriends } from "../../services/friendshipService";
import type { Friend } from "../../types/friend";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  createSocialTask,
  listSocialTasks,
  listPendingInvites,
  getSocialTaskDetail,
  acceptInvite,
  declineInvite,
  editSocialTask,
  addInlineSubTask,
  cancelSocialTask,
  inviteParticipants,
  type SocialTask,
  type SubTask,
} from "../../services/socialTaskService";
import socialIcon from "../../assets/socialIcon.png";

const SocialTasksScreen: React.FC = () => {
  const { colors, theme } = useTheme();
  const styles = useMemo(() => createSocialTasksStyles(colors), [colors]);
  const currentUserId = useSelector((state: RootState) => state.user.data?.id);

  // Navigation Stack State
  const [viewStack, setViewStack] = useState<string[]>(["home"]);
  const currentView = viewStack[viewStack.length - 1];

  const pushView = (view: string) => {
    setViewStack(prev => [...prev, view]);
  };

  const popView = () => {
    if (viewStack.length > 1) {
      setViewStack(prev => prev.slice(0, -1));
    }
  };

  // Home Screen State
  const [activeTab, setActiveTab] = useState<"pending" | "mytasks">("pending");
  const [tasks, setTasks] = useState<SocialTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detailed view state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailedTask, setDetailedTask] = useState<SocialTask | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create state
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createDur, setCreateDur] = useState("30");
  const [createTime, setCreateTime] = useState(new Date().toISOString());
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [tempSubtasks, setTempSubtasks] = useState<{ title: string; duration_minutes: number }[]>([]);

  // Friends selection state
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendsSearchQuery, setFriendsSearchQuery] = useState("");
  const [friendsSelectionMode, setFriendsSelectionMode] = useState<"create" | "edit">("create");

  // Subtask Builder state
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDur, setSubtaskDur] = useState("5");

  // Inline subtask state
  const [inlineSubtaskTitle, setInlineSubtaskTitle] = useState("");
  const [inlineSubtaskDuration, setInlineSubtaskDuration] = useState("5");

  // Edit settings state
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDur, setEditDur] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editSelectedFriends, setEditSelectedFriends] = useState<number[]>([]);

  // DateTimePicker display states
  const [showCreateDatePicker, setShowCreateDatePicker] = useState(false);
  const [showCreateTimePicker, setShowCreateTimePicker] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);

  // Date/Time Change handlers
  const onCreateDateChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowCreateDatePicker(false);
    if (_e.type === "dismissed" || !d) return;
    const current = createTime ? new Date(createTime) : new Date();
    current.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setCreateTime(current.toISOString());
  };

  const onCreateTimeChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowCreateTimePicker(false);
    if (_e.type === "dismissed" || !d) return;
    const current = createTime ? new Date(createTime) : new Date();
    current.setHours(d.getHours(), d.getMinutes(), 0, 0);
    setCreateTime(current.toISOString());
  };

  const onEditDateChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowEditDatePicker(false);
    if (_e.type === "dismissed" || !d) return;
    const current = editTime ? new Date(editTime) : new Date();
    current.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setEditTime(current.toISOString());
  };

  const onEditTimeChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowEditTimePicker(false);
    if (_e.type === "dismissed" || !d) return;
    const current = editTime ? new Date(editTime) : new Date();
    current.setHours(d.getHours(), d.getMinutes(), 0, 0);
    setEditTime(current.toISOString());
  };

  // Friends filtering logic
  const filteredFriends = useMemo(() => {
    let list = friendsList;
    if (friendsSelectionMode === "edit" && detailedTask) {
      list = list.filter(f => !detailedTask.participants?.some(p => p.user.id.toString() === f.id.toString()));
    }
    if (friendsSearchQuery.trim() !== "") {
      const q = friendsSearchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }
    return list;
  }, [friendsList, friendsSelectionMode, detailedTask, friendsSearchQuery]);

  // Fetch task list
  const fetchTaskList = useCallback(async (isRefresh = false) => {
    if (!currentUserId) return;
    if (!isRefresh) setLoadingTasks(true);


    try {
      let data: SocialTask[] = [];
      if (activeTab === "pending") {
        data = await listPendingInvites();
      } else {
        data = await listSocialTasks();
      }
      setTasks(data.filter(t => t.status !== "cancelled"));
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  }, [activeTab, currentUserId]);

  useEffect(() => {
    fetchTaskList();
  }, [fetchTaskList]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTaskList(true);
    setRefreshing(false);
  };

  // Fetch friends
  const fetchFriends = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingFriends(true);
    try {
      const data = await getFriends(currentUserId);
      setFriendsList(data);
    } catch (e: any) {
      Alert.alert("Error", "Failed to load friends list");
    } finally {
      setLoadingFriends(false);
    }
  }, [currentUserId]);

  // Open Details Screen
  const handleOpenDetails = async (id: string) => {
    setSelectedTaskId(id);
    setLoadingDetail(true);
    pushView("details");

    try {
      const details = await getSocialTaskDetail(id);
      setDetailedTask(details);
    } catch (e: any) {
      Alert.alert("Error", "Failed to fetch task details");
      popView();
    } finally {
      setLoadingDetail(false);
    }
  };

  // Accept Invite
  const handleAcceptInvite = async (id: string) => {
    try {
      await acceptInvite(id);
      Alert.alert("Success", "Invitation accepted!");
      popView();
      fetchTaskList();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to accept invite");
    }
  };

  // Decline Invite
  const handleDeclineInvite = async (id: string) => {
    try {
      await declineInvite(id);
      Alert.alert("Success", "Invitation declined.");
      popView();
      fetchTaskList();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to decline invite");
    }
  };

  // Add subtask inline in details
  const handleAddInlineSubtask = async (id: string) => {
    if (!inlineSubtaskTitle.trim()) {
      Alert.alert("Error", "Please enter a name for the subtask");
      return;
    }
    const dur = parseInt(inlineSubtaskDuration, 10);
    if (isNaN(dur) || dur <= 0) {
      Alert.alert("Error", "Please enter a valid duration in minutes");
      return;
    }
    try {
      await addInlineSubTask(id, {
        title: inlineSubtaskTitle.trim(),
        duration_minutes: dur,
      });
      setInlineSubtaskTitle("");
      setInlineSubtaskDuration("5");
      // Refetch details
      const details = await getSocialTaskDetail(id);
      setDetailedTask(details);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to add sub-task");
    }
  };

  // Cancel Task
  const handleCancelTask = async (id: string) => {
    Alert.alert("Cancel Task", "Are you sure you want to cancel this social task?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelSocialTask(id);
            Alert.alert("Success", "Social task cancelled");
            popView();
            fetchTaskList();
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to cancel task");
          }
        },
      },
    ]);
  };

  // Open Edit settings
  const handleOpenEdit = () => {
    if (!detailedTask) return;
    setEditTitle(detailedTask.title);
    setEditDesc(detailedTask.description);
    setEditDur(detailedTask.duration_minutes.toString());
    setEditTime(detailedTask.scheduled_at || new Date().toISOString());
    setEditSelectedFriends([]);
    pushView("edit");
  };

  // Submit Edit Settings
  const handleSubmitEdit = async () => {
    if (!selectedTaskId) return;
    if (!editTitle.trim()) {
      Alert.alert("Error", "Title cannot be empty");
      return;
    }
    try {
      const updated = await editSocialTask(selectedTaskId, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        duration_minutes: parseInt(editDur, 10) || 30,
        scheduled_at: editTime.trim() || null,
      });

      let finalTask = updated;
      if (editSelectedFriends.length > 0) {
        finalTask = await inviteParticipants(selectedTaskId, editSelectedFriends);
        setEditSelectedFriends([]);
      }

      setDetailedTask(finalTask);
      Alert.alert("Success", "Task updated successfully");
      popView(); // Back to details
      fetchTaskList(); // Refresh background list
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update task");
    }
  };

  // Create Screen Select Friends
  const handleOpenFriendsList = async () => {
    setFriendsSelectionMode("create");
    setFriendsSearchQuery("");
    await fetchFriends();
    pushView("friends");
  };

  // Edit Screen Invite Friends
  const handleOpenEditFriendsList = async () => {
    setFriendsSelectionMode("edit");
    setFriendsSearchQuery("");
    await fetchFriends();
    pushView("friends");
  };

  const toggleSelectFriend = (friendId: number) => {
    if (friendsSelectionMode === "edit") {
      if (editSelectedFriends.includes(friendId)) {
        setEditSelectedFriends(prev => prev.filter(id => id !== friendId));
      } else {
        setEditSelectedFriends(prev => [...prev, friendId]);
      }
    } else {
      if (selectedFriends.includes(friendId)) {
        setSelectedFriends(prev => prev.filter(id => id !== friendId));
      } else {
        setSelectedFriends(prev => [...prev, friendId]);
      }
    }
  };

  // Create Screen Subtasks list builder
  const handleAddTempSubtask = () => {
    if (!subtaskTitle.trim()) {
      Alert.alert("Error", "Please enter subtask name");
      return;
    }
    setTempSubtasks(prev => [
      ...prev,
      {
        title: subtaskTitle.trim(),
        duration_minutes: parseInt(subtaskDur, 10) || 5,
      },
    ]);
    setSubtaskTitle("");
    setSubtaskDur("5");
  };

  // Create Plan Submit
  const handleCreateSocialTaskSubmit = async () => {
    if (!createTitle.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }
    try {
      await createSocialTask({
        title: createTitle.trim(),
        description: createDesc.trim(),
        duration_minutes: parseInt(createDur, 10) || 30,
        scheduled_at: createTime ? new Date(createTime).toISOString() : null,
        participant_ids: selectedFriends,
        sub_tasks: tempSubtasks,
      });
      Alert.alert("Success", "Social Task created!");
      // Reset State
      setCreateTitle("");
      setCreateDesc("");
      setCreateDur("30");
      setCreateTime(new Date().toISOString());
      setSelectedFriends([]);
      setTempSubtasks([]);
      // Pop View back to home
      setViewStack(["home"]);
      setActiveTab("mytasks");
      fetchTaskList();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to create social task");
    }
  };

  // Check if current user is the initiator of the detailed task
  const isInitiator = useMemo(() => {
    if (!detailedTask || !currentUserId) return false;
    return detailedTask.initiator.id === currentUserId;
  }, [detailedTask, currentUserId]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />

        {/* ==================== HOME SCREEN ==================== */}
        {currentView === "home" && (
          <>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Social Tasks</Text>
              </View>
              <Text style={styles.headerRight}>
                <Image source={socialIcon as any} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
              </Text>
            </View>

            <View style={{ paddingHorizontal: 16 }}>
              <View style={styles.tabs}>
                <Pressable
                  style={[styles.tab, activeTab === "pending" && styles.tabActive]}
                  onPress={() => setActiveTab("pending")}
                >
                  <Text style={[styles.tabText, activeTab === "pending" && styles.tabTextActive]}>
                    Pending Invites
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.tab, activeTab === "mytasks" && styles.tabActive]}
                  onPress={() => setActiveTab("mytasks")}
                >
                  <Text style={[styles.tabText, activeTab === "mytasks" && styles.tabTextActive]}>
                    My Tasks
                  </Text>
                </Pressable>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
            >
              {loadingTasks ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
              ) : tasks.length === 0 ? (
                <View style={styles.taskListEmpty}>
                  <Text style={styles.taskListEmptyText}>No tasks found.</Text>
                </View>
              ) : (
                tasks.map(task => {
                  const participantCount = task.participant_count || 1;
                  const acceptedCount = task.accepted_count ?? 1;
                  const percentage = Math.min((acceptedCount / participantCount) * 100, 100);

                  return (
                    <Pressable
                      key={task.id}
                      style={styles.taskCard}
                      onPress={() => handleOpenDetails(task.id)}
                    >
                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {task.title}
                        </Text>
                        <Text style={styles.cardDur}>{task.duration_minutes}m</Text>
                      </View>
                      <Text style={styles.cardAuthor}>By @{task.initiator.username}</Text>
                      <Text style={styles.cardRsvpMeta}>
                        {acceptedCount}/{participantCount} Accepted
                      </Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
                      </View>

                      {activeTab === "pending" && (
                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 14, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 }}>
                          <Pressable
                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeclineInvite(task.id);
                            }}
                          >
                            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>Decline</Text>
                          </Pressable>
                          <Pressable
                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.primary }}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleAcceptInvite(task.id);
                            }}
                          >
                            <Text style={{ color: colors.primaryText, fontSize: 13, fontWeight: "700" }}>Accept</Text>
                          </Pressable>
                        </View>
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.bottomActionBar}>
              <Pressable style={styles.btnCreateMassive} onPress={() => pushView("create")}>
                <Text style={styles.btnCreateMassiveText}>+ New Social Task</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ==================== TASK DETAILS ==================== */}
        {currentView === "details" && (
          <>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Pressable style={styles.backButton} onPress={popView}>
                  <Text style={styles.backButtonText}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Task Details</Text>
              </View>
              <Text style={styles.headerRight}>
                <Image source={socialIcon as any} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
              </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {loadingDetail || !detailedTask ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
              ) : (
                <>
                  <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: 8 }}>
                    {detailedTask.title}
                  </Text>
                  <Text style={styles.detailText}>{detailedTask.description || "No description provided."}</Text>

                  {detailedTask.scheduled_at && (
                    <View style={{ flexDirection: "row", marginBottom: 20 }}>
                      <Text style={[styles.badge, styles.bgGreen]}>
                        📅 {new Date(detailedTask.scheduled_at).toLocaleDateString()} {new Date(detailedTask.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  )}

                  {/* Accept / Decline or Edit / Cancel Actions */}
                  {isInitiator ? (
                    <View style={styles.btnHalfContainer}>
                      <Pressable style={[styles.btnPrimary, styles.btnHalf]} onPress={handleOpenEdit}>
                        <Text style={styles.btnPrimaryText}>Edit Settings</Text>
                      </Pressable>
                      <Pressable style={[styles.btnDanger, styles.btnHalf]} onPress={() => handleCancelTask(detailedTask.id)}>
                        <Text style={styles.btnPrimaryText}>Cancel Task</Text>
                      </Pressable>
                    </View>
                  ) : detailedTask.my_status === "invited" ? (
                    <View style={styles.btnHalfContainer}>
                      <Pressable style={[styles.btnPrimary, styles.btnHalf]} onPress={() => handleAcceptInvite(detailedTask.id)}>
                        <Text style={styles.btnPrimaryText}>Accept</Text>
                      </Pressable>
                      <Pressable style={[styles.btnDanger, styles.btnHalf]} onPress={() => handleDeclineInvite(detailedTask.id)}>
                        <Text style={styles.btnPrimaryText}>Decline</Text>
                      </Pressable>
                    </View>
                  ) : detailedTask.my_status && (
                    <View style={{ marginBottom: 16, flexDirection: "row" }}>
                      <Text style={[styles.badge, detailedTask.my_status === "accepted" ? styles.bgGreen : styles.bgOrange]}>
                        Your RSVP: {detailedTask.my_status}
                      </Text>
                    </View>
                  )}

                  {/* Sub-tasks */}
                  <Text style={styles.sectionLabel}>Sub-tasks</Text>
                  <View style={styles.detailBox}>
                    {(!detailedTask.sub_tasks || detailedTask.sub_tasks.length === 0) ? (
                      <Text style={{ fontSize: 13, color: colors.secondaryText }}>No subtasks.</Text>
                    ) : (
                      detailedTask.sub_tasks.map((st, idx) => (
                        <View
                          key={st.id || idx}
                          style={[
                            styles.flexRow,
                            idx === (detailedTask.sub_tasks!.length - 1) && styles.flexRowLast,
                          ]}
                        >
                          <Text style={styles.flexRowText}>▫️ {st.title}</Text>
                          <Text style={styles.flexRowValue}>{st.duration_minutes}m</Text>
                        </View>
                      ))
                    )}

                    {isInitiator && (
                      <View style={styles.inlineSubtaskForm}>
                        <TextInput
                          placeholder="New subtask name..."
                          placeholderTextColor={colors.secondaryText}
                          style={styles.inlineSubtaskInput}
                          value={inlineSubtaskTitle}
                          onChangeText={setInlineSubtaskTitle}
                        />
                        <TextInput
                          placeholder="Duration (minutes)..."
                          placeholderTextColor={colors.secondaryText}
                          keyboardType="numeric"
                          style={styles.inlineSubtaskInput}
                          value={inlineSubtaskDuration}
                          onChangeText={setInlineSubtaskDuration}
                        />
                        <Pressable style={styles.btnSecondary} onPress={() => handleAddInlineSubtask(detailedTask.id)}>
                          <Text style={styles.btnSecondaryText}>+ Add Subtask</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* RSVPs Status */}
                  <Text style={styles.sectionLabel}>RSVPs</Text>
                  <View style={styles.detailBox}>
                    {(!detailedTask.participants || detailedTask.participants.length === 0) ? (
                      <Text style={{ fontSize: 13, color: colors.secondaryText }}>No participants.</Text>
                    ) : (
                      detailedTask.participants.map((p, idx) => {
                        const isAccepted = p.status === "accepted";
                        const badgeStyle = isAccepted ? styles.bgGreen : p.status === "declined" ? styles.bgDanger : styles.bgOrange;
                        return (
                          <View
                            key={p.id || idx}
                            style={[
                              styles.flexRow,
                              idx === (detailedTask.participants!.length - 1) && styles.flexRowLast,
                            ]}
                          >
                            <Text style={styles.flexRowText}>@{p.user.username}</Text>
                            <Text style={[styles.badge, badgeStyle]}>{p.status}</Text>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Personal templates */}
                  {detailedTask.status === "confirmed" && detailedTask.my_tasks && detailedTask.my_tasks.length > 0 && (
                    <>
                      <Text style={styles.sectionLabel}>My Calendar Template</Text>
                      <View style={styles.detailBox}>
                        {detailedTask.my_tasks.map((mt, idx) => (
                          <View
                            key={mt.id || idx}
                            style={[
                              styles.flexRow,
                              idx === (detailedTask.my_tasks!.length - 1) && styles.flexRowLast,
                              { borderBottomWidth: 0, paddingVertical: 4 },
                            ]}
                          >
                            <Text style={[styles.flexRowText, { fontWeight: "700" }]}>
                              🗓️ {mt.title}
                            </Text>
                            <Text style={styles.flexRowValue}>({mt.duration_minutes}m)</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </>
        )}

        {/* ==================== CREATE PLAN ==================== */}
        {currentView === "create" && (
          <>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Pressable style={styles.backButton} onPress={popView}>
                  <Text style={styles.backButtonText}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Create Plan</Text>
              </View>
              <Text style={styles.headerRight}>
                <Image source={socialIcon as any} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
              </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.sectionLabel}>What are we doing? *</Text>
                <TextInput
                  placeholder="e.g. Evening Run"
                  placeholderTextColor={colors.secondaryText}
                  style={styles.formInput}
                  value={createTitle}
                  onChangeText={setCreateTitle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.sectionLabel}>Description</Text>
                <TextInput
                  placeholder="Details..."
                  placeholderTextColor={colors.secondaryText}
                  style={styles.formInput}
                  value={createDesc}
                  onChangeText={setCreateDesc}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={styles.formGroup}>
                  <Text style={styles.sectionLabel}>Mins</Text>
                  <TextInput
                    placeholder="30"
                    placeholderTextColor={colors.secondaryText}
                    keyboardType="numeric"
                    style={[styles.formInput, { width: 90 }]}
                    value={createDur}
                    onChangeText={setCreateDur}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>Date & Time</Text>
                  <View style={styles.dateTimeRow}>
                    <Pressable style={styles.dateTimeBtn} onPress={() => setShowCreateDatePicker(true)}>
                      <Text style={styles.dateTimeLabel}>Date</Text>
                      <Text style={styles.dateTimeText}>
                        {createTime
                          ? new Date(createTime).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                          : "Select Date"}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.dateTimeBtn} onPress={() => setShowCreateTimePicker(true)}>
                      <Text style={styles.dateTimeLabel}>Time</Text>
                      <Text style={styles.dateTimeText}>
                        {createTime
                          ? new Date(createTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "Select Time"}
                      </Text>
                    </Pressable>
                  </View>
                  {showCreateDatePicker && (
                    <DateTimePicker
                      value={createTime ? new Date(createTime) : new Date()}
                      mode="date"
                      display="default"
                      themeVariant={theme === "dark" ? "dark" : "light"}
                      accentColor={colors.primary}
                      onChange={onCreateDateChange}
                    />
                  )}
                  {showCreateTimePicker && (
                    <DateTimePicker
                      value={createTime ? new Date(createTime) : new Date()}
                      mode="time"
                      display="default"
                      themeVariant={theme === "dark" ? "dark" : "light"}
                      accentColor={colors.primary}
                      onChange={onCreateTimeChange}
                    />
                  )}
                </View>
              </View>

              <Text style={styles.sectionLabel}>Who is joining?</Text>
              <Pressable style={styles.btnSecondary} onPress={handleOpenFriendsList}>
                <Text style={styles.btnSecondaryText}>Select Friends ➔</Text>
              </Pressable>
              {selectedFriends.length > 0 && (
                <Text style={{ marginTop: 8, fontSize: 12, fontWeight: "700", color: colors.primary }}>
                  Inviting {selectedFriends.length} friends
                </Text>
              )}

              <Text style={styles.sectionLabel}>Add Sub-tasks</Text>
              <Pressable style={styles.btnSecondary} onPress={() => pushView("subtasks")}>
                <Text style={styles.btnSecondaryText}>Build Sub-tasks ➔</Text>
              </Pressable>
              {tempSubtasks.length > 0 && (
                <Text style={{ marginTop: 8, fontSize: 12, fontWeight: "700", color: colors.primary }}>
                  {tempSubtasks.length} subtasks added
                </Text>
              )}

              <View style={{ marginTop: 30 }}>
                <Pressable style={styles.btnPrimary} onPress={handleCreateSocialTaskSubmit}>
                  <Text style={styles.btnPrimaryText}>Create Social Task</Text>
                </Pressable>
              </View>
            </ScrollView>
          </>
        )}

        {/* ==================== INVITE FRIENDS ==================== */}
        {currentView === "friends" && (
          <>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Pressable style={styles.backButton} onPress={popView}>
                  <Text style={styles.backButtonText}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Invite Friends</Text>
              </View>
              <Text style={styles.headerRight}>
                <Image source={socialIcon as any} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
              </Text>
            </View>

            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <TextInput
                placeholder="Search friends by name..."
                placeholderTextColor={colors.secondaryText}
                style={styles.searchInput}
                value={friendsSearchQuery}
                onChangeText={setFriendsSearchQuery}
              />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {loadingFriends ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
              ) : filteredFriends.length === 0 ? (
                <View style={styles.taskListEmpty}>
                  <Text style={styles.taskListEmptyText}>
                    {friendsSelectionMode === "edit" ? "All friends are already invited!" : "No friends found."}
                  </Text>
                </View>
              ) : (
                <View style={styles.listSelector}>
                  {filteredFriends.map(f => {
                    const isChecked = friendsSelectionMode === "edit"
                      ? editSelectedFriends.includes(Number(f.id))
                      : selectedFriends.includes(Number(f.id));
                    return (
                      <Pressable
                        key={f.id}
                        style={styles.listItem}
                        onPress={() => toggleSelectFriend(Number(f.id))}
                      >
                        <Text style={styles.listItemText}>@{f.name}</Text>
                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                          {isChecked && <Text style={styles.checkboxText}>✓</Text>}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Pressable style={styles.btnPrimary} onPress={popView}>
                <Text style={styles.btnPrimaryText}>Confirm Selection</Text>
              </Pressable>
            </ScrollView>
          </>
        )}

        {/* ==================== SUB-TASKS BUILDER ==================== */}
        {currentView === "subtasks" && (
          <>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Pressable style={styles.backButton} onPress={popView}>
                  <Text style={styles.backButtonText}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Sub-tasks</Text>
              </View>
              <Text style={styles.headerRight}>
                <Image source={socialIcon as any} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
              </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.detailBox}>
                <View style={styles.formGroup}>
                  <Text style={styles.sectionLabel}>Subtask Name</Text>
                  <TextInput
                    placeholder="e.g. Warm up"
                    placeholderTextColor={colors.secondaryText}
                    style={styles.formInput}
                    value={subtaskTitle}
                    onChangeText={setSubtaskTitle}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.sectionLabel}>Duration (mins)</Text>
                  <TextInput
                    placeholder="5"
                    placeholderTextColor={colors.secondaryText}
                    keyboardType="numeric"
                    style={styles.formInput}
                    value={subtaskDur}
                    onChangeText={setSubtaskDur}
                  />
                </View>
                <Pressable style={styles.btnSecondary} onPress={handleAddTempSubtask}>
                  <Text style={styles.btnSecondaryText}>+ Add To List</Text>
                </Pressable>
              </View>

              <Text style={styles.sectionLabel}>Current List</Text>
              {tempSubtasks.length === 0 ? (
                <Text style={{ fontSize: 13, color: colors.secondaryText, fontStyle: "italic" }}>
                  No subtasks added yet.
                </Text>
              ) : (
                tempSubtasks.map((st, idx) => (
                  <View key={idx} style={styles.detailBox}>
                    <Text style={{ fontWeight: "700", color: colors.text }}>
                      {st.title} ({st.duration_minutes}m)
                    </Text>
                  </View>
                ))
              )}

              <Pressable style={[styles.btnPrimary, { marginTop: 30 }]} onPress={popView}>
                <Text style={styles.btnPrimaryText}>Done</Text>
              </Pressable>
            </ScrollView>
          </>
        )}

        {/* ==================== EDIT SETTINGS ==================== */}
        {currentView === "edit" && (
          <>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Pressable style={styles.backButton} onPress={popView}>
                  <Text style={styles.backButtonText}>←</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Edit Settings</Text>
              </View>
              <Text style={styles.headerRight}>
                <Image source={socialIcon as any} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
              </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.sectionLabel}>Task Title</Text>
                <TextInput
                  placeholder="Task Title"
                  placeholderTextColor={colors.secondaryText}
                  style={styles.formInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.sectionLabel}>Description</Text>
                <TextInput
                  placeholder="Description..."
                  placeholderTextColor={colors.secondaryText}
                  style={styles.formInput}
                  value={editDesc}
                  onChangeText={setEditDesc}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={styles.formGroup}>
                  <Text style={styles.sectionLabel}>Duration </Text>
                  <TextInput
                    placeholder="30"
                    placeholderTextColor={colors.secondaryText}
                    keyboardType="numeric"
                    style={[styles.formInput, { width: 90 }]}
                    value={editDur}
                    onChangeText={setEditDur}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>Date & Time</Text>
                  <View style={styles.dateTimeRow}>
                    <Pressable style={styles.dateTimeBtn} onPress={() => setShowEditDatePicker(true)}>
                      <Text style={styles.dateTimeText}>
                        {editTime
                          ? new Date(editTime).toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "numeric" })
                          : "Select Date"}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.dateTimeBtn} onPress={() => setShowEditTimePicker(true)}>
                      <Text style={styles.dateTimeText}>
                        {editTime
                          ? new Date(editTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "Select Time"}
                      </Text>
                    </Pressable>
                  </View>
                  {showEditDatePicker && (
                    <DateTimePicker
                      value={editTime ? new Date(editTime) : new Date()}
                      mode="date"
                      display="default"
                      themeVariant={theme === "dark" ? "dark" : "light"}
                      accentColor={colors.primary}
                      onChange={onEditDateChange}
                    />
                  )}
                  {showEditTimePicker && (
                    <DateTimePicker
                      value={editTime ? new Date(editTime) : new Date()}
                      mode="time"
                      display="default"
                      themeVariant={theme === "dark" ? "dark" : "light"}
                      accentColor={colors.primary}
                      onChange={onEditTimeChange}
                    />
                  )}
                </View>
              </View>

              <Text style={styles.sectionLabel}>Invite Friends</Text>
              <Pressable style={styles.btnSecondary} onPress={handleOpenEditFriendsList}>
                <Text style={styles.btnSecondaryText}>Select Friends to Invite ➔</Text>
              </Pressable>
              {editSelectedFriends.length > 0 && (
                <Text style={{ marginTop: 8, fontSize: 12, fontWeight: "700", color: colors.primary }}>
                  Inviting {editSelectedFriends.length} more friends
                </Text>
              )}

              <Pressable style={[styles.btnPrimary, { marginTop: 30 }]} onPress={handleSubmitEdit}>
                <Text style={styles.btnPrimaryText}>Save Changes</Text>
              </Pressable>
            </ScrollView>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default SocialTasksScreen;
