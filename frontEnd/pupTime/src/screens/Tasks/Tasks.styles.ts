import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  header: {
    fontSize: 28,
    color: "#FFF",
    fontWeight: "bold",
    marginBottom: 20,
  },

  taskCard: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  taskText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },

  completedText: {
    textDecorationLine: "line-through",
    color: "#64748B",
  },

  completeBtn: {
    backgroundColor: "#38BDF8",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },

  completedBtn: {
    backgroundColor: "#22C55E",
  },

  completeText: {
    color: "#FFF",
    fontWeight: "bold",
  },

  deleteBox: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    marginBottom: 12,
    borderRadius: 16,
  },

  deleteText: {
    color: "#FFF",
    fontWeight: "bold",
  },

  addButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 65,
    height: 65,
    borderRadius: 32,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },

  addText: {
    color: "#FFF",
    fontSize: 30,
    marginTop: -2,
  },
});

export default styles;