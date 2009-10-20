from django.conf.urls.defaults import *
from offline_demo.salesman.admin import site
from django.db.models.loading import get_app, get_models
from django.contrib import databrowse

map(databrowse.site.register, get_models(get_app('salesman')))
# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()
from offline_demo.trabajo_offline.remote_agentes import agentes_site
from offline_demo.trabajo_offline.remote_contadores import contadores_site




urlpatterns = patterns('',
    # Example:
    # (r'^offline_demo/', include('offline_demo.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs' 
    # to INSTALLED_APPS to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # (r'^admin/', include(admin.site.urls)),
    ('^$', 'django.views.generic.simple.direct_to_template', {'template': 'index.html'}),
    ('^admin/(.*)', site.root, ),
    ('^salesman', include('offline_demo.salesman.urls')),
    (r'^%s/(.*)' % agentes_site.urlregex, agentes_site.root ),
    (r'^%s/(.*)' % agentes_site.urlregex, agentes_site.root ),
    (r'^databrowse/(.*)', databrowse.site.root),
)