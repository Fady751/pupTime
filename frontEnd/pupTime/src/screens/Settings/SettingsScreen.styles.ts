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
      position: 'relative',
    },
    glowOrbTop: {
      position: 'absolute',
      top: -100,
      right: -50,
      width: 250,
      height: 250,
      borderRadius: 999,
      backgroundColor: colors.primaryLight,
      opacity: 0.8,
    },
    glowOrbBottom: {
      position: 'absolute',
      bottom: -50,
      left: -80,
      width: 300,
      height: 300,
      borderRadius: 999,
      backgroundColor: colors.primaryLight,
      opacity: 0.6,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 24,
    },
    headerTitle: {
      fontSize: 34,
      fontWeight: "900",
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 15,
      color: colors.secondaryText,
      marginTop: 6,
      fontWeight: "500",
      lineHeight: 22,
    },
    scrollContent: {
      paddingBottom: 40,
    },
  });

export default createStyles;
