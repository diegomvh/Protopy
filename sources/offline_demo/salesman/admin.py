from django.contrib.admin import AdminSite
from salesman.models import *

class AdminSalesman(AdminSite):
    pass

site = AdminSalesman()

site.register(Ciudad)
site.register(Vendedor)
site.register(Cliente)
site.register(Proveedor)
site.register(Producto)
site.register(Categoria)

site.register(Pedido)
site.register(ItemPedido)


