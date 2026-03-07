import os
import django
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PUPtime.settings')
django.setup()

from task.models import TaskTemplate, TaskOverride
from user.models import User
from task.utils import generate_overrides_for_task

def test_overrides():
    print("--- Starting Test ---")
    # 1. Get or create a user
    user = User.objects.first()
    if not user:
        # In case the custom User model requires different fields
        try:
            user = User.objects.create(email="test@example.com", username="testuser_123")
        except:
            user = User.objects.create(email="test@example.com")
            
    # 2. Create a recurring task with microseconds (e.g. from frontend)
    start_dt = timezone.now().replace(microsecond=500000)
    task = TaskTemplate.objects.create(
        user=user,
        title="Test Task Microseconds Fix",
        start_datetime=start_dt,
        is_recurring=True,
        rrule="FREQ=DAILY;COUNT=3"
    )
    
    print(f"Created TaskTemplate id={task.id}")
    print(f"Task start_datetime: {task.start_datetime}")
    
    # 3. Generate overrides for the first time
    print("\n--- Generating overrides (Run 1) ---")
    generate_overrides_for_task(task)
    
    overrides = TaskOverride.objects.filter(task=task)
    count_1 = overrides.count()
    print(f"Overrides created: {count_1}")
    for o in overrides:
        print(f" - ID: {o.id} | Datetime: {o.instance_datetime}")
        
    # 4. Try generating overrides again to simulate another request
    print("\n--- Generating overrides (Run 2) - Expecting 0 new overrides ---")
    generate_overrides_for_task(task)
    
    overrides_new = TaskOverride.objects.filter(task=task)
    count_2 = overrides_new.count()
    print(f"Overrides total now: {count_2}")
    
    if count_1 == count_2:
        print("\n✅ SUCCESS! No duplicate overrides were created.")
    else:
        print("\n❌ FAILED! Duplicates were created.")
        
    # 5. Clean up
    print("\n--- Cleaning up ---")
    task.delete()
    print("Test finished.")

if __name__ == '__main__':
    test_overrides()
