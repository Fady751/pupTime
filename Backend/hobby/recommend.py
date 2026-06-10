import logging
from datetime import timedelta, timezone as dt_timezone
from zoneinfo import ZoneInfo

import pandas as pd
from django.conf import settings
from django.db.models import Q
from django.utils import timezone
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors

from ai_chat.ai.provider import get_ai_provider
from ai_chat.models import UserMemory
from task.models import TaskOverride, TaskTemplate

from .models import Hobby
from friendship.models import Friendship, Status

logger = logging.getLogger(__name__)


def build_hobby_dataframe():
    hobbies = Hobby.objects.prefetch_related('tags').all()
    if not hobbies.exists():
        return None, None, None

    data = [
        {
            'id': hobby.id,
            'content': f"{hobby.name} {hobby.get_tags_display()}".lower(),
        }
        for hobby in hobbies
    ]

    df = pd.DataFrame(data)
    tfidf = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
    tfidf_matrix = tfidf.fit_transform(df['content'])

    return df, tfidf, tfidf_matrix


def map_recommended_hobbies(df, indices):
    hobby_ids = df['id'].iloc[indices].tolist()
    hobbies_by_id = {hobby.id: hobby for hobby in Hobby.objects.prefetch_related('tags').filter(id__in=hobby_ids)}
    return [hobbies_by_id[hid] for hid in hobby_ids if hid in hobbies_by_id]


def suggest_hobbies_by_seed(seed_text, num_recommendations=5, min_similarity=0.05):
    if not seed_text or not seed_text.strip():
        return []

    df, tfidf, tfidf_matrix = build_hobby_dataframe()
    if df is None:
        return []

    seed_vector = tfidf.transform([seed_text.lower()])
    knn = NearestNeighbors(n_neighbors=min(num_recommendations, len(df)), metric='cosine')
    knn.fit(tfidf_matrix)
    distances, indices = knn.kneighbors(seed_vector)

    recommendations = []
    for distance, index in zip(distances[0], indices[0]):
        similarity = 1 - distance
        if similarity >= min_similarity:
            recommendations.append((similarity, index))

    recommendations.sort(key=lambda item: item[0], reverse=True)
    recommended_indices = [index for _, index in recommendations[:num_recommendations]]

    return map_recommended_hobbies(df, recommended_indices)


def get_similar_friends_knn(user, friends_list, num_friends=3):
    if not friends_list:
        return []

    user_interests = " ".join([interest.title for interest in user.interests.all()]).lower()
    if not user_interests.strip():
        return friends_list

    contents = [user_interests]
    friend_contents = []
    valid_friends = []

    for friend in friends_list:
        interests = " ".join([interest.title for interest in friend.interests.all()]).lower()
        if interests.strip():
            friend_contents.append(interests)
            valid_friends.append(friend)

    if not friend_contents:
        return friends_list

    contents.extend(friend_contents)

    tfidf = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
    try:
        tfidf_matrix = tfidf.fit_transform(contents)
    except ValueError:
        return friends_list

    user_vector = tfidf_matrix[0]
    friend_matrix = tfidf_matrix[1:]
    knn = NearestNeighbors(n_neighbors=len(valid_friends), metric='cosine')
    knn.fit(friend_matrix)
    distances, indices = knn.kneighbors(user_vector)

    similar_friends = [valid_friends[idx] for idx in indices[0]]

    seen_ids = {f.id for f in similar_friends}
    for f in friends_list:
        if f.id not in seen_ids:
            similar_friends.append(f)

    return similar_friends


def calculate_friend_recommendations(user):
    friendships = Friendship.objects.filter(
        Q(sender=user) | Q(receiver=user),
        status=Status.ACCEPTED
    ).select_related('sender', 'receiver').prefetch_related('sender__interests', 'receiver__interests')

    if not friendships.exists():
        return []

    friends_list = [f.receiver if f.sender == user else f.sender for f in friendships]
    similar_friends = get_similar_friends_knn(user, friends_list)

    friend_interest_texts = []
    for friend in similar_friends:
        friend_interest_texts.extend([interest.title for interest in friend.interests.all()])

    seed_text = ' '.join(friend_interest_texts)
    if not seed_text.strip():
        return []

    return suggest_hobbies_by_seed(seed_text, num_recommendations=15)


