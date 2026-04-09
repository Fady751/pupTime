import React, { useMemo, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  RefreshControl,
} from "react-native";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import useTheme from "../../Hooks/useTheme";
import createStyles from "./FriendsList.styles";
import type { RootState } from "../../redux/store";
import type { Friend, FriendRequest } from "../../types/friend";
import FriendItem from "../../components/Friends/FriendItem";
import {
  acceptFriendRequest,
  blockUser,
  extractApiErrorMessage,
  getFriends,
  getPendingRequests,
} from "../../services/friendshipService";

const FriendsListScreen = ({ navigation }: { navigation: any }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currentUserId = useSelector((state: RootState) => state.user.data?.id);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const incomingRequests = useMemo(
    () => requests.filter(request => request.direction === "incoming"),
    [requests],
  );

  const loadData = useCallback(
    async (withSpinner = false) => {
      if (!currentUserId) {
        setLoading(false);
        setError("Please sign in to manage friends.");
        return;
      }

      if (withSpinner) {
        setLoading(true);
      }

      try {
        setError(null);
        const [friendsData, requestData] = await Promise.all([
          getFriends(currentUserId),
          getPendingRequests(currentUserId),
        ]);

        setFriends(friendsData);
        setRequests(requestData);
      } catch (e) {
        setError(extractApiErrorMessage(e, "Failed to load your friends."));
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

  const handleBlockFriend = (friend: Friend) => {
    Alert.alert("Block friend", `Block ${friend.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          const actionKey = `friend-block-${friend.id}`;
          try {
            setBusyAction(actionKey);
            await blockUser(Number(friend.id));
            await loadData(false);
          } catch (e) {
            Alert.alert("Unable to block", extractApiErrorMessage(e));
          } finally {
            setBusyAction(null);
          }
        },
      },
    ]);
  };

  const handlePressFriend = (friend: Friend) => {
    navigation.navigate("FriendsChat", {
      friendUserId: Number(friend.id),
      friendName: friend.name,
    });
  };

  const handleAcceptRequest = async (request: FriendRequest) => {
    const actionKey = `accept-${request.friendshipId}`;
    try {
      setBusyAction(actionKey);
      await acceptFriendRequest(request.friendshipId);
      await loadData(false);
    } catch (e) {
      Alert.alert("Unable to accept request", extractApiErrorMessage(e));
    } finally {
      setBusyAction(null);
    }
  };

  const handleBlockRequestUser = async (request: FriendRequest) => {
    const actionKey = `request-block-${request.friendshipId}`;
    try {
      setBusyAction(actionKey);
      await blockUser(request.userId);
      await loadData(false);
    } catch (e) {
      Alert.alert("Unable to block user", extractApiErrorMessage(e));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />

        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Social Hub</Text>
            <Text style={styles.title}>Friends</Text>
            <Text style={styles.subtitle}>Your accountability circle</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.headerActionButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => navigation.navigate("FriendsChat")}
            >
              <Text style={styles.headerActionText}>
                Chats
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.headerActionButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => navigation.navigate("AddFriend")}
            >
              <Text style={styles.headerActionText}>
                + Add
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.headerActionButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => navigation.navigate("BlockedFriends")}
            >
              <Text style={styles.headerActionText}>
                Blocked
              </Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Could not load friends</Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.retryButton,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => loadData(true)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
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
            {incomingRequests.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>Incoming Requests</Text>
                  <Text style={styles.sectionCount}>{incomingRequests.length}</Text>
                </View>

                {incomingRequests.map(request => {
                  const acceptKey = `accept-${request.friendshipId}`;
                  const blockKey = `request-block-${request.friendshipId}`;

                  return (
                    <View key={request.id} style={styles.requestRow}>
                      <View style={styles.requestLeft}>
                        <View style={styles.requestAvatar}>
                          <Text style={styles.requestAvatarText}>
                            {request.name.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.requestName}>{request.name}</Text>
                          <Text style={styles.requestMeta}>Sent you a request</Text>
                        </View>
                      </View>

                      <View style={styles.requestActions}>
                        <Pressable
                          disabled={busyAction === acceptKey || !!busyAction}
                          onPress={() => handleAcceptRequest(request)}
                          style={({ pressed }) => [
                            styles.acceptButton,
                            (busyAction === acceptKey || !!busyAction) &&
                              styles.disabledButton,
                            { opacity: pressed ? 0.8 : 1 },
                          ]}
                        >
                          <Text style={styles.acceptButtonText}>
                            {busyAction === acceptKey ? "..." : "Accept"}
                          </Text>
                        </Pressable>

                        <Pressable
                          disabled={busyAction === blockKey || !!busyAction}
                          onPress={() => handleBlockRequestUser(request)}
                          style={({ pressed }) => [
                            styles.blockButton,
                            (busyAction === blockKey || !!busyAction) &&
                              styles.disabledButton,
                            { opacity: pressed ? 0.8 : 1 },
                          ]}
                        >
                          <Text style={styles.blockButtonText}>
                            {busyAction === blockKey ? "..." : "Block"}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Your Friends</Text>
                <Text style={styles.sectionCount}>{friends.length}</Text>
              </View>

              {friends.length > 0 ? (
                friends.map(friend => (
                  <FriendItem
                    key={friend.id}
                    friend={friend}
                    onPress={handlePressFriend}
                    onBlock={handleBlockFriend}
                  />
                ))
              ) : (
                <View style={styles.emptyInlineState}>
                  <Text style={styles.emptySubtitle}>
                    You don&apos;t have friends yet. Tap + Add to send requests.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default FriendsListScreen;
