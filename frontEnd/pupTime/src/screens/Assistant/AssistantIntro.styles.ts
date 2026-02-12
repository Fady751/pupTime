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

  appName: {
    fontSize: 18,
    fontWeight: "600",
    color: PRIMARY,
    marginTop: 4,
  },

  messageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 24,
    elevation: 4,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: "#1F2937",
  },

  subtitle: {
    fontSize: 16,
    color: PRIMARY,
    textAlign: "center",
    marginTop: 8,
  },

  description: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
  },

  actions: {
    marginTop: 10,
  },

  actionButton: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 22,
    marginBottom: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },

  /* لما يتختار */
  selectedButton: {
    borderColor: PRIMARY,
    backgroundColor: "#EEF0FF",
    transform: [{ scale: 1.02 }],
  },

  icon: {
    fontSize: 28,
    marginBottom: 6,
  },

  actionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },

  actionDesc: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },

  continueButton: {
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

