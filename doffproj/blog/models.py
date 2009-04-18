from django.db import models
'''
Models del blog
'''
class Tag(models.Model):
    slug = models.SlugField(help_text = 'Automatically buit from the title', primary_key = True, editable = False)
    title = models.CharField('Title', max_length = 30)
    def __unicode__(self):
        return self.title
    
class Post(models.Model):
    slug = models.SlugField('Slug', primary_key = True, editable = False)
    tags = models.ManyToManyField(Tag)
    title = models.CharField('Title', max_length = 30)
    date = models.DateTimeField('Date', editable = False, auto_now = True)
    body = models.TextField('Body text')
    class Meta:
        ordering = ('-date', )
