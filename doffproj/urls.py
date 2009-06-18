# coding: utf-8
from django.conf.urls.defaults import *
from django.conf import settings
from doffproj.blog.admin import bolg_admin_site
import djangoffline


# Uncomment the next two lines to enable the admin:
#from django.contrib import admin
#admin.autodiscover()
from doffproj.blog.remote import site

urlpatterns = patterns('',
    # Uncomment the admin/doc line below and add 'django.contrib.admindocs' 
    # to INSTALLED_APPS to enable admin documentation:
    (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    (r'^admin/(.*)', bolg_admin_site.root),

    # index
    (r'^$', include('doffproj.blog.urls'),),

    (r'^' + settings.OFFLINE_BASE + '/', include('doffproj.djangoffline.urls'), ),
    
    
    (r'^remote/(.*)', site.root ),
)

# static media
urlpatterns += patterns('django.views.static',
    (r'^%s/(?P<path>.*)$' % settings.MEDIA_URL[1:-1], 
            'serve', {'document_root': settings.MEDIA_ROOT,
                      'show_indexes': True, }),
)