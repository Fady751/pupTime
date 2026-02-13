import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 999,
  },
  button: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: "#3B82F6",
  },
  icon: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
  },
});

export default styles;
