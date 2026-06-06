import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics import accuracy_score

from .models import Hobby


#getting all data informate id , content (name + tags) and then creating a dataframe
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


#return the result of similarity and knn
def map_recommended_hobbies(df, indices):
    hobby_ids = df['id'].iloc[indices].tolist()
    hobbies_by_id = {hobby.id: hobby for hobby in Hobby.objects.prefetch_related('tags').filter(id__in=hobby_ids)}
    return [hobbies_by_id[hid] for hid in hobby_ids if hid in hobbies_by_id]


#main func
def suggest_similar_hobbies(hobby_id, num_recommendations=5, min_similarity=0.05):
    df, tfidf, tfidf_matrix = build_hobby_dataframe()
    if df is None:
        return []

    try:
        hobby_index = df.index[df['id'] == hobby_id].tolist()[0]
    except IndexError:
        return []

    knn = NearestNeighbors(n_neighbors=min(num_recommendations + 1, len(df)), metric='cosine')
    knn.fit(tfidf_matrix)
    distances, indices = knn.kneighbors(tfidf_matrix[hobby_index])

    recommendations = []
    for distance, index in zip(distances[0], indices[0]):
        if index == hobby_index:
            continue
        similarity = 1 - distance
        if similarity >= min_similarity:
            recommendations.append((similarity, index))

    recommendations.sort(key=lambda item: item[0], reverse=True)
    recommended_indices = [index for _, index in recommendations[:num_recommendations]]

    recs = map_recommended_hobbies(df, recommended_indices)
    return recs


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


def suggest_hobbies_from_friend_interests(friend_users, num_recommendations=5, min_similarity=0.05):
    friend_interest_texts = []
    for friend in friend_users:
        if hasattr(friend, 'interests'):
            friend_interest_texts.extend([interest.title for interest in friend.interests.all()])

    seed_text = ' '.join(friend_interest_texts)
    if not seed_text:
        return []

    return suggest_hobbies_by_seed(seed_text, num_recommendations=num_recommendations, min_similarity=min_similarity)
