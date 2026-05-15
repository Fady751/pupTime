from typing import Iterable, List

from django.db import transaction

from Backend.ai_chat.ai_provider import get_ai_provider

from .models import Conversation, Message , UserMemory

from pydantic import BaseModel, Field

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage



class AIResponseParser(BaseModel):
    category: str = Field(..., description="The category of the fact, e.g., 'personal_info', 'preference', 'habit', or 'other'.")
    fact: str = Field(..., description="A brief statement of the fact, ideally under 20 words.")
    importance_score: int = Field(..., ge=1, le=10, description="An integer from 1 to 10 indicating how important or relevant this fact is for personalizing future interactions with the user.")

class FactExtractionResponse(BaseModel):
    facts: List[AIResponseParser] = Field(..., description="A list of extracted facts about the user.")

PROMPT_TEMPLATE = """
You are a helpful assistant that extracts factual information about the user from their conversation. 
Identify any statements in the conversation that reveal facts about the user's life, preferences, habits, or personality. 
Focus on things that would help personalize a productivity assistant (e.g., "I work better in the morning", "I hate coffee", "I have a cat named Luna").
The Messages are in the format of "role: content", where role is either "user" or "assistant".
For each fact you identify, categorize it into one of the following categories: "personal_info", "preference", "habit", or "other". 
I'll also send the existing facts we have about the user, so you can avoid repeating information we already know.
"""

def check_facts_in_conversation(conversation_id: str, user_id: int) -> bool:
    messages = Message.objects.filter(conversation_id=conversation_id).order_by('created_at')

    provider = get_ai_provider()
    structured_llm = provider._llm.with_structured_output(FactExtractionResponse)
    
    existing_facts = list(UserMemory.objects.filter(user_id=user_id).values_list('fact_content', flat=True))
    if existing_facts:
        existing_facts_text = "\n".join(existing_facts)
        existing_facts_prompt = f"Here are some facts we already know about the user:\n{existing_facts_text}\nOnly extract new facts that are not mentioned above."

    conversation_history_text = "\n".join([f"{message.role}: {message.content}" for message in messages])


    result = structured_llm.invoke([
        SystemMessage(content=PROMPT_TEMPLATE),
        SystemMessage(content=existing_facts_prompt),
        HumanMessage(content=conversation_history_text)
    ])
    
    facts_to_save = []
    for fact in result.facts:
        facts_to_save.append(UserMemory(
            user_id=user_id,
            fact_content=fact.fact,
            category=fact.category,
            importance_score=fact.importance_score
        ))
    try:
        with transaction.atomic():
            UserMemory.objects.bulk_create(facts_to_save)
    except Exception as e:
        print(f"Error occurred while saving facts: {e}")
        return False
    return True
