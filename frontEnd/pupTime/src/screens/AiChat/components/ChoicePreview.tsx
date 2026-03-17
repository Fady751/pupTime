import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Choice, Action } from '../../../types/aiConversation';
import { TaskTemplate } from '../../../types/task';
import Schedule from '../../../components/Schedule/Schedule';
import useTheme from '../../../Hooks/useTheme';
import createChoicePreviewStyles from './ChoicePreview.styles';

interface ChoicePreviewProps {
  choice: Choice;
  baseTasks: TaskTemplate[];
}

const cloneTasks = (tasks: TaskTemplate[]): TaskTemplate[] => {
  return tasks.map((t) => ({
    ...t,
    overrides: Array.isArray(t.overrides) ? [...t.overrides] : [],
  }));
};

const applyAction = (tasks: TaskTemplate[], action: Action): TaskTemplate[] => {
  const { action_name, params } = action;

  // Fallback if params is not an object
  if (!params || typeof params !== 'object') {
    return tasks;
  }

  const data: any = params;

  switch (action_name) {
    case 'create_task': {
      const newTask: TaskTemplate = {
        ...(data as TaskTemplate),
        overrides: Array.isArray((data as TaskTemplate).overrides)
          ? [...(data as TaskTemplate).overrides]
          : [],
      };
      return [...tasks, newTask];
    }

    case 'update_task': {
      const targetId = data.id;
      if (!targetId) return tasks;
      return tasks.map((t) =>
        t.id === targetId
          ? ({
              ...t,
              ...(data as Partial<TaskTemplate>),
            } as TaskTemplate)
          : t,
      );
    }

    case 'delete_task': {
      const targetId = data.id;
      if (!targetId) return tasks;
      return tasks.filter((t) => t.id !== targetId);
    }

    default:
      // Unknown action type – ignore for preview
      return tasks;
  }
};

const ChoicePreview: React.FC<ChoicePreviewProps> = ({ choice, baseTasks }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createChoicePreviewStyles(colors), [colors]);

  const actions = choice.actions_payload || [];

  const previewTasks = useMemo(() => {
    let working = cloneTasks(baseTasks);
    for (const action of actions) {
      working = applyAction(working, action);
    }
    return working;
  }, [baseTasks, actions]);

  const summary = useMemo(() => {
    let created = 0;
    let updated = 0;
    let deleted = 0;

    for (const a of actions) {
      if (a.action_name === 'create_task') created += 1;
      else if (a.action_name === 'update_task') updated += 1;
      else if (a.action_name === 'delete_task') deleted += 1;
    }

    return { created, updated, deleted };
  }, [actions]);

  const hasChanges = summary.created || summary.updated || summary.deleted;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Proposed changes</Text>

      <Text style={styles.summaryText}>
        {hasChanges ? (
          [
            summary.created ? `+${summary.created} new` : null,
            summary.updated ? `${summary.updated} edited` : null,
            summary.deleted ? `${summary.deleted} removed` : null,
          ]
            .filter(Boolean)
            .join(' · ')
        ) : (
          'No task changes in this option.'
        )}
      </Text>

      <View style={styles.scheduleWrapper}>
        <Schedule tasks={previewTasks} embedded />
      </View>
    </View>
  );
};
export default ChoicePreview;
