from offline.sites import RemoteSite
from offline.remotes import RemoteModelProxy
from salesman.apps.core.models import Ciudad, Cliente, Categoria, Producto, Proveedor
from salesman.apps.ventas.models import Pedido, ItemPedido

class RemotePedido(RemoteModelProxy):
    class Meta:
        model = Pedido
        exclude = ['vendedor']

    def save(self, ):

agentes_site = RemoteSite("agentes")
agentes_site.register(Ciudad)
agentes_site.register(Cliente)
agentes_site.register(Categoria)
agentes_site.register(Producto)
agentes_site.register(Proveedor)
agentes_site.register(RemotePedido)
agentes_site.register(ItemPedido)