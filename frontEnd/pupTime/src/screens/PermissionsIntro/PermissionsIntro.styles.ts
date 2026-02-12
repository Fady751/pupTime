import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FA",
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },

  /* Progress Dots */
  progressWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 8,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D0D5DD",
  },

  activeDot: {
    backgroundColor: "#6C63FF",
    width: 20,
  },

  /* Hero Section */
  heroSection: {
    alignItems: "center",
    marginTop: 30,
  },

  title: {
    fontSize: 22,
    color: "#555",
  },

  brand: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#6C63FF",
    marginTop: 4,
  },

  subtitle: {
    textAlign: "center",
    color: "#667085",
    marginTop: 16,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  /* Permission Card */
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#101828",
    marginBottom: 10,
  },

  cardText: {
    fontSize: 15,
    color: "#667085",
    lineHeight: 22,
    marginBottom: 25,
  },

  /* Button */
  button: {
    backgroundColor: "#6C63FF",
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default styles;
