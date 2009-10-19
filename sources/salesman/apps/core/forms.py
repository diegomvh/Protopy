'''
Created on 21/09/2009

@author: defo
'''
from django import forms
from django.forms.models import inlineformset_factory, BaseInlineFormSet

from models import Pedido, ItemPedido

class PedidoForm(forms.ModelForm): 
    class Meta:
        model = Pedido



PedidoConItemsForm = inlineformset_factory(Pedido, ItemPedido, 
                                            
                                           extra = 10)