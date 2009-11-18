# coding: utf-8
from django.conf.urls.defaults import *
from django.conf import settings
import offline


# Uncomment the next two lines to enable the admin:
#from django.contrib import admin
#admin.autodiscover()
from protopy.off.remote_todo import site

urlpatterns = patterns('',

    # index
    (r'^/?$', 'django.views.generic.simple.direct_to_template', {'template': 'index.html'} ),
    
    (r'^%s/(.*)' % site.urlregex, site.root ),
)

# static media
urlpatterns += patterns('django.views.static',
    (r'^%s/(?P<path>.*)$' % settings.MEDIA_URL[1:-1], 
            'serve', {'document_root': settings.MEDIA_ROOT,
                      'show_indexes': True, }),
)