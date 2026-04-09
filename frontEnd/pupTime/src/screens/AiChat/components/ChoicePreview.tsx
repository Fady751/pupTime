import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Choice, Action } from '../../../types/aiConversation';
import { floorDateByTimezone, TaskTemplate } from '../../../types/task';
import Schedule from '../../../components/Schedule/Schedule';
import useTheme from '../../../Hooks/useTheme';
import createChoicePreviewStyles from './ChoicePreview.styles';
import { getTemplatesWithOverrides } from '../../../services/TaskService/syncService';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import uuid from 'react-native-uuid';

interface ChoicePreviewProps {
  choice: Choice;
}

const ChoicePreview: React.FC<ChoicePreviewProps> = ({ choice }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createChoicePreviewStyles(colors), [colors]);
  const user = useSelector((state: RootState) => state.user.data);
  const user_id = user?.id;

  const actions: Action[] = useMemo(() => choice.actions_payload || [], [choice]);

  const [previewTasks, setPreviewTasks] = useState<TaskTemplate[]>([]);

  const [baseTasks, setBaseTasks] = useState<TaskTemplate[]>();

  const [dateStr, setDateStr] = useState<string>(floorDateByTimezone(new Date().toISOString()));
  const [nextDateStr, setNextDateStr] = useState<string>(floorDateByTimezone(new Date().toISOString()));

  useEffect(() => {
      let updatedTasks = baseTasks ? [...baseTasks] : [];
      console.log("Applying actions to base tasks for choice preview:", { baseTasks, actions });
      // console.log("from date and to date for choice preview:", dateStr, nextDateStr);
      // console.log("Applying actions to base tasks for choice preview:", { updatedTasks, actions });
      for (const action of actions) {
        if(action.action_name === 'create_TaskTemplate') {
          const new_TaskTemplate = action.task_snapshot as TaskTemplate;
          for (let i = 0; i < new_TaskTemplate.overrides.length; i++) {
            new_TaskTemplate.overrides[i].id = uuid.v4().toString();
            new_TaskTemplate.overrides[i].instance_datetime = new_TaskTemplate.overrides[i].date;
          }
          updatedTasks.unshift(new_TaskTemplate);
        }
        else if(action.action_name === 'update_TaskTemplate') {
          const new_TaskTemplate = action.task_snapshot as TaskTemplate;
          for (let i = 0; i < new_TaskTemplate.overrides.length; i++) {
            new_TaskTemplate.overrides[i].id = uuid.v4().toString();
            new_TaskTemplate.overrides[i].instance_datetime = new_TaskTemplate.overrides[i].date;
          }

          const index = updatedTasks.findIndex(t => t.id === action.task_snapshot.id);
          if(index !== -1) {
            const now = floorDateByTimezone(new Date().toISOString());
            const overrides = updatedTasks[index].overrides.filter(o => o.instance_datetime < now);
            overrides.push(...new_TaskTemplate.overrides);
            updatedTasks[index] = { ...updatedTasks[index], ...new_TaskTemplate, overrides };
          }
          else {
            updatedTasks.unshift(new_TaskTemplate);
          }
        }
        else if(action.action_name === 'delete_TaskTemplate') {
          updatedTasks = updatedTasks.filter(t => t.id !== action.task_snapshot.id);
        }
        else if (action.action_name === 'update_TaskOverride') {
          // const new_TaskTemplate = action.task_snapshot as TaskTemplate;
          // console.log("debugging action: ", action);
          // continue For now, we will just apply the TaskTemplate changes.
          const new_TaskTemplate = action.task_snapshot as TaskTemplate;
          for (let i = 0; i < new_TaskTemplate.overrides.length; i++) {
            new_TaskTemplate.overrides[i].id = uuid.v4().toString();
            new_TaskTemplate.overrides[i].instance_datetime = new_TaskTemplate.overrides[i].date;
          }

          const index = updatedTasks.findIndex(t => t.id === action.task_snapshot.id);
          if(index !== -1) {
            const now = floorDateByTimezone(new Date().toISOString());
            const overrides = updatedTasks[index].overrides.filter(o => o.instance_datetime < now);
            overrides.push(...new_TaskTemplate.overrides);
            updatedTasks[index] = { ...updatedTasks[index], ...new_TaskTemplate, overrides };
          }
          else {
            updatedTasks.unshift(new_TaskTemplate);
          }
        }
      }
      setPreviewTasks(updatedTasks);
  }, [baseTasks, actions]);


  useEffect(() => {
    const loadBaseTasks = async () => {
      try {
        const tasks = (await getTemplatesWithOverrides({ user_id: user_id!, page: 1, page_size: 1000, start_date: dateStr, end_date: nextDateStr })).data;
        setBaseTasks(tasks);
      }
      catch (error) {
        console.error(error);
      }
    }
    loadBaseTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user_id, nextDateStr]);

  const onMonthChange = (start_date: string, end_date: string) => {
    setDateStr(start_date);
    setNextDateStr(end_date);
  };

  const summary = useMemo(() => {
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let updatedOverrides = 0;

    for (const a of actions) {
      if (a.action_name === 'create_TaskTemplate') created += 1;
      else if (a.action_name === 'update_TaskTemplate') updated += 1;
      else if (a.action_name === 'delete_TaskTemplate') deleted += 1;
      else if (a.action_name === 'update_TaskOverride') updatedOverrides += 1;
    }

    return { created, updated, deleted, updatedOverrides };
  }, [actions]);

  const hasChanges = summary.created || summary.updated || summary.deleted || summary.updatedOverrides;

  // console.log("tasks in choice preview:", previewTasks);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Proposed changes</Text>

      <Text style={styles.summaryText}>
        {hasChanges ? (
          [
            summary.created ? `+${summary.created} new` : null,
            summary.updated ? `${summary.updated} edited` : null,
            summary.updatedOverrides ? `${summary.updatedOverrides} change` : null,
            summary.deleted ? `${summary.deleted} removed` : null,
          ]
            .filter(Boolean)
            .join(' · ')
        ) : (
          'No task changes in this option.'
        )}
      </Text>

      <View style={styles.scheduleWrapper}>
        <Schedule tasks={previewTasks} onMonthChange={onMonthChange} embedded />
      </View>
    </View>
  );
};
export default ChoicePreview;
