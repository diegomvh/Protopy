from django.conf.urls.defaults import patterns
from salesman.apps.core.models import *

urlpatterns = patterns('',
        
        (r'^$', 'django.views.generic.simple.direct_to_template', {'template': 'administrar.html'}),
        
        #---------------------------------------------------------------------------------
        # Ciudad
        #---------------------------------------------------------------------------------
        
        # Editar una ciudad
        (r'ciudad/(?P<object_id>\d{1,5})/editar/$', 'django.views.generic.create_update.update_object',{
            'model': Ciudad,
            'post_save_redirect': '/administrar/ciudades/',
            'template_name': 'forms.html',
            'extra_context': {'titulo': 'Editar Ciudad', 'submit_text': 'Actualizar',}, 
        }),
        # Listado de ciudades
        (r'ciudades/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Ciudad.objects.all(),
            'extra_context': {'titulo': 'Listado de Ciudades'},
            }
        ),
        (r'ciudad/agregar/$', 'django.views.generic.create_update.create_object', {
            'model': Ciudad,
            'post_save_redirect': '/administrar/ciudades/',
            'template_name': 'forms.html',
            'extra_context': {'titulo': 'Agregar Ciudad'},
                                                                               
        }),
        # Ciudades -> Eliminar
        (r'ciudad/(?P<object_id>\d{1,5})/eliminar/$', 'django.views.generic.create_update.delete_object', {
            'model': Ciudad,
            'post_delete_redirect': '/administrar/ciudades/',
            'template_name': 'confirm_delete.html',
            'extra_context': {'titulo': 'Eliminar Ciudad'},
                                                                               
        }),
        
        #---------------------------------------------------------------------------------
        # Cliente
        #---------------------------------------------------------------------------------
        
        # Clientes -> Edit
        (r'cliente/(?P<object_id>\d{1,5})/editar/$', 'django.views.generic.create_update.update_object',{
            'model': Cliente,
            'template_name': 'forms.html',
            'post_save_redirect': '/administrar/clientes/',
            'extra_context': {'title': 'Editar Cliente', 'submit_text': 'Actualizar',}, 
        }),
        
        # Cliente -> Listar
        (r'clientes/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Cliente.objects.all(),
            'extra_context': {'titulo': 'Listado de Clientes'},
            }
        ),
        
        (r'cliente/agregar/$', 'django.views.generic.create_update.create_object', {
            'model': Cliente,
            'post_save_redirect': '/administrar/clientes/',
            'template_name': 'forms.html',
            'extra_context': {'titulo': 'Agregar Cliente'},
                                                                               
        }),
        
        # Clientes -> Eliminar
        (r'cliente/(?P<object_id>\d{1,5})/eliminar/$', 'django.views.generic.create_update.delete_object', {
            'model': Cliente,
            'post_delete_redirect': '/administrar/clientes/',
            'template_name': 'confirm_delete.html',
            'extra_context': {'titulo': 'Eliminar Cliente'},
                                                                               
        }),
        
        #---------------------------------------------------------------------------------
        # Producto TODO: esta tiene que ser sin editar imagen en el cliente
        #---------------------------------------------------------------------------------
        
        # productos -> Edit
        (r'producto/(?P<object_id>\d{1,5})/editar/$', 'django.views.generic.create_update.update_object',{
            'model': Producto,
            'template_name': 'forms.html',
            'post_save_redirect': '/administrar/productos/',
            'extra_context': {'title': 'Editar Producto', 'submit_text': 'Actualizar',}, 
        }),
        
        # producto -> Listar
        (r'productos/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Producto.objects.all(),
            'extra_context': {'titulo': 'Listado de Productos'},
            }
        ),
        
        # producto -> Crear
        (r'producto/agregar/$', 'django.views.generic.create_update.create_object', {
            'model': Producto,
            'template_name': 'forms.html',
            'post_save_redirect': '/core/productos/',
            'extra_context': {'titulo': 'Agregar Producto'},               
        }),
        
        # Producto -> Eliminar
        (r'producto/(?P<object_id>\d{1,5})/eliminar/$', 'django.views.generic.create_update.delete_object', {
            'model': Producto,
            'post_delete_redirect': '/administrar/productos/',
            'template_name': 'confirm_delete.html',
            'extra_context': {'titulo': 'Eliminar Producto'},                                                              
        }),
        
        #---------------------------------------------------------------------------------
        # Proveedores
        #---------------------------------------------------------------------------------
        (r'^proveedor/$', 'django.views.generic.simple.redirect_to', {'url':'/core/proveedores/'}),
        
        # vendedors -> Edit
        (r'^proveedor/(?P<object_id>\d{1,5})/edit/$', 'django.views.generic.create_update.update_object',{
            'model': Proveedor,
            'post_save_redirect': '/administrar/proveedores/',
            'template_name': 'forms.html',
            'extra_context': {'title': 'Editar proveedor', 'submit_text': 'Actualizar',}, 
        }),
        
        # proveedor -> Listar
        (r'^proveedores/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Proveedor.objects.all()
            }
        ),
        
        # proveedor -> Crear
        (r'^proveedores/add/$', 'django.views.generic.simple.redirect_to', 
            {'url': '../../proveedor/add/'}),
            
        (r'^proveedor/add/$', 'django.views.generic.create_update.create_object', {
            'model': Proveedor,
            'template_name': 'forms.html',
            'post_save_redirect': '/administrar/proveedores/',
                                                                               
        }),
        # proveedor -> Eliminar
        (r'^proveedor/(?P<object_id>\d{1,5})/delete/$', 'django.views.generic.create_update.delete_object', {
            'model': Proveedor,
            'post_delete_redirect': '/administrar/proveedores/',
            'template_name': 'confirm_delete.html',
                                                                               
        }),
        
        #---------------------------------------------------------------------------------
        # Categoria
        #---------------------------------------------------------------------------------
        
        # vendedors -> Edit
        (r'categoria/(?P<object_id>\d{1,5})/editar/$', 'django.views.generic.create_update.update_object',{
            'model': Categoria,
            'post_save_redirect': '/administrar/categorias/',
            'template_name': 'forms.html',
            'extra_context': {'title': 'Editar Categoria', 'submit_text': 'Actualizar',}, 
        }),
        
        # categoria -> Listar
        (r'categorias/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Categoria.objects.all(),
            'extra_context': {'titulo': 'Listado de Categorias'},  
            }
        ),
        
        # categoria -> Crear
        (r'^categoria/agregar/$', 'django.views.generic.create_update.create_object', {
            'model': Categoria,
            'template_name': 'forms.html',
            'post_save_redirect': '/administrar/categorias/',
            'extra_context': {'titulo': 'Agregar Categoria'},                                                                     
        }),
        # categoria -> Eliminar
        (r'^categoria/(?P<object_id>\d{1,5})/eliminar/$', 'django.views.generic.create_update.delete_object', {
            'model': Categoria,
            'post_delete_redirect': '/administrar/categorias/',
            'template_name': 'confirm_delete.html',
            'extra_context': {'titulo': 'Eliminar Categoria'},                            
        }),
)