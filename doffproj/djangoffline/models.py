# -*- coding: utf-8 -*-
from django.db import models

# Create your models here.

MAX_APP_NAME_LENGTH = 160

class OfflineApp(models.Model):
    '''
    This model holds information about the offline apps
    '''
    app_name = models.CharField(max_length = MAX_APP_NAME_LENGTH)
    
 
 
class Log(models.Model):
    '''
    Log:
        Uso para la sincronización.
    '''
    pass   
#class BaseModelProxy(m):


class Manifest(models.Model):
    from pickle import dumps, loads
    version = models.PositiveIntegerField(default = 1)
    content = models.TextField(editable = False)
    
    
    def __init__(self, *largs, **kwargs):
        super(Manifest, self).__init__(*largs, **kwargs)
        self.entries = []
    
    def add_entry(self, **kwargs):
        assert kwargs,"Entries can't be null"
        assert all( lambda x: x in self.VALID_KEYS, kwargs.keys()),\
            "Ilegal key(s)"
        self.entries += kwargs
        