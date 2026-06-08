import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Choice, Action, SocialTaskSnapshot, SocialActionName } from '../../../types/aiConversation';
import { floorDateByTimezone, TaskTemplate } from '../../../types/task';
import Schedule from '../../../components/Schedule/Schedule';
import useTheme from '../../../Hooks/useTheme';
import createChoicePreviewStyles from './ChoicePreview.styles';
import { getTemplatesWithOverrides } from '../../../services/TaskService/syncService';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import uuid from 'react-native-uuid';
import SocialTaskChoiceCard from './SocialTaskChoiceCard';

interface ChoicePreviewProps {
  choice: Choice;
}

// ── Helpers ──────────────────────────────────────────────────
const SOCIAL_NAMES: SocialActionName[] = ['create_SocialTask', 'update_SocialTask'];

const isSocialAction = (a: Action): a is Extract<Action, { action_name: SocialActionName }> =>
  (SOCIAL_NAMES as string[]).includes(a.action_name);

const isTaskAction = (a: Action): a is Extract<Action, { action_name: 'create_TaskTemplate' | 'update_TaskTemplate' | 'update_TaskOverride' | 'delete_TaskTemplate' }> =>
  !isSocialAction(a);

// ─────────────────────────────────────────────────────────────

const ChoicePreview: React.FC<ChoicePreviewProps> = ({ choice }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createChoicePreviewStyles(colors), [colors]);
  const user = useSelector((state: RootState) => state.user.data);
  const user_id = user?.id;

  const actions: Action[] = useMemo(() => choice.actions_payload || [], [choice]);

  const taskActions = useMemo(() => actions.filter(isTaskAction), [actions]);
  const socialActions = useMemo(() => actions.filter(isSocialAction), [actions]);

  const isExecuted = choice.is_executed;

  // ── Task-preview state (only used when there are task actions) ──
  const [previewTasks, setPreviewTasks] = useState<TaskTemplate[]>([]);
  const [baseTasks, setBaseTasks] = useState<TaskTemplate[]>();
  const [dateStr, setDateStr] = useState<string>(floorDateByTimezone(new Date().toISOString()));
  const [nextDateStr, setNextDateStr] = useState<string>(floorDateByTimezone(new Date().toISOString()));

  useEffect(() => {
    if (taskActions.length === 0) return; // no task actions → skip

    let updatedTasks = baseTasks ? [...baseTasks] : [];
    console.log("Applying actions to base tasks for choice preview:", { baseTasks, taskActions });

    for (const action of taskActions) {
      if (action.action_name === 'create_TaskTemplate') {
        const new_TaskTemplate = action.task_snapshot as TaskTemplate;
        for (let i = 0; i < new_TaskTemplate.overrides.length; i++) {
          new_TaskTemplate.overrides[i].id = uuid.v4().toString();
          new_TaskTemplate.overrides[i].instance_datetime = new_TaskTemplate.overrides[i].date;
        }
        updatedTasks.unshift(new_TaskTemplate);
      }
      else if (action.action_name === 'update_TaskTemplate') {
        const new_TaskTemplate = action.task_snapshot as TaskTemplate;
        for (let i = 0; i < new_TaskTemplate.overrides.length; i++) {
          new_TaskTemplate.overrides[i].id = uuid.v4().toString();
          new_TaskTemplate.overrides[i].instance_datetime = new_TaskTemplate.overrides[i].date;
        }

        const index = updatedTasks.findIndex(t => t.id === action.task_snapshot.id);
        if (index !== -1) {
          const now = floorDateByTimezone(new Date().toISOString());
          const overrides = updatedTasks[index].overrides.filter(o => o.instance_datetime < now);
          overrides.push(...new_TaskTemplate.overrides);
          updatedTasks[index] = { ...updatedTasks[index], ...new_TaskTemplate, overrides };
        }
        else {
          updatedTasks.unshift(new_TaskTemplate);
        }
      }
      else if (action.action_name === 'delete_TaskTemplate') {
        updatedTasks = updatedTasks.filter(t => t.id !== action.task_snapshot.id);
      }
      else if (action.action_name === 'update_TaskOverride') {
        const new_TaskTemplate = action.task_snapshot as TaskTemplate;
        for (let i = 0; i < new_TaskTemplate.overrides.length; i++) {
          new_TaskTemplate.overrides[i].id = uuid.v4().toString();
          new_TaskTemplate.overrides[i].instance_datetime = new_TaskTemplate.overrides[i].date;
        }

        const index = updatedTasks.findIndex(t => t.id === action.task_snapshot.id);
        if (index !== -1) {
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
  }, [baseTasks, taskActions]);


  useEffect(() => {
    if (taskActions.length === 0) return; // no task actions → skip

    const loadBaseTasks = async () => {
      try {
        const tasks = (await getTemplatesWithOverrides({ user_id: user_id!, page: 1, page_size: 1000, start_date: dateStr, end_date: nextDateStr })).data;
        setBaseTasks(tasks);
      }
      catch (error) {
        console.error(error);
      }
    };
    loadBaseTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user_id, nextDateStr, taskActions.length]);

  const onMonthChange = (start_date: string, end_date: string) => {
    setDateStr(start_date);
    setNextDateStr(end_date);
  };

  const summary = useMemo(() => {
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let updatedOverrides = 0;

    for (const a of taskActions) {
      if (a.action_name === 'create_TaskTemplate') created += 1;
      else if (a.action_name === 'update_TaskTemplate') updated += 1;
      else if (a.action_name === 'delete_TaskTemplate') deleted += 1;
      else if (a.action_name === 'update_TaskOverride') updatedOverrides += 1;
    }

    return { created, updated, deleted, updatedOverrides };
  }, [taskActions]);

  const hasChanges = summary.created || summary.updated || summary.deleted || summary.updatedOverrides;

  return (
    <View style={styles.container}>
      {/* ── Task-template / override section ─────────────── */}
      {taskActions.length > 0 && (
        <>
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
        </>
      )}

      {/* ── Social-task cards ─────────────────────────────── */}
      {socialActions.map((action, idx) => (
        <SocialTaskChoiceCard
          key={idx}
          actionName={action.action_name as SocialActionName}
          snapshot={action.task_snapshot as SocialTaskSnapshot}
          isExecuted={isExecuted}
        />
      ))}
    </View>
  );
};
export default ChoicePreview;
