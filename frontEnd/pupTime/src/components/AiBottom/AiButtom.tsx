import React, { useRef } from "react";
import {
  Animated,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import createStyles from "./styles";
import useTheme from "../../Hooks/useTheme";

const { width: SCREEN_W } = Dimensions.get("window");
const BTN_SIZE = 65;

interface AiButtonProps {
  onPress?: () => void;
}

const AiButton: React.FC<AiButtonProps> = ({ onPress }) => {
  const { theme, colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          position: "absolute",
          left: (SCREEN_W / 2) - (BTN_SIZE / 2),
          bottom: Platform.OS === "ios" ? 35 : 25,
          zIndex: 100,
          transform: [{ scale }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.button}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Image
          source={theme === "dark" ? require("../../assets/Ai-icon-dark.png") : require("../../assets/Ai-icon-light.png")}
          style={styles.icon}
          resizeMode="cover"
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default AiButton;
