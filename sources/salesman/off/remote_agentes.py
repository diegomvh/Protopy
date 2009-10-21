from offline.sites import RemoteSite
from salesman.apps.core.models import *

agentes_site = RemoteSite("agentes")
#agentes_site.register(Pais)
agentes_site.register(Provincia)
agentes_site.register(Ciudad)