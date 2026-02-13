import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppColors } from "../../constants/colors";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  colors: AppColors;
  labels?: string[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  colors,
  labels = [],
}) => {
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isLast = index === totalSteps - 1;

          return (
            <React.Fragment key={index}>
              {/* Step Circle */}
              <View
                style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCompleted,
                  isActive && styles.stepActive,
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      (isActive || isCompleted) && styles.stepNumberActive,
                    ]}
                  >
                    {stepNumber}
                  </Text>
                )}
              </View>

              {/* Connector Line */}
              {!isLast && (
                <View
                  style={[
                    styles.connector,
                    isCompleted && styles.connectorCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Labels */}
      {labels.length > 0 && (
        <View style={styles.labelsRow}>
          {labels.map((label, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;

            return (
              <Text
                key={index}
                style={[
                  styles.label,
                  (isActive || isCompleted) && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      paddingVertical: 16,
      paddingHorizontal: 20,
    },
    stepsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    stepCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stepCompleted: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    stepActive: {
      borderColor: colors.primary,
      borderWidth: 2,
      shadowColor: colors.primary,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    stepNumber: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.secondaryText,
    },
    stepNumberActive: {
      color: colors.primary,
    },
    checkmark: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.primaryText,
    },
    connector: {
      flex: 1,
      height: 3,
      backgroundColor: colors.border,
      marginHorizontal: 8,
      borderRadius: 2,
      maxWidth: 60,
    },
    connectorCompleted: {
      backgroundColor: colors.primary,
    },
    labelsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 10,
      paddingHorizontal: 0,
    },
    label: {
      fontSize: 11,
      color: colors.secondaryText,
      textAlign: "center",
      flex: 1,
    },
    labelActive: {
      color: colors.primary,
      fontWeight: "600",
    },
  });

export default StepIndicator;
