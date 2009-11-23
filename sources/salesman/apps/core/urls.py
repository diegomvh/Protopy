from django.conf.urls.defaults import patterns
from salesman.apps.core.models import *

urlpatterns = patterns('',
                       
        #---------------------------------------------------------------------------------
        # Ciudad
        #---------------------------------------------------------------------------------
        
        #(r'ciudad/(?P<ciudad_id>\d{1,5})/$', view_ciudad),
        (r'ciudad/$', 'django.views.generic.simple.redirect_to', {'url':'/core/ciudades/'}),
        # Editar una ciudad
        (r'ciudad/(?P<object_id>\d{1,5})/edit/$', 'django.views.generic.create_update.update_object',{
            'model': Ciudad,
            'post_save_redirect': '/core/ciudades/',
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
            'post_save_redirect': '/core/ciudades/',
            'template_name': 'forms.html',
                                                                               
        }),
        # Ciudades -> Eliminar
        (r'ciudad/(?P<object_id>\d{1,5})/delete/$', 'django.views.generic.create_update.delete_object', {
            'model': Ciudad,
            'post_delete_redirect': '/core/ciudades/',
            'template_name': 'confirm_delete.html',
                                                                               
        }),
        
        #---------------------------------------------------------------------------------
        # Cliente
        #---------------------------------------------------------------------------------
        (r'cliente/$', 'django.views.generic.simple.redirect_to', {'url':'/core/clientes/'}),
        
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
            'post_save_redirect': '/core/clientes/',
            'template_name': 'forms.html',
                                                                               
        }),
        
        # Clientes -> Eliminar
        (r'cliente/(?P<object_id>\d{1,5})/delete/$', 'django.views.generic.create_update.delete_object', {
            'model': Cliente,
            'post_delete_redirect': '/core/clientes/',
            'template_name': 'confirm_delete.html',
                                                                               
        }),
        
        #---------------------------------------------------------------------------------
        # Producto
        #---------------------------------------------------------------------------------
        (r'producto/$', 'django.views.generic.simple.redirect_to', {'url':'/core/productos/'}),
        
        # productos -> Edit
        (r'producto/(?P<object_id>\d{1,5})/edit/$', 'django.views.generic.create_update.update_object',{
            'model': Producto,
            'template_name': 'forms.html',
            'post_save_redirect': '/core/productos/',
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
            'template_name': 'forms.html',
            'post_save_redirect': '/core/productos/',
                                                                               
        }),
        
        # Producto -> Eliminar
        (r'producto/(?P<object_id>\d{1,5})/delete/$', 'django.views.generic.create_update.delete_object', {
            'model': Producto,
            'post_delete_redirect': '/core/productos/',
            'template_name': 'confirm_delete.html',
                                                                               
        }),
        
        #---------------------------------------------------------------------------------
        # Proveedores
        #---------------------------------------------------------------------------------
        (r'proveedor/$', 'django.views.generic.simple.redirect_to', {'url':'/core/proveedores/'}),
        
        # vendedors -> Edit
        (r'proveedor/(?P<object_id>\d{1,5})/edit/$', 'django.views.generic.create_update.update_object',{
            'model': Proveedor,
            'post_save_redirect': '/core/proveedores/',
            'template_name': 'forms.html',
            'extra_context': {'title': 'Editar proveedor', 'submit_text': 'Actualizar',}, 
        }),
        
        # proveedor -> Listar
        (r'proveedores/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Proveedor.objects.all()
            }
        ),
        
        # proveedor -> Crear
        (r'proveedores/add/$', 'django.views.generic.simple.redirect_to', 
            {'url': '../../proveedor/add/'}),
            
        (r'proveedor/add/$', 'django.views.generic.create_update.create_object', {
            'model': Proveedor,
            'template_name': 'forms.html',
            'post_save_redirect': '/core/proveedores/',
                                                                               
        }),
        # proveedor -> Eliminar
        (r'proveedor/(?P<object_id>\d{1,5})/delete/$', 'django.views.generic.create_update.delete_object', {
            'model': Proveedor,
            'post_delete_redirect': '/core/proveedores/',
            'template_name': 'confirm_delete.html',
                                                                               
        }),
        
        #---------------------------------------------------------------------------------
        # Categoria
        #---------------------------------------------------------------------------------
        (r'categoria/$', 'django.views.generic.simple.redirect_to', {'url':'/core/categorias/'}),
        
        # vendedors -> Edit
        (r'categoria/(?P<object_id>\d{1,5})/edit/$', 'django.views.generic.create_update.update_object',{
            'model': Categoria,
            'post_save_redirect': '/core/categorias/',
            'template_name': 'forms.html',
            'extra_context': {'title': 'Editar categoria', 'submit_text': 'Actualizar',}, 
        }),
        
        # categoria -> Listar
        (r'categorias/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Categoria.objects.all()
            }
        ),
        
        # categoria -> Crear
        (r'categorias/add/$', 'django.views.generic.simple.redirect_to', 
            {'url': '../../categoria/add/'}),
            
        (r'categoria/add/$', 'django.views.generic.create_update.create_object', {
            'model': Categoria,
            'template_name': 'forms.html',
            'post_save_redirect': '/core/categorias/',
                                                                               
        }),
        # categoria -> Eliminar
        (r'categoria/(?P<object_id>\d{1,5})/delete/$', 'django.views.generic.create_update.delete_object', {
            'model': Categoria,
            'post_delete_redirect': '/core/categorias/',
            'template_name': 'confirm_delete.html',
                                                                               
        }),
)