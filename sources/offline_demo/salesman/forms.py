'''
Created on 21/09/2009

@author: defo
'''
from django.forms import ModelForm
from models import *

class CiudadForm(ModelForm):
    class Meta:
        model = Ciudad 



