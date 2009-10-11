'''
Created on 21/09/2009

@author: defo
'''
from django.http import HttpRequest, HttpResponse
from models import *
from forms import *
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404, render_to_response
from django.shortcuts import render_to_response
from offline_demo.salesman.forms import PedidoConItemsForm
#----------------------------------------------------------
# CRUD Ciudad
#----------------------------------------------------------

def view_ciudad(request, ciudad_id):
    ciudad = get_object_or_404(Ciudad, id =  ciudad_id)
    return render_to_response('salesman/ver_ciudad.html', locals())


def pedido_con_items(request, object_id = None, **kwargs):
    form = PedidoForm()
    formset = PedidoConItemsForm()
    #from ipdb import set_trace; set_trace()
    return render_to_response('salesman/pedido_form.html', locals())