import { StyleSheet } from "react-native";

const PRIMARY = "#5B67F1";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FB",
    paddingHorizontal: 22,
    justifyContent: "space-between",
    paddingBottom: 30,
  },

  header: {
    alignItems: "center",
    marginTop: 25,
  },

  logo: {
    fontSize: 42,
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 6,
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  /* Switch */
  switchRow: {
    flexDirection: "row",
    backgroundColor: "#E5E7EB",
    borderRadius: 16,
    padding: 4,
  },

  switchBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },

  activeSwitch: {
    backgroundColor: "#FFFFFF",
  },

  switchText: {
    fontWeight: "600",
  },

  /* Content */
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  micCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  micActive: {
    backgroundColor: "#EEF0FF",
    borderWidth: 3,
    borderColor: PRIMARY,
    transform: [{ scale: 1.05 }],
  },

  micIcon: {
    fontSize: 60,
  },

  input: {
    width: "100%",
    minHeight: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    fontSize: 15,
    textAlignVertical: "top",
  },

  status: {
    marginTop: 20,
    color: "#6B7280",
  },

  doneBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
  },

  doneText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
