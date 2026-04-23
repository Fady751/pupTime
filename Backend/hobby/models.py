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