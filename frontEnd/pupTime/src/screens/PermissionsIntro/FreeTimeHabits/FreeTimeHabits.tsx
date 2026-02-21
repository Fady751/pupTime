import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StatusBar, ScrollView, ActivityIndicator, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { IntroStackParamList } from "../IntroNavigator";
import useTheme from "../../../Hooks/useTheme";
import createStyles from "./styles";
import StepIndicator from "../StepIndicator";
import { Category } from "../../../types/category";
import { Interests } from "../../../types/interests";
import { getCategories } from "../../../services/TaskService/syncService";
import { getInterests } from "../../../services/interestService/getInterests";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux/store";
import { changeUserInterest } from "../../../services/interestService/userService/changeUserInterests";
import { getUserInterest } from "../../../services/interestService/userService/getUserInterests";

const STEP_LABELS = ["Mic", "Notifications", "Interests"];

type Props = {
  navigation: NativeStackNavigationProp<IntroStackParamList, 'FreeTimeHabits'>;
};

const FreeTimeHabits: React.FC<Props> = ({ navigation }) => {
  const userInfo = useSelector((state: RootState) => state.user.data);
  const { theme, colors } = useTheme();
  const styles = createStyles(colors);
  const [selected, setSelected] = useState<number[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [interests, setInterests] = useState<Interests[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [categoriesData, interestsData, selectedData] = await Promise.all([
          getCategories(),
          getInterests(),
          getUserInterest({ user_id: userInfo?.id || 0 }),
        ]);
        setCategories(categoriesData);
        setInterests(interestsData);
        setSelected(selectedData.map(i => i.id));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [userInfo?.id]);

  const filteredInterests = selectedCategory === null
    ? interests
    : interests.filter(i => i.category.id === selectedCategory);

  const toggleInterest = useCallback((id: number) => {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter((h) => h !== id)
        : [...prev, id]
    );
  }, []);

  const renderInterestItem = useCallback(({ item: interest }: { item: Interests }) => {
    const isSelected = selected.includes(interest.id);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.habitCard,
          isSelected && styles.habitCardSelected,
        ]}
        onPress={() => toggleInterest(interest.id)}
      >
        <Text
          style={[
            styles.habitText,
            isSelected && styles.habitTextSelected,
          ]}
        >
          {interest.title}
        </Text>
        <Text
          style={[
            styles.categoryLabel,
            isSelected && styles.categoryLabelSelected,
          ]}
        >
          {interest.category.name}
        </Text>
      </TouchableOpacity>
    );
  }, [selected, styles, toggleInterest]);

  const keyExtractor = useCallback((item: Interests) => item.id.toString(), []);

  const handleNext = async () => {
    if (selected.length > 0 && userInfo?.id) {
      try {
        await changeUserInterest({
          user_id: userInfo.id,
          selected,
        });
        navigation.getParent()?.navigate('Home');
      } catch (error) {
        console.error("Error changing user interests:", error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <StepIndicator
        currentStep={3}
        totalSteps={3}
        colors={colors}
        labels={STEP_LABELS}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading interests...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInterests}
          renderItem={renderInterestItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Your Lifestyle Matters</Text>
                <Text style={styles.subtitle}>
                  Tell us what you usually enjoy doing.{"\n"}
                  This helps PupTime recommend activities that truly fit you and your pet.
                </Text>
              </View>

              {/* Category Filter */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoryFilter}
                contentContainerStyle={styles.categoryFilterContent}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    selectedCategory === null && styles.categoryChipSelected,
                  ]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === null && styles.categoryChipTextSelected,
                  ]}>
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category.id && styles.categoryChipSelected,
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory === category.id && styles.categoryChipTextSelected,
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No interests found in this category</Text>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            (selected.length === 0 || isLoading) && styles.nextDisabled,
          ]}
          disabled={selected.length === 0 || isLoading}
          onPress={handleNext}
        >
          <Text style={styles.nextText}>
            {selected.length > 0 ? `Continue (${selected.length} selected)` : "Select at least one"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default FreeTimeHabits;
