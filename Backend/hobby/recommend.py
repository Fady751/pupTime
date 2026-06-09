import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
from django.db.models import Q

from .models import Hobby
from friendship.models import Friendship, Status


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

