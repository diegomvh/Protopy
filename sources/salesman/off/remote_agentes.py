from offline.sites import RemoteSite
from salesman.apps.core.models import *
from salesman.apps.ventas.models import *

agentes_site = RemoteSite("agentes")
agentes_site.register(Ciudad)
agentes_site.register(Cliente)
agentes_site.register(Categoria)
agentes_site.register(Producto)
agentes_site.register(Pedido)
agentes_site.register(ItemPedido)