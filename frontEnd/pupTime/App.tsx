import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import Root from './src/navigation/Root';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import useTheme from './src/Hooks/useTheme';

const App = () => {
  const { colors } = useTheme();

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <Root />
      </GestureHandlerRootView>
    </Provider>
  );
};

export default App;




