from django.conf.urls.defaults import patterns
from salesman.apps.ventas.models import Pedido

urlpatterns = patterns('',
        (r'^/?$', 'django.views.generic.simple.direct_to_template', {'template': 'ventas/index.html'} ),
        #---------------------------------------------------------------------------------
        # Pedido
        #---------------------------------------------------------------------------------
        (r'pedido/$', 'django.views.generic.simple.redirect_to', {'url':'/salesman/pedidos/'}),
        
        # vendedors -> Edit
        (r'pedido/(?P<object_id>\d{1,5})/edit/$', 'salesman.apps.ventas.views.edit_pedido',{
             
        }),
        
        # pedido -> Listar
        (r'pedidos/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Pedido.objects.all()
            }
        ),
        
        # pedido -> Crear
        (r'pedidos/add/$', 'django.views.generic.simple.redirect_to', 
            {'url': '../../pedido/add/'}),
        
        # Esta no es una generica por ahora
#        (r'pedido/add/$', 'django.views.generic.create_update.create_object', {
#            'model': Pedido,
#            'template_name': 'forms.html',
#            'post_save_redirect': '/salesman/pedidos/',
#                                                                               
#        }),
        (r'pedido/add/$', 'salesman.apps.ventas.views.create_pedido', ),

        # pedido -> Eliminar
        (r'pedido/(?P<object_id>\d{1,5})/delete/$', 'django.views.generic.create_update.delete_object', {
            'model': Pedido,
            'post_delete_redirect': '/salesman/pedidos/',
            'template_name': 'confirm_delete.html',
                                                                               
        }),
        
)