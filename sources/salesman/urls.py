from django.conf.urls.defaults import *
from django.contrib import admin
from django.db.models.loading import get_app, get_models
from salesman.off.remote_agentes import agentes_site
from django.conf import settings

# Autodiscover para la admin
admin.autodiscover()

urlpatterns = patterns('',
    # Example:
    # (r'^offline_demo/', include('offline_demo.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs' 
    # to INSTALLED_APPS to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    (r'^admin/', include(admin.site.urls)),
    (r'^$', 'django.views.generic.simple.direct_to_template', {'template': 'index.html'} ),
    (r'^login/?$', 'salesman.views.login' ),
    (r'^logout/?$', 'salesman.views.logout' ),
    (r'^catalogo/$', 'django.views.generic.simple.direct_to_template', {'template': 'catalogo.html'} ),
    (r'^catalogo/categoria/(?P<categoria>\d+)/$', 'salesman.apps.core.catalogo.productos_por_categoria'),
    (r'^catalogo/buscar/$', 'salesman.apps.core.catalogo.buscar_productos'),
    (r'^administrar/', include('salesman.apps.core.urls')),
    (r'^pedido/agregar/(?P<producto>\d+)/$', 'salesman.apps.ventas.views.agregar_producto'),
    (r'^pedido/modificar/$', 'salesman.apps.ventas.views.modificar_pedido'),
    (r'^core/', include('salesman.apps.core.urls')),
    (r'^ventas/', include('salesman.apps.ventas.urls')),
    (r'^%s/(.*)' % agentes_site.urlregex, agentes_site.root ),
)

# static media
urlpatterns += patterns('django.views.static',
    (r'^%s/(?P<path>.*)$' % settings.MEDIA_URL[1:-1], 
            'serve', {'document_root': settings.MEDIA_ROOT,
                      'show_indexes': True, }),
)
