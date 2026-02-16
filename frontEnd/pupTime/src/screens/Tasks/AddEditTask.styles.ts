import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#0F172A",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#CBD5E1",
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#FFF",
    padding: 12,
    borderRadius: 12,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  categoryBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    marginRight: 10,
    marginBottom: 10,
  },
  categorySelected: {
    backgroundColor: "#6366F1",
  },
  categoryText: { color: "#FFF" },
  categoryTextSelected: { color: "#FFF", fontWeight: "bold" },
  priorityContainer: { flexDirection: "row", marginTop: 5 },
  priorityBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    marginRight: 10,
  },
  prioritySelected: { backgroundColor: "#FACC15" },
  priorityText: { color: "#FFF", fontWeight: "600" },
  dateBtn: {
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 12,
  },
  dateText: { color: "#FFF" },
  reminderContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 5 },
  reminderBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    marginRight: 10,
    marginBottom: 10,
  },
  reminderSelected: { backgroundColor: "#22C55E" },
  reminderText: { color: "#FFF" },
  emojiContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 5 },
  emojiBtn: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    marginRight: 10,
    marginBottom: 10,
  },
  emojiSelected: { backgroundColor: "#F472B6" },
  emojiText: { fontSize: 20 },
  saveBtn: {
    backgroundColor: "#6366F1",
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    alignItems: "center",
  },
  saveText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});

export default styles;