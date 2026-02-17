import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/redux/store';
import Root from './src/navigation/Root';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { taskService } from './src/DB/taskService';
import useTheme from './src/Hooks/useTheme';

const App = () => {
  const { colors } = useTheme();
  useEffect(() => {
    // Initialize database on app start
    const initDatabase = async () => {
      try {
        await taskService.initialize();
      } catch (error) {
        console.error('[App] Failed to initialize database:', error);
      }
    };
    initDatabase();
  }, []);

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <Root />
      </GestureHandlerRootView>
    </Provider>
  );
};

export default App;




