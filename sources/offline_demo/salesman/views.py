'''
Created on 21/09/2009

@author: defo
'''
from django.http import HttpRequest, HttpResponse
from models import *
from forms import *
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404, render_to_response

#----------------------------------------------------------
# CRUD Ciudad
#----------------------------------------------------------

def list_ciudad(request, per_page = None, from_page = None):
    paginator = Paginator(Ciudad.objects.all(), 10)
    return render_to_response('listado_ciudades.html', {'ciudades': paginator})

def view_ciudad(request, ciudad_id):
    ciudad = get_object_or_404(Ciudad, id =  ciudad_id)
    return render_to_response('')

def add_edit_ciudad(request, ciudad_id = None):
    ''' 
    Agregar una Ciudad
    '''
    ciudad = None
    if ciudad_id:
        ciudad = get_object_or_404(Ciudad, id = ciudad_id)
        
    if request.method == "GET":
        form = CiudadForm(instance = ciudad)
    elif request.method == "POST":
        form = CiudadForm(request.POST)
        if form.is_valid():
            form.save()
            return render_to_response('listado_ciudad.html')
        return render_to_response('forms.html', {'form': form})
            
    else:
        return HttpResponse("Method not supported",  401) 
