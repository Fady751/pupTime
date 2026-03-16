import React, { useMemo, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import useTheme from "../../Hooks/useTheme";
import createStyles from "./AddFriend.styles";
import type { FriendRequest } from "../../types/friend";
import type { RootState } from "../../redux/store";
import {
  cancelFriendRequest,
  extractApiErrorMessage,
  getPendingRequests,
  searchUsers,
  sendFriendRequest,
} from "../../services/friendshipService";

const AddFriendScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currentUserId = useSelector((state: RootState) => state.user.data?.id);

  const [query, setQuery] = useState("");
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<FriendRequest[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [submittingUserId, setSubmittingUserId] = useState<number | null>(null);
  const [cancellingRequestId, setCancellingRequestId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (withSpinner = false) => {
      if (!currentUserId) {
        setError("Please sign in to add friends.");
        setLoading(false);
        return;
      }

      if (withSpinner) {
        setLoading(true);
      }

      try {
        setError(null);
        const requests = await getPendingRequests(currentUserId);
        const outgoing = requests.filter(request => request.direction === "outgoing");
        setOutgoingRequests(outgoing);

        setSearchResults(prev =>
          prev.map(result => {
            const pendingRequest = outgoing.find(request => request.userId === result.userId);

            return {
              ...result,
              friendshipId: pendingRequest?.friendshipId ?? -1,
              requestStatus: pendingRequest ? "sent" : "pending",
            };
          }),
        );
      } catch (e) {
        setError(extractApiErrorMessage(e, "Failed to load friend requests."));
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

  const handleFindUser = async () => {
    if (!currentUserId) {
      Alert.alert("Not signed in", "Please sign in first.");
      return;
    }

    const trimmed = query.trim();

    if (!trimmed) {
      Alert.alert("Missing query", "Enter a username or email to search.");
      return;
    }

    try {
      setSearching(true);
      const users = await searchUsers(trimmed);
      const mappedResults: FriendRequest[] = users.map(user => {
        const pendingRequest = outgoingRequests.find(request => request.userId === user.id);

        return {
          id: `search-${user.id}`,
          friendshipId: pendingRequest?.friendshipId ?? -1,
          userId: user.id,
          name: user.username,
          avatar: "",
          direction: "outgoing",
          requestStatus: pendingRequest ? "sent" : "pending",
        };
      });

      setSearchResults(mappedResults);
      setHasSearched(true);
    } catch (e) {
      Alert.alert("Search failed", extractApiErrorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (user: FriendRequest) => {
    try {
      setSubmittingUserId(user.userId);
      await sendFriendRequest(user.userId);
      setSearchResults(prev =>
        prev.map(result =>
          result.userId === user.userId
            ? { ...result, requestStatus: "sent" }
            : result,
        ),
      );
      await loadData(false);
      Alert.alert("Request sent", `Friend request sent to ${user.name}.`);
    } catch (e) {
      Alert.alert("Request failed", extractApiErrorMessage(e));
    } finally {
      setSubmittingUserId(null);
    }
  };

  const handleCancelRequest = async (request: FriendRequest) => {
    try {
      setCancellingRequestId(request.friendshipId);
      await cancelFriendRequest(request.friendshipId);
      await loadData(false);

      setSearchResults(prev =>
        prev.map(result =>
          result.userId === request.userId
            ? { ...result, friendshipId: -1, requestStatus: "pending" }
            : result,
        ),
      );

      Alert.alert("Request cancelled", `Cancelled request to ${request.name}.`);
    } catch (e) {
      Alert.alert("Cancel failed", extractApiErrorMessage(e));
    } finally {
      setCancellingRequestId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.glowOrbTop} />
        <View style={styles.glowOrbBottom} />

        <View style={styles.header}>
          <Text style={styles.kicker}>Discover</Text>
          <Text style={styles.title}>Add Friend</Text>
          <Text style={styles.subtitle}>
            Search by username or email and send a request.
          </Text>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search username or email"
            placeholderTextColor={colors.secondaryText}
            style={[styles.searchInput, styles.searchInputTight]}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable
            onPress={handleFindUser}
            disabled={searching}
            style={({ pressed }) => [
              styles.searchButton,
              searching && styles.buttonDisabled,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {searching ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <Text style={styles.searchButtonText}>Find</Text>
            )}
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{error}</Text>
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
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Search Results</Text>

              {hasSearched ? (
                searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <View key={result.id} style={styles.resultCard}>
                      <View>
                        <Text style={styles.resultName}>{result.name}</Text>
                      </View>

                      <Pressable
                        disabled={
                          result.requestStatus === "sent" ||
                          submittingUserId === result.userId
                        }
                        onPress={() => handleAdd(result)}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          (result.requestStatus === "sent" || submittingUserId === result.userId) &&
                            styles.buttonDisabled,
                          { opacity: pressed ? 0.85 : 1 },
                        ]}
                      >
                        <Text style={styles.primaryButtonText}>
                          {result.requestStatus === "sent"
                            ? "Sent"
                            : submittingUserId === result.userId
                              ? "Sending..."
                              : "+ Add"}
                        </Text>
                      </Pressable>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyStateCompact}>
                    <Text style={styles.emptyText}>No users found.</Text>
                  </View>
                )
              ) : (
                <View style={styles.emptyStateCompact}>
                  <Text style={styles.emptyText}>
                    Start by searching for a username or email.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Outgoing Requests</Text>

              {outgoingRequests.length > 0 ? (
                outgoingRequests.map(request => (
                  <View key={request.id} style={styles.requestRow}>
                    <View>
                      <Text style={styles.requestName}>{request.name}</Text>
                      <Text style={styles.requestMeta}>Waiting for response</Text>
                    </View>

                    <Pressable
                      onPress={() => handleCancelRequest(request)}
                      disabled={cancellingRequestId === request.friendshipId}
                      style={({ pressed }) => [
                        styles.cancelButton,
                        cancellingRequestId === request.friendshipId && styles.buttonDisabled,
                        { opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <Text style={styles.cancelButtonText}>
                        {cancellingRequestId === request.friendshipId ? "..." : "Cancel"}
                      </Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <View style={styles.emptyStateCompact}>
                  <Text style={styles.emptyText}>No outgoing requests.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default AddFriendScreen;
