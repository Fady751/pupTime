import React, { useMemo, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import useTheme from "../../Hooks/useTheme";
import createStyles from "./BlockedList.styles";
import type { RootState } from "../../redux/store";
import type { BlockedFriend } from "../../types/friend";
import BlockedItem from "../../components/Friends/BlockedItem";
import {
  extractApiErrorMessage,
  getBlockedUsers,
  unblockUser,
} from "../../services/friendshipService";

const BlockedListScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currentUserId = useSelector((state: RootState) => state.user.data?.id);

  const [blocked, setBlocked] = useState<BlockedFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (withSpinner = false) => {
      if (!currentUserId) {
        setError("Please sign in to manage blocked users.");
        setLoading(false);
        return;
      }

      if (withSpinner) {
        setLoading(true);
      }

      try {
        setError(null);
        const data = await getBlockedUsers(currentUserId);
        setBlocked(data);
      } catch (e) {
        setError(extractApiErrorMessage(e, "Failed to load blocked users."));
      } finally {
        setLoading(false);
      }
    },
    [currentUserId],
  );

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  }, [loadData]);

  const handleUnblock = (user: BlockedFriend) => {
    Alert.alert("Unblock user", `Unblock ${user.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        onPress: async () => {
          try {
            await unblockUser(user.userId);
            await loadData(false);
          } catch (e) {
            Alert.alert("Unable to unblock", extractApiErrorMessage(e));
          }
        },
      },
    ]);
  };

  const hasBlocked = blocked.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />

        <View style={styles.header}>
          <Text style={styles.kicker}>Safety</Text>
          <Text style={styles.title}>Blocked Users</Text>
          <Text style={styles.subtitle}>Control who can interact with you</Text>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : hasBlocked ? (
          <ScrollView
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Blocked Accounts</Text>
                <Text style={styles.sectionCount}>{blocked.length}</Text>
              </View>

              {blocked.map(user => (
                <BlockedItem
                  key={user.id}
                  user={user}
                  onUnblock={handleUnblock}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>You have no blocked users.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default BlockedListScreen;
