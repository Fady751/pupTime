import { StyleSheet } from "react-native";
import { AppColors } from "../../constants/colors";

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      width: 65,
      height: 65,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 12,
    },
    button: {
      width: 65,
      height: 65,
      borderRadius: 32.5,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderWidth: 2,
      borderColor: colors.surface,
    },
    icon: {
      width: 65,
      height: 65,
    },
  });

export default createStyles;
