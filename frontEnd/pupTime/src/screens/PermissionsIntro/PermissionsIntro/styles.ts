import { StyleSheet } from "react-native";
import { AppColors } from "../../../constants/colors";

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },

  /* Hero Section */
  heroSection: {
    alignItems: "center",
    marginTop: 30,
  },

  title: {
    fontSize: 22,
    color: colors.secondaryText,
  },

  brand: {
    fontSize: 36,
    fontWeight: "bold",
    color: colors.primary,
    marginTop: 4,
  },

  subtitle: {
    textAlign: "center",
    color: colors.secondaryText,
    marginTop: 16,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  /* Permission Card */
  card: {
    width: "100%",
    backgroundColor: colors.surface,
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
    color: colors.text,
    marginBottom: 10,
  },

  cardText: {
    fontSize: 15,
    color: colors.secondaryText,
    lineHeight: 22,
    marginBottom: 25,
  },

  /* Button */
  button: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: "600",
  },

  skipButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: "center",
  },

  skipText: {
    color: colors.secondaryText,
    fontSize: 14,
    fontWeight: "500",
  },
});

export default createStyles;
