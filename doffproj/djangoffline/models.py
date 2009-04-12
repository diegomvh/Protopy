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