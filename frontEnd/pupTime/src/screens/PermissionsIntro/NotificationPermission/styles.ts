import { StyleSheet } from "react-native";
import { AppColors } from "../../../constants/colors";

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  heroSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: "500",
    color: colors.text,
  },
  brand: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 5,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: colors.secondaryText,
    marginBottom: 20,
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
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
