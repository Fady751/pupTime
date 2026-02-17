import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, TextInput } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createStyles from "./AddFriend.styles";
import type { FriendRequest } from "../../types/friend";
import UserSearchItem from "../../components/Friends/UserSearchItem";

const mockUsers: FriendRequest[] = [
  { id: "10", name: "Sara Mohamed", avatar: "", requestStatus: "pending" },
  { id: "11", name: "Ahmed Ali", avatar: "", requestStatus: "pending" },
  { id: "12", name: "John Doe", avatar: "", requestStatus: "pending" },
];

const AddFriendScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendRequest[]>(mockUsers);

  const handleSearch = (text: string) => {
    setQuery(text);
    const trimmed = text.trim().toLowerCase();

    if (!trimmed) {
      setResults(mockUsers);
      return;
    }

    const filtered = mockUsers.filter(user =>
      user.name.toLowerCase().includes(trimmed)
    );
    setResults(filtered);
  };

  const handleAdd = (request: FriendRequest) => {
    setResults(prev =>
      prev.map(r =>
        r.id === request.id
          ? { ...r, requestStatus: "sent" }
          : r
      )
    );
  };

  const hasResults = results.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Friend</Text>
        </View>

        <TextInput
          value={query}
          onChangeText={handleSearch}
          placeholder="Search by username or email..."
          placeholderTextColor={colors.secondaryText}
          style={styles.searchInput}
        />

        {hasResults ? (
          <ScrollView
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          >
            {results.map(user => (
              <UserSearchItem
                key={user.id}
                request={user}
                onAdd={handleAdd}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No users found.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default AddFriendScreen;
