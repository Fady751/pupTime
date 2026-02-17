import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView } from "react-native";
import useTheme from "../../Hooks/useTheme";
import createStyles from "./BlockedList.styles";
import type { Friend } from "../../types/friend";
import BlockedItem from "../../components/Friends/BlockedItem";

const initialBlocked: Friend[] = [
  { id: "20", name: "Blocked User", avatar: "", status: "offline" },
];

const BlockedListScreen = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [blocked, setBlocked] = useState<Friend[]>(initialBlocked);

  const handleUnblock = (user: Friend) => {
    setBlocked(prev => prev.filter(b => b.id !== user.id));
  };

  const hasBlocked = blocked.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Blocked Users</Text>
        </View>

        {hasBlocked ? (
          <ScrollView
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          >
            {blocked.map(user => (
              <BlockedItem
                key={user.id}
                user={user}
                onUnblock={handleUnblock}
              />
            ))}
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
