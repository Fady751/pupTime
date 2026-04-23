import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from .models import Hobby

def suggest_hobbies(hobby_id, num_recommendations):

    all_hobbies = Hobby.objects.all()
    if not all_hobbies.exists():
        return []

    data = [
        {
            'id': h.id, 
            'content': f"{h.name} {h.get_tags_display()}".lower() 
        } 
        for h in all_hobbies
        
    ]

    df = pd.DataFrame(data)
   
    tfidf = TfidfVectorizer(stop_words='english', ngram_range=(1, 1))
    tfidf_matrix = tfidf.fit_transform(df['content'])

    cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)

    try:
        idx = df.index[df['id'] == hobby_id].tolist()[0]
    except IndexError:
        return []

    sim_scores = list(enumerate(cosine_sim[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)

    sim_scores = [s for s in sim_scores[1:num_recommendations+1] if s[1] > 0.05]
    
    hobby_indices = [i[0] for i in sim_scores]
    recommended_ids = df['id'].iloc[hobby_indices].tolist()


    hobbies_dict = {h.id: h for h in Hobby.objects.filter(id__in=recommended_ids)}
    
    sorted_recommendations = [hobbies_dict[hid] for hid in recommended_ids if hid in hobbies_dict]

    return sorted_recommendations