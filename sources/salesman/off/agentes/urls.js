// Top level offline url-to-view mapping.
require('doff.conf.urls', 'patterns', 'include');

var urlpatterns = patterns('',
    ['^$', 'doff.views.generic.simple.direct_to_template', {'template': 'index.html'} ],
    ['^login/$', 'agentes.views.login' ],
    ['^logout/$', 'agentes.views.logout' ],
    ['^catalogo/$', 'doff.views.generic.simple.direct_to_template', {'template': 'catalogo.html'} ],
    ['^catalogo/categoria/(\\d+)/$', 'agentes.core.views.productos_por_categoria'],
    ['^catalogo/buscar/$', 'agentes.core.catalogo.buscar_productos'],
    ['^administrar/', include('agentes.core.urls')],
    ['^pedido/agregar/(\\d+)/$', 'agentes.ventas.views.agregar_producto'],
    ['^pedido/modificar/$', 'agentes.ventas.views.modificar_pedido'],
    ['^pedidos/$', 'agentes.ventas.views.ver_pedidos'],
    ['^pedidos/pedido/(\\d+)/$', 'agentes.ventas.views.ver_pedido_por_id']
);

// Don't touch this line
publish({ 
    urlpatterns: urlpatterns 
});