def calculate_self_recommendations(user):
    user_interests = [interest.title for interest in user.interests.all()]
    seed_text = ' '.join(user_interests)
    if not seed_text.strip():
        return []

    return suggest_hobbies_by_seed(seed_text, num_recommendations=15)


def find_friends_associated_with_hobby(hobby, similar_friends):
    associated = []
    hobby_content = f"{hobby.name} {hobby.get_tags_display()}".lower()

    for friend in similar_friends:
        friend_interests = [interest.title.lower() for interest in friend.interests.all()]
        match = False
        for interest in friend_interests:
            if interest in hobby_content or hobby_content in interest:
                match = True
                break
            interest_words = {w for w in interest.split() if len(w) > 3}
            hobby_words = {w for w in hobby_content.split() if len(w) > 3}
            if interest_words & hobby_words:
                match = True
                break
        if match:
            associated.append(friend)

    return associated


def _merged_busy_intervals(user, start_dt, end_dt):
    overrides = (
        TaskOverride.objects
        .filter(task__user=user, is_deleted=False)
        .filter(
            Q(instance_datetime__gte=start_dt, instance_datetime__lte=end_dt) |
            Q(new_datetime__gte=start_dt,      new_datetime__lte=end_dt)
        )
        .exclude(status__in=[TaskOverride.STATUS_SKIPPED, TaskOverride.STATUS_FAILED])
        .select_related('task')
    )

    raw = []
    for ov in overrides:
        ov_start = (
            ov.new_datetime
            if ov.status == TaskOverride.STATUS_RESCHEDULED and ov.new_datetime
            else ov.instance_datetime
        )
        if not ov_start:
            continue
        ov_end = ov_start + timedelta(minutes=ov.task.duration_minutes or 30)
        s, e = max(ov_start, start_dt), min(ov_end, end_dt)
        if s < e:
            raw.append((s, e))
    raw.sort(key=lambda x: x[0])
    merged = []
    for s, e in raw:
        if merged and s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return merged


def get_free_time_slots(user, count=3, duration_minutes=120):
    now = timezone.now()
    start_dt = now
    end_dt = now + timedelta(days=3)
    slot_delta = timedelta(minutes=duration_minutes)

    merged = _merged_busy_intervals(user, start_dt, end_dt)

    slots = []
    curr  = start_dt
    idx   = 0
    n     = len(merged)

    while len(slots) < count:
       
        while idx < n and merged[idx][1] <= curr:
            idx += 1

        if idx < n and merged[idx][0] < curr + slot_delta:
           
            curr = merged[idx][1]
            idx += 1
        else:

            slots.append(curr)
            curr += slot_delta

    return slots


def _user_timezone(user):
    tzname = (
        TaskTemplate.objects
        .filter(user=user, is_deleted=False)
        .exclude(timezone='')
        .values_list('timezone', flat=True)
        .first()
    ) or getattr(settings, 'TIME_ZONE', 'UTC')
    try:
        return ZoneInfo(tzname)
    except Exception:
        return ZoneInfo('UTC')


def _time_of_day_label(local_dt):
    hour = local_dt.hour
    if hour < 12:
        return 'morning'
    if hour < 17:
        return 'afternoon'
    if hour < 21:
        return 'evening'
    return 'night'


def _slot_label(slot, tz):
    local = slot.astimezone(tz)
    return f"{local:%A %Y-%m-%d %H:%M} ({_time_of_day_label(local)})"


def _build_candidate_slots(user, duration_minutes=60, days=3, hours=(9, 12, 15, 18, 21)):
    now = timezone.now()
    end_dt = now + timedelta(days=days)
    slot_delta = timedelta(minutes=duration_minutes)
    tz = _user_timezone(user)
    busy = _merged_busy_intervals(user, now, end_dt)

    def overlaps_busy(start):
        end = start + slot_delta
        return any(start < be and bs < end for bs, be in busy)

    now_local = now.astimezone(tz)
    candidates = []
    for day_offset in range(days):
        day = now_local + timedelta(days=day_offset)
        for hour in hours:
            local_start = day.replace(hour=hour, minute=0, second=0, microsecond=0)
            start = local_start.astimezone(dt_timezone.utc)
            if start < now or start + slot_delta > end_dt:
                continue
            if overlaps_busy(start):
                continue
            candidates.append(start)

    candidates.sort()
    return candidates


