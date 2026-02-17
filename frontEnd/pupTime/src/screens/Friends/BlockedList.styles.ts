import { StyleSheet } from "react-native";
import type { AppColors } from "../../constants/colors";

export const createBlockedListStyles = (colors: AppColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
    },
    listContainer: {
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    emptyState: {
      paddingHorizontal: 20,
      paddingTop: 40,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 14,
      color: colors.secondaryText,
      textAlign: "center",
    },
  });

export default createBlockedListStyles;
