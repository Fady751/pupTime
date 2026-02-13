import { StyleSheet } from "react-native";
import { AppColors } from "../../constants/colors";

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    bottomBar: {
      height: 70,
      backgroundColor: colors.surface,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      elevation: 15,
    },

    icon: {
      fontSize: 20,
      opacity: 0.5,
    },
    iconActive: {
      fontSize: 24,
    },
  });

export default createStyles;