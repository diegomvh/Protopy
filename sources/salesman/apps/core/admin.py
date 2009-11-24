from django.contrib import admin
from salesman.apps.core.models import Provincia, Ciudad, Cliente, Proveedor, Producto, Categoria

admin.site.register(Provincia)
admin.site.register(Ciudad)
admin.site.register(Cliente)
admin.site.register(Proveedor)
admin.site.register(Producto)
admin.site.register(Categoria)