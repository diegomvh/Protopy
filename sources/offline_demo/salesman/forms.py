'''
Created on 21/09/2009

@author: defo
'''
from django.forms import ModelForm, formsets

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
        exclude = ('pedido', )



PedidoConItemsForm = formsets.formset_factory(ItemPedidoForm,
                                              extra = 3,
                                              ) #formset, extra, can_order, can_delete, max_num)
