from django.conf.urls.defaults import patterns
from views import *
from models import *

urlpatterns = patterns('',
        #---------------------------------------------------------------------------------
        # Ciudad
        #---------------------------------------------------------------------------------
        
        #(r'ciudad/(?P<ciudad_id>\d{1,5})/$', view_ciudad),
        (r'ciudad/$', 'django.views.generic.simple.redirect_to', {'url':'/salesman/ciudades/'}),
        # Editar una ciudad
        (r'ciudad/(?P<object_id>\d{1,5})/edit/$', 'django.views.generic.create_update.update_object',{
            'model': Ciudad,
            'post_save_redirect': '/salesman/ciudades/',
            'template_name': 'forms.html',
            'extra_context': {'title': 'Editar ciudad', 'submit_text': 'Actualizar',}, 
        }),
        # Listado de ciudades
        (r'ciudades/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Ciudad.objects.all()
            }
        ),
        # Crear una ciudad
        (r'ciudades/add/$', 'django.views.generic.simple.redirect_to', 
            {'url': '../../ciudad/add/'}),
        (r'ciudad/add/$', 'django.views.generic.create_update.create_object', {
            'model': Ciudad,
            'post_save_redirect': '/salesman/ciudades/',
            'template_name': 'forms.html',
                                                                               
        }),
        # Ciudades -> Eliminar
        (r'ciudad/(?P<object_id>\d{1,5})/delete/$', 'django.views.generic.create_update.delete_object', {
            'model': Ciudad,
            'post_delete_redirect': '/salesman/ciudades/',
            'template_name': 'confirm_delete.html',
                                                                               
        }),
        
        #---------------------------------------------------------------------------------
        # Cliente
        #---------------------------------------------------------------------------------
        (r'cliente/$', 'django.views.generic.simple.redirect_to', {'url':'/salesman/clientes/'}),
        
        # Clientes -> Edit
        (r'cliente/(?P<object_id>\d{1,5})/edit/$', 'django.views.generic.create_update.update_object',{
            'model': Cliente,
            'template_name': 'forms.html',
            'post_save_redirect': '/salesman/clientes/',
            'extra_context': {'title': 'Editar cliente', 'submit_text': 'Actualizar',}, 
        }),
        
        # Cliente -> Listar
        (r'clientes/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Cliente.objects.all()
            }
        ),
        
        # Cliente -> Crear
        (r'clientes/add/$', 'django.views.generic.simple.redirect_to', 
            {'url': '../../cliente/add/'}),
        (r'cliente/add/$', 'django.views.generic.create_update.create_object', {
            'model': Cliente,
            'post_save_redirect': '/salesman/clientes/',
            'template_name': 'forms.html',
                                                                               
        }),
        
        # Clientes -> Eliminar
        (r'cliente/(?P<object_id>\d{1,5})/delete/$', 'django.views.generic.create_update.delete_object', {
            'model': Cliente,
            'post_delete_redirect': '/salesman/clientes/',
            'template_name': 'confirm_delete.html',
                                                                               
        }),
        
        #---------------------------------------------------------------------------------
        # Producto
        #---------------------------------------------------------------------------------
        (r'producto/$', 'django.views.generic.simple.redirect_to', {'url':'/salesman/productos/'}),
        
        # productos -> Edit
        (r'producto/(?P<object_id>\d{1,5})/edit/$', 'django.views.generic.create_update.update_object',{
            'model': Producto,
            'post_save_redirect': '/salesman/productos/',
            'extra_context': {'title': 'Editar producto', 'submit_text': 'Actualizar',}, 
        }),
        
        # producto -> Listar
        (r'productos/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Producto.objects.all()
            }
        ),
        
        # producto -> Crear
        (r'productos/add/$', 'django.views.generic.simple.redirect_to', 
            {'url': '../../producto/add/'}),
        (r'producto/add/$', 'django.views.generic.create_update.create_object', {
            'model': Producto,
            'post_save_redirect': '/salesman/productos/',
                                                                               
        }),
        
        # Producto -> Eliminar
        (r'producto/(?P<object_id>\d{1,5})/delete/$', 'django.views.generic.create_update.delete_object', {
            'model': Producto,
            'post_delete_redirect': '/salesman/productos/',
            'template_name': 'confirm_delete.html',
                                                                               
        }),
        
        #---------------------------------------------------------------------------------
        # Vendedores
        #---------------------------------------------------------------------------------
        (r'vendedor/$', 'django.views.generic.simple.redirect_to', {'url':'/salesman/vendedores/'}),
        
        # vendedors -> Edit
        (r'vendedor/(?P<object_id>\d{1,5})/edit/$', 'django.views.generic.create_update.update_object',{
            'model': Vendedor,
            'post_save_redirect': '/salesman/vendedores/',
            'template_name': 'forms.html',
            'extra_context': {'title': 'Editar vendedor', 'submit_text': 'Actualizar',}, 
        }),
        
        # vendedor -> Listar
        (r'vendedores/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Vendedor.objects.all()
            }
        ),
        
        # vendedor -> Crear
        (r'vendedores/add/$', 'django.views.generic.simple.redirect_to', 
            {'url': '../../vendedor/add/'}),
            
        (r'vendedor/add/$', 'django.views.generic.create_update.create_object', {
            'model': Vendedor,
            'template_name': 'forms.html',
            'post_save_redirect': '/salesman/vendedores/',
                                                                               
        }),
        # Vendedor -> Eliminar
        (r'vendedor/(?P<object_id>\d{1,5})/delete/$', 'django.views.generic.create_update.delete_object', {
            'model': Vendedor,
            'post_delete_redirect': '/salesman/vendedores/',
            'template_name': 'confirm_delete.html',
                                                                               
        }),
        
        #---------------------------------------------------------------------------------
        # Proveedores
        #---------------------------------------------------------------------------------
        (r'proveedor/$', 'django.views.generic.simple.redirect_to', {'url':'/salesman/vendedores/'}),
        
        # vendedors -> Edit
        (r'proveedor/(?P<object_id>\d{1,5})/edit/$', 'django.views.generic.create_update.update_object',{
            'model': Proveedor,
            'post_save_redirect': '/salesman/vendedores/',
            'template_name': 'forms.html',
            'extra_context': {'title': 'Editar proveedor', 'submit_text': 'Actualizar',}, 
        }),
        
        # proveedor -> Listar
        (r'vendedores/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Proveedor.objects.all()
            }
        ),
        
        # proveedor -> Crear
        (r'vendedores/add/$', 'django.views.generic.simple.redirect_to', 
            {'url': '../../proveedor/add/'}),
            
        (r'proveedor/add/$', 'django.views.generic.create_update.create_object', {
            'model': Proveedor,
            'template_name': 'forms.html',
            'post_save_redirect': '/salesman/vendedores/',
                                                                               
        }),
        # Vendedor -> Eliminar
        (r'proveedor/(?P<object_id>\d{1,5})/delete/$', 'django.views.generic.create_update.delete_object', {
            'model': Proveedornca,
            'post_delete_redirect': '/salesman/proveedores/',
            'template_name': 'confirm_delete.html',
                                                                               
        }),
        
        
)