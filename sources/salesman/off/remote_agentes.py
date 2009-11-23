from django.db import models
from offline.sites import RemoteSite
from offline.remotes import RemoteModelProxy
from salesman.apps.core.models import *
from salesman.apps.ventas.models import *

class RemoteCliente(RemoteModelProxy):
    password = models.CharField(max_length = 50)
    class Meta:
        model = Cliente
        fields = ['username', 'first_name', 'last_name', 'email', 'razon_social', 'cuit', 'direccion', 'ciudad']
        
    def save(self, cliente):
        #TODO: Crear el usuario 
        cliente.save()
        return cliente

agentes_site = RemoteSite("agentes")
agentes_site.register(Ciudad)
agentes_site.register(RemoteCliente)
agentes_site.register(Categoria)
agentes_site.register(Producto)
agentes_site.register(Pedido)
agentes_site.register(ItemPedido)