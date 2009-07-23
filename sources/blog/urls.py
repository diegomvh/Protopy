# coding: utf-8
from django.conf.urls.defaults import *
from django.conf import settings
from blog.post.admin import bolg_admin_site
import offline


# Uncomment the next two lines to enable the admin:
#from django.contrib import admin
#admin.autodiscover()
from blog.offline.blog import blog_site

urlpatterns = patterns('',
    # Uncomment the admin/doc line below and add 'django.contrib.admindocs' 
    # to INSTALLED_APPS to enable admin documentation:
    (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    (r'^admin/(.*)', bolg_admin_site.root),

    # index
    (r'^offblog/offline.html$', 'django.views.generic.simple.direct_to_template', {'template': 'index.html'}),

    (r'^%s/(.*)' % blog_site.offline_base, blog_site.root ),

    (r'^rpc/test', 'offline.sync.rpc_handler' ),
    
    # OLD CODE
    #(r'^' + settings.OFFLINE_BASE + '/', include('offline.urls'), ),
)

# static media
urlpatterns += patterns('django.views.static',
    (r'^%s/(?P<path>.*)$' % settings.MEDIA_URL[1:-1], 
            'serve', {'document_root': settings.MEDIA_ROOT,
                      'show_indexes': True, }),
)