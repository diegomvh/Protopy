# -*- coding: utf-8 -*-
from django.db import models
'''
Models del blog
'''

class SyncLog(models.Model):
    SYNC_STATUS = [["s", "Synced"], ["c", "Created"], ["m", "Modified"], ["d", "Deleted"], ["b", "Bogus"]]
    synced_at = models.DateTimeField(editable = False)
    sync_id = models.CharField(max_length = 512)

class SyncModel(models.Model):
    _sync_log = models.ForeignKey(SyncLog, null = True, blank = True, editable = False, serialize = False)
    _active = models.BooleanField(default = True, blank = True, editable = False, serialize = False)
    _status = models.CharField( max_length = 1, choices = SyncLog.SYNC_STATUS, editable = False, default = "c", serialize = False)
    server_pk = models.PositiveIntegerField(null = True, blank = True, editable = False, serialize = False)

class Tag(SyncModel):
    slug = models.SlugField(help_text = 'Automatically buit from the title', primary_key = True)
    title = models.CharField('Title', max_length = 30)
    def __unicode__(self):
        return self.title

class Post(SyncModel):
    slug = models.SlugField('Slug', primary_key = True)
    title = models.CharField('Title', max_length = 30)
    tags = models.ManyToManyField(Tag)
    date = models.DateTimeField('Date', auto_now = True)
    body = models.TextField('Body text')
    class Meta:
        ordering = ('-date', )

class Persona(models.Model):
    nombre = models.CharField(verbose_name = 'Nombre', max_length = 50)

class Empleado(Persona):
    sueldo = models.IntegerField()

class Jefe(Empleado):
    empleados = models.ManyToManyField(Empleado, related_name = 'jefes')