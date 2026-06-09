import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
} from 'lucide-react-native';

import { SocialActionName, SocialTaskParams, SocialTaskSnapshot } from '../../../types/aiConversation';
import { getUserProfileById } from '../../../services/friendshipService';
import useTheme from '../../../Hooks/useTheme';
import createSocialTaskChoiceCardStyles from './SocialTaskChoiceCard.styles';

// Enable layout animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Types ─────────────────────────────────────────────────────
type FriendInfo = { id: number; username: string };

interface SocialTaskChoiceCardProps {
  actionName: SocialActionName;
  snapshot: SocialTaskSnapshot;
  params: SocialTaskParams;
  isExecuted?: boolean;
}

// ── Avatar initial chip ───────────────────────────────────────
const AvatarChip: React.FC<{ name: string; size?: number; bgColor: string }> = ({
  name,
  size = 28,
  bgColor,
}) => {
  const initial = name.charAt(0).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
      }}>
      <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '700' }}>{initial}</Text>
    </View>
  );
};

// ── Main card ─────────────────────────────────────────────────
const SocialTaskChoiceCard: React.FC<SocialTaskChoiceCardProps> = ({
  actionName,
  snapshot,
  params,
  isExecuted = false,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createSocialTaskChoiceCardStyles(colors), [colors]);

  // ── Derived display values ────────────────────────────────
  const isCreate = actionName === 'create_SocialTask';
  const headerLabel = isCreate ? 'New Social Task' : 'Update Social Task';

  const scheduledLabel = snapshot.scheduled_at
    ? dayjs(snapshot.scheduled_at).format('MMM D, YYYY · h:mm A')
    : 'No fixed time';

  const durationLabel =
    snapshot.duration_minutes != null ? `${snapshot.duration_minutes} min` : null;

  const hasSubTasks = Array.isArray(snapshot.sub_tasks) && snapshot.sub_tasks.length > 0;
  const hasDescription = !!snapshot.description?.trim();

  // ── Friends ───────────────────────────────────────────────
  const participantIds: number[] = params.participant_ids ?? [];
  const hasFriends = participantIds.length > 0;

  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(hasFriends);
  const [expanded, setExpanded] = useState(false);

  // Fetch usernames for every participant_id
  useEffect(() => {
    if (!hasFriends) return;

    let cancelled = false;
    setFriendsLoading(true);

    Promise.all(participantIds.map(id => getUserProfileById(id)))
      .then(results => {
        if (cancelled) return;
        const resolved: FriendInfo[] = results
          .filter((u): u is NonNullable<typeof u> => u != null)
          .map(u => ({ id: u.id, username: u.username }));
        setFriends(resolved);
      })
      .catch(err => console.warn('[SocialTaskChoiceCard] failed to load friends', err))
      .finally(() => { if (!cancelled) setFriendsLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantIds.join(',')]);

  // Avatar background colours — cycle through a small palette
  const AVATAR_COLORS = ['#6366f1', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6'];
  const avatarColor = useCallback(
    (idx: number) => AVATAR_COLORS[idx % AVATAR_COLORS.length],
    [],
  );

  // ── Expand / collapse friends list ────────────────────────
  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  // ── Friend name list to display ───────────────────────────
  // While loading show placeholder text
  const firstFriendName = friendsLoading
    ? '…'
    : friends[0]?.username ?? `User #${participantIds[0]}`;

  const remainingCount = friends.length - 1;

  // ── Render ────────────────────────────────────────────────
  return (
    <View style={[styles.card, isExecuted && styles.cardExecuted]}>
      {/* ── Header strip ───────────────────────────────────── */}
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

      {/* ── Card body ──────────────────────────────────────── */}
      <View style={styles.body}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {snapshot.title || '(Untitled)'}
        </Text>

        {/* Pills row */}
        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <CalendarClock size={14} color={colors.primaryDark} />
            <Text style={styles.pillText}>{scheduledLabel}</Text>
          </View>

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

        {/* ── Invite friends section ──────────────────────── */}
        {hasFriends && (
          <>
            <View style={styles.divider} />

            {/* Collapsed row: always visible */}
            <TouchableOpacity
              style={styles.friendsRow}
              onPress={toggleExpanded}
              activeOpacity={0.7}>
              {/* Stacked avatars (show up to 3 even when collapsed) */}
              <View style={styles.avatarStack}>
                {(friendsLoading ? participantIds : friends).slice(0, 3).map((item, idx) => {
                  const name = friendsLoading
                    ? `${idx}`
                    : (item as FriendInfo).username;
                  return (
                    <View
                      key={idx}
                      style={[styles.avatarStackItem, { zIndex: 10 - idx, marginLeft: idx === 0 ? 0 : -8 }]}>
                      <AvatarChip name={name} bgColor={avatarColor(idx)} />
                    </View>
                  );
                })}
              </View>

              {/* Summary text */}
              <View style={styles.friendsSummaryText}>
                <Text style={styles.friendsRowLabel} numberOfLines={1}>
                  {friendsLoading
                    ? `Inviting ${participantIds.length} friend${participantIds.length > 1 ? 's' : ''}…`
                    : expanded
                    ? `${friends.length} friend${friends.length > 1 ? 's' : ''} invited`
                    : remainingCount > 0
                    ? `${firstFriendName} +${remainingCount} more`
                    : firstFriendName}
                </Text>
                <Text style={styles.friendsRowSub}>Tap to {expanded ? 'collapse' : 'see all'}</Text>
              </View>

              {/* Chevron */}
              {expanded ? (
                <ChevronUp size={16} color={colors.secondaryText} />
              ) : (
                <ChevronDown size={16} color={colors.secondaryText} />
              )}
            </TouchableOpacity>

            {/* Expanded list */}
            {expanded && (
              <View style={styles.friendsList}>
                {friends.map((friend, idx) => (
                  <View key={friend.id} style={styles.friendListItem}>
                    <AvatarChip name={friend.username} size={32} bgColor={avatarColor(idx)} />
                    <Text style={styles.friendListName}>@{friend.username}</Text>
                    {/* Pending invite indicator */}
                    <View style={styles.invitePendingBadge}>
                      <Text style={styles.invitePendingText}>Invited</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Sub-tasks section ───────────────────────────── */}
        {hasSubTasks && (
          <>
            <View style={styles.divider} />
            <Text style={styles.subTasksLabel}>Sub-tasks</Text>

            {snapshot.sub_tasks!.map((st, idx) => {
              const stDuration =
                st.duration_minutes != null ? `${st.duration_minutes} min` : null;
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

        {/* ── Executed state row ──────────────────────────── */}
        {isExecuted && (
          <>
            <View style={styles.divider} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <CheckCircle2 size={16} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>
                {hasFriends ? 'Social task created — invites sent' : 'Social task created'}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

export default SocialTaskChoiceCard;
