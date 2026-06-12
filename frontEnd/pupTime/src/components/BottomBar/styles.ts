import { StyleSheet, Platform } from "react-native";
import { AppColors } from "../../constants/colors";

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 60 : 50,
      left: 15,
      right: 15,
      alignItems: 'center',
      zIndex: 10,
    },
    bottomBar: {
      width: '100%',
      height: 70,
      backgroundColor: colors.surface,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderRadius: 35,
      paddingHorizontal: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 10,
    },
    tabItem: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 50,
      height: 50,
    },
    centerSpace: {
      width: 70,
    },
    tabText: {
      fontSize: 10,
      marginTop: 4,
      color: colors.secondaryText,
      fontWeight: '500',
    },
  });

export default createStyles;