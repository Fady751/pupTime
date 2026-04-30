from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import librosa
import torch
from transformers import pipeline
import io

print("Loading Wav2Vec2 Model...")
classifier = pipeline("audio-classification", model="m3hrdadfi/wav2vec2-lg-xlsr-en-speech-emotion-recognition")

def index(request):
    return render(request, 'index.html')

@csrf_exempt
def analyze_emotion(request):
    if request.method == 'POST' and request.FILES.get('file'):
        audio_file = request.FILES['file']
        
        audio_data, _ = librosa.load(io.BytesIO(audio_file.read()), sr=16000)
        
        predictions = classifier(audio_data)
        
        return JsonResponse({"emotions": predictions})
    
    return JsonResponse({"error": "Invalid request"}, status=400)