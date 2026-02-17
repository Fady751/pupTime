import { StyleSheet } from "react-native";
import type { AppColors } from "../../constants/colors";

export const createStyles = (colors: AppColors) =>
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
      paddingBottom: 16,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.secondaryText,
      marginTop: 4,
    },
    scrollContent: {
      paddingBottom: 40,
    },
  });

export default createStyles;
