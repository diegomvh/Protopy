# coding: utf-8
from django.conf.urls.defaults import *
from django.conf import settings
from doffproj.blog.admin import bolg_admin_site
import djangoffline


# Uncomment the next two lines to enable the admin:
#from django.contrib import admin
#admin.autodiscover()

urlpatterns = patterns('',
    # Example:
    # (r'^doffproj/', include('doffproj.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs' 
    # to INSTALLED_APPS to enable admin documentation:
    (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    (r'^admin/(.*)', bolg_admin_site.root),
    
    # TODO: Reemplazar por un generic view.
    (r'^$', 'doffproj.views.index',  ),
    
    (r'^blog/', include('doffproj.blog.urls'),),
    
    # Incluimos las urls del offlinizador
    (r'^doff/', include('doffproj.djangoffline.urls'), ),
    
    
    (settings.OFFLINE_BASE, djangoffline.urls, ),
     
)


# Medios estáticos

urlpatterns += patterns('django.views.static',
    (r'^%s/(?P<path>.*)$' % settings.MEDIA_URL[1:-1], 
            'serve', {'document_root': settings.MEDIA_ROOT,
                      'show_indexes': True, }),
)