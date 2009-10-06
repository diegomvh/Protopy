// Top level offline url-to-view mapping.

require('doff.conf.urls', '*');
require('agentes.views', '*');
require('agentes.ventas.models', 'Ciudad');

var urlpatterns = patterns('',
    ['^$', index],
    // Editar una ciudad
    ['^salesman/ciudad/(\d{1,5})/edit/$', 'doff.views.generic.create_update.update_object', {
            'model': Ciudad,
            'post_save_redirect': '/ciudades/',
            'extra_context': {'title': 'Editar ciudad', 'submit_text': 'Actualizar',},
        }],
        // Listado de ciudades
        ['salesman/ciudades/$', 'doff.views.generic.list_detail.object_list', {
            'queryset': Ciudad.objects.all()
            }
        ],
        // Crear una ciudad
        ['salesman/ciudades/add/$', 'doff.views.generic.simple.redirect_to', 
            {'url': '../ciudad/add/'}],
        ['salesman/ciudad/add/$', 'doff.views.generic.create_update.create_object', {
            'model': Ciudad,
            'post_save_redirect': '/ciudades/',
                                                                               
        }]
)

// Don't touch this line
publish({ 
    urlpatterns: urlpatterns 
});
