from django import forms
from django.forms.models import inlineformset_factory

from salesman.apps.ventas.models import Pedido, ItemPedido

class PedidoForm(forms.ModelForm): 
    class Meta:
        model = Pedido

PedidoConItemsForm = inlineformset_factory(Pedido, ItemPedido, extra = 10)