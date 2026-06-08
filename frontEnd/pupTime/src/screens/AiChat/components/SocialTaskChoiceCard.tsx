import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import dayjs from 'dayjs';
import { Users, Clock, CalendarClock, CheckCircle2 } from 'lucide-react-native';

import { SocialTaskSnapshot, SocialActionName } from '../../../types/aiConversation';
import useTheme from '../../../Hooks/useTheme';
import createSocialTaskChoiceCardStyles from './SocialTaskChoiceCard.styles';

interface SocialTaskChoiceCardProps {
  actionName: SocialActionName;
  snapshot: SocialTaskSnapshot;
  isExecuted?: boolean;
}

const SocialTaskChoiceCard: React.FC<SocialTaskChoiceCardProps> = ({
  actionName,
  snapshot,
  isExecuted = false,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createSocialTaskChoiceCardStyles(colors), [colors]);

  const isCreate = actionName === 'create_SocialTask';
  const headerLabel = isCreate ? 'New Social Task' : 'Update Social Task';

  const scheduledLabel = snapshot.scheduled_at
    ? dayjs(snapshot.scheduled_at).format('MMM D, YYYY · h:mm A')
    : 'No fixed time';

  const durationLabel = snapshot.duration_minutes != null
    ? `${snapshot.duration_minutes} min`
    : null;

  const hasSubTasks =
    Array.isArray(snapshot.sub_tasks) && snapshot.sub_tasks.length > 0;

  const hasDescription = !!snapshot.description?.trim();

  return (
    <View style={[styles.card, isExecuted && styles.cardExecuted]}>
      {/* ── Header strip ─────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Users size={18} color="#FFFFFF" />
        </View>

        <Text style={styles.headerLabel} numberOfLines={1}>
          {headerLabel}
        </Text>

        {isExecuted && (
          <View style={styles.executedBadgeHeader}>
            <Text style={styles.executedBadgeHeaderText}>Done ✓</Text>
          </View>
        )}
      </View>

      {/* ── Card body ─────────────────────────────────────── */}
      <View style={styles.body}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {snapshot.title || '(Untitled)'}
        </Text>

        {/* Pills row */}
        <View style={styles.pillsRow}>
          {/* Time pill */}
          <View style={styles.pill}>
            <CalendarClock size={14} color={colors.primaryDark} />
            <Text style={styles.pillText}>{scheduledLabel}</Text>
          </View>

          {/* Duration pill */}
          {durationLabel && (
            <View style={styles.pill}>
              <Clock size={14} color={colors.primaryDark} />
              <Text style={styles.pillText}>{durationLabel}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {hasDescription && (
          <Text style={styles.description} numberOfLines={3}>
            {snapshot.description}
          </Text>
        )}

        {/* Sub-tasks */}
        {hasSubTasks && (
          <>
            <View style={styles.divider} />
            <Text style={styles.subTasksLabel}>Sub-tasks</Text>

            {snapshot.sub_tasks!.map((st, idx) => {
              const stDuration = st.duration_minutes != null
                ? `${st.duration_minutes} min`
                : null;
              const stTime = st.scheduled_at
                ? dayjs(st.scheduled_at).format('h:mm A')
                : null;

              const metaParts = [stDuration, stTime].filter(Boolean).join(' · ');

              return (
                <View key={idx} style={styles.subTaskItem}>
                  <View style={styles.subTaskDot} />
                  <View style={styles.subTaskContent}>
                    <Text style={styles.subTaskTitle} numberOfLines={1}>
                      {st.title}
                    </Text>
                    {metaParts ? (
                      <Text style={styles.subTaskMeta}>{metaParts}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Executed checkmark row */}
        {isExecuted && (
          <>
            <View style={styles.divider} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <CheckCircle2 size={16} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                Social task created
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

export default SocialTaskChoiceCard;
