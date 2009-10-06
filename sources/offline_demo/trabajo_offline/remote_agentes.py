from offline.sites import RemoteSite
from offline_demo.salesman.models import *

agentes_site = RemoteSite("agentes")
agentes_site.register('ventas', Pais)
agentes_site.register('ventas', Provincia)
agentes_site.register('ventas', Ciudad)
