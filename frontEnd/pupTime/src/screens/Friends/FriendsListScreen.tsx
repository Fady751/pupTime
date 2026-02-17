import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createStyles from "./FriendsList.styles";
import type { Friend } from "../../types/friend";
import FriendItem from "../../components/Friends/FriendItem";

const initialFriends: Friend[] = [
  { id: "1", name: "Ahmed Ali", avatar: "", status: "active" },
  { id: "2", name: "Sara Mohamed", avatar: "", status: "offline" },
  { id: "3", name: "John Doe", avatar: "", status: "active" },
];

const FriendsListScreen = ({ navigation }: { navigation: any }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [blocked, setBlocked] = useState<Friend[]>([]);

  const handleRemoveFriend = (friend: Friend) => {
    setFriends(prev => prev.filter(f => f.id !== friend.id));
  };

  const handleBlockFriend = (friend: Friend) => {
    setFriends(prev => prev.filter(f => f.id !== friend.id));
    setBlocked(prev => [...prev, friend]);
  };

  const handlePressFriend = (friend: Friend) => {
    console.log("Open friend profile", friend.id);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Friends</Text>
          <View style={styles.headerActions}>
            <View style={styles.headerActionButton}>
              <Text
                onPress={() => navigation.navigate("AddFriend")}
                style={styles.headerActionText}
              >
                + Add
              </Text>
            </View>
            <View style={styles.headerActionButton}>
              <Text
                onPress={() => navigation.navigate("BlockedFriends")}
                style={styles.headerActionText}
              >
                Blocked
              </Text>
            </View>
          </View>
        </View>

        {friends.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>You don't have friends yet.</Text>
            <Text style={styles.emptySubtitle}>
              Start adding people to stay motivated!
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>Your Friends</Text>
            {friends.map(friend => (
              <FriendItem
                key={friend.id}
                friend={friend}
                onPress={handlePressFriend}
                onRemove={handleRemoveFriend}
                onBlock={handleBlockFriend}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default FriendsListScreen;
