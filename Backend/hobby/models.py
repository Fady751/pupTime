from django.db import models


class Tag(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Hobby(models.Model):
    name = models.CharField(max_length=100)
    tags = models.ManyToManyField('Tag', blank=True)

    def __str__(self):
        return self.name

    def get_tags_display(self):
        return " ".join([tag.name for tag in self.tags.all()])


class HobbyRecommendation(models.Model):
    user = models.ForeignKey('user.User', on_delete=models.CASCADE, related_name='hobby_recommendations')
    rec_type = models.CharField(max_length=10, choices=[('friend', 'Friend-based'), ('self', 'Self-based')])
    hobbies = models.ManyToManyField('Hobby')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'rec_type')


from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

@receiver(post_save, sender=Hobby)
@receiver(post_delete, sender=Hobby)
def hobby_changed_handler(sender, instance, **kwargs):
    from .tasks import update_all_hobby_recommendations
    update_all_hobby_recommendations.delay()
