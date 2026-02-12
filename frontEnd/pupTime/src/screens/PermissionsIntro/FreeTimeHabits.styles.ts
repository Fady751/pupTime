import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  /* CENTERED CARD */

  centerBox: {
    width: width * 0.65,
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingVertical: 50,
    paddingHorizontal: 40,
    alignItems: "center",

    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    elevation: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },

  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 520,
    marginBottom: 40,
  },

  /* GRID */

  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 40,
  },

  habitCard: {
    width: 160,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    margin: 10,

    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  habitCardSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",

    shadowColor: "#4F46E5",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },

  habitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
  },

  habitTextSelected: {
    color: "#FFFFFF",
  },

  /* BUTTON */

  nextButton: {
    width: 220,
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",

    shadowColor: "#4F46E5",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },

  nextDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
  },

  nextText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});
