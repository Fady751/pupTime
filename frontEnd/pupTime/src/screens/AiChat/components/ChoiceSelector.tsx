import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Choice } from '../../../types/aiConversation';
import { TaskTemplate } from '../../../types/task';
import ChoicePreview from './ChoicePreview';
import useTheme from '../../../Hooks/useTheme';
import createChoiceSelectorStyles from './ChoiceSelector.styles';

interface ChoiceSelectorProps {
    choices: Choice[];
    onSelect: (choice: Choice) => void;
    executedChoiceId?: string; // If one is executed, pass its ID
}

const ChoiceSelector: React.FC<ChoiceSelectorProps> = ({ choices, onSelect, executedChoiceId }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const { colors } = useTheme();
    const styles = useMemo(() => createChoiceSelectorStyles(colors), [colors]);

    // If a choice is executed, we should probably default to showing that one
    useEffect(() => {
        if (executedChoiceId) {
            const index = choices.findIndex(c => c.id === executedChoiceId);
            if (index !== -1) setActiveIndex(index);
        }
    }, [executedChoiceId, choices]);

    const activeChoice = choices[activeIndex];
    const isExecuted = !!executedChoiceId;

    return (
        <View style={styles.container}>
            {/* Tabs for choices */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
                {choices.map((choice, index) => {
                    const isSelected = index === activeIndex;
                    const isTheExecutedOne = choice.id === executedChoiceId;
                    
                    return (
                        <TouchableOpacity
                            key={choice.id}
                            style={[
                                styles.tab,
                                isSelected && styles.activeTab,
                                isExecuted && isTheExecutedOne && styles.executedTab,
                            ]}
                            onPress={() => setActiveIndex(index)}
                        >
                            <Text style={[
                                styles.tabText,
                                isSelected && styles.activeTabText,
                                isExecuted && isTheExecutedOne && styles.executedTabText
                            ]}>
                                Option {index + 1}
                                {isExecuted && isTheExecutedOne ? " (Selected)" : ""}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Preview Area */}
            {activeChoice && (
                <View style={styles.previewContainer}>
                    <ChoicePreview 
                        choice={activeChoice}
                        // Could pass actions from choice.actions_payload here
                    />
                    
                    {!isExecuted && (
                        <TouchableOpacity 
                            style={styles.selectButton} 
                            onPress={() => onSelect(activeChoice)}
                        >
                            <Text style={styles.selectButtonText}>Select Option {activeIndex + 1}</Text>
                        </TouchableOpacity>
                    )}
                    
                     {isExecuted && activeChoice.id === executedChoiceId && (
                        <View style={styles.executedBadge}>
                            <Text style={styles.executedBadgeText}>Selected</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};
export default ChoiceSelector;