class _SlotAssignment(BaseModel):
    hobby_index: int = Field(..., description="Index of the hobby from the provided list.")
    slot_index: int = Field(..., description="Index of the chosen free slot from the provided list.")


class _SlotRanking(BaseModel):
    assignments: list[_SlotAssignment] = Field(
        ..., description="One assignment per hobby, mapping each hobby to its best free slot."
    )


_RANKING_SYSTEM_PROMPT = (
    "You are a scheduling assistant. Pick the best free time slot for each hobby, "
    "using what is known about the user's habits and preferences. "
    "Only choose from the provided slots, give each hobby a distinct slot, and "
    "return exactly one assignment per hobby using the given indices."
)


def _build_ranking_prompt(hobby_names, candidate_slots, facts, tz):
    facts_text = "\n".join(f"- {fact.fact_content}" for fact in facts)
    slots_text = "\n".join(
        f"[{idx}] {_slot_label(slot, tz)}" for idx, slot in enumerate(candidate_slots)
    )
    hobbies_text = "\n".join(f"[{idx}] {name}" for idx, name in enumerate(hobby_names))
    return (
        "Facts known about the user:\n"
        f"{facts_text}\n\n"
        "Available free time slots (already conflict-free):\n"
        f"{slots_text}\n\n"
        "Hobbies to schedule:\n"
        f"{hobbies_text}\n\n"
        "Assign one slot to each hobby, preferring times that fit the user's "
        "habits and preferences. Each hobby must get a distinct slot."
    )


def _rank_slots_with_ai(hobby_names, candidate_slots, facts, tz):
    provider = get_ai_provider()
    structured_llm = provider._llm.with_structured_output(_SlotRanking)
    prompt = _build_ranking_prompt(hobby_names, candidate_slots, facts, tz)

    result = structured_llm.invoke([
        SystemMessage(content=_RANKING_SYSTEM_PROMPT),
        HumanMessage(content=prompt),
    ])

    ranking = [None] * len(hobby_names)
    for assignment in result.assignments:
        if 0 <= assignment.hobby_index < len(hobby_names):
            ranking[assignment.hobby_index] = assignment.slot_index
    return ranking


def _assign_slots(num_hobbies, candidate_slots, ranking, user, duration_minutes):
    result = []
    used = set()

    def next_unused():
        for idx in range(len(candidate_slots)):
            if idx not in used:
                return idx
        return None

    for hobby_idx in range(num_hobbies):
        chosen = None
        if ranking and hobby_idx < len(ranking):
            cand_idx = ranking[hobby_idx]
            if isinstance(cand_idx, int) and 0 <= cand_idx < len(candidate_slots) and cand_idx not in used:
                chosen = cand_idx
        if chosen is None:
            chosen = next_unused()
        if chosen is None:
            break
        used.add(chosen)
        result.append(candidate_slots[chosen])

    if len(result) < num_hobbies:
        result.extend(get_free_time_slots(user, count=num_hobbies - len(result), duration_minutes=duration_minutes))

    return result


def suggest_time_slots(user, hobbies, duration_minutes=60):
    """Pick a start time per hobby, letting the AI rank conflict-free candidate
    slots against what we know about the user. Falls back to the earliest free
    slots when there are no learned facts or the AI call fails."""
    hobbies = list(hobbies)
    if not hobbies:
        return []

    candidate_slots = _build_candidate_slots(user, duration_minutes=duration_minutes)
    if not candidate_slots:
        return get_free_time_slots(user, count=len(hobbies), duration_minutes=duration_minutes)

    facts = list(
        UserMemory.objects
        .filter(user=user, category__in=['habit', 'preference'])
        .order_by('-importance_score')[:20]
    )

    ranking = None
    if facts:
        hobby_names = [getattr(hobby, 'name', str(hobby)) for hobby in hobbies]
        tz = _user_timezone(user)
        try:
            ranking = _rank_slots_with_ai(hobby_names, candidate_slots, facts, tz)
        except Exception:
            logger.exception("AI slot ranking failed; falling back to earliest free slots")
            ranking = None

    return _assign_slots(len(hobbies), candidate_slots, ranking, user, duration_minutes)