from offline.sites import RemoteSite
from salesman.apps.ventas.models import *

agentes_site = RemoteSite("agentes")
agentes_site.register(Pedido)
agentes_site.register(ItemPedido)
