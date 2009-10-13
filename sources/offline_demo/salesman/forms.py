'''
Created on 21/09/2009

@author: defo
'''
from django.forms import ModelForm
from django.forms.models import inlineformset_factory

from models import *

class CiudadForm(ModelForm):
    class Meta:
        model = Ciudad 


class PedidoForm(ModelForm):
    class Meta:
        model = Pedido

class ItemPedidoForm(ModelForm):
    class Meta:
        model = ItemPedido
        #exclude = ('pedido', )


#inlineformset_factory(parent_model, 
#                        model, form, formset, fk_name, fields, exclude, 
#                        extra, can_order, can_delete, max_num, formfield_callback)(ItemPedidoForm,
PedidoConItemsForm = inlineformset_factory(Pedido, ItemPedido)