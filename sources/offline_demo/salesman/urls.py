from django.conf.urls.defaults import patterns
from views import *
from models import *

urlpatterns = patterns('',
        # Ver una ciudad
        (r'ciudad/(?P<ciudad_id>\d{1,5})/$', view_ciudad),
        
        # Editar una ciudad
        (r'ciudad/(?P<object_id>\d{1,5})/edit/$', 'django.views.generic.create_update.update_object',{
            'model': Ciudad,
            'post_save_redirect': '/salesman/ciudades/',
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
                                                                               
        }),
        
        
        # Clientes -> Edit
        (r'cliente/(?P<object_id>\d{1,5})/edit/$', 'django.views.generic.create_update.update_object',{
            'model': Cliente,
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
                                                                               
        }),
        
        
)