from django.db import models
    
class Task(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    completed = models.BooleanField(default=False)

    def __str__(self):
        return self.title

class TaskRepetition(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='repetitions')
    name = models.CharField(max_length=100, unique=True)
    
    class Meta:
        verbose_name_plural = 'Task Repetitions'
        ordering = ['name']

    def __str__(self):
        return self.name