import React, { useState } from "react";
import { View, Text, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "./FreeTimeHabits.styles";

interface Props {
  onNext?: (selectedHabits: string[]) => void;
}

const habitsList = [
  "Sport",
  "Painting",
  "Cooking",
  "Going Out",
  "Reading",
  "Gaming",
];

const FreeTimeHabits: React.FC<Props> = ({ onNext }) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleHabit = (habit: string) => {
    if (selected.includes(habit)) {
      setSelected(selected.filter((h) => h !== habit));
    } else {
      setSelected([...selected, habit]);
    }
  };

  const handleNext = () => {
    if (selected.length > 0) {
      onNext?.(selected);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.centerBox}>
        <Text style={styles.title}>Your Lifestyle Matters</Text>

        <Text style={styles.subtitle}>
          Tell us what you usually enjoy doing.
          This helps PupTime recommend activities that truly fit you and your pet.
        </Text>

        <View style={styles.grid}>
          {habitsList.map((habit) => {
            const isSelected = selected.includes(habit);

            return (
              <TouchableOpacity
                key={habit}
                activeOpacity={0.85}
                style={[
                  styles.habitCard,
                  isSelected && styles.habitCardSelected,
                ]}
                onPress={() => toggleHabit(habit)}
              >
                <Text
                  style={[
                    styles.habitText,
                    isSelected && styles.habitTextSelected,
                  ]}
                >
                  {habit}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.nextButton,
            selected.length === 0 && styles.nextDisabled,
          ]}
          disabled={selected.length === 0}
          onPress={handleNext}
        >
          <Text style={styles.nextText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default FreeTimeHabits;