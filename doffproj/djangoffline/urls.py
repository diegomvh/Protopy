from django.conf.urls.defaults import *
from django.conf import settings
from django.db.models.loading import get_app
import views
import sync

urlpatterns = patterns('',
    # TODO: Mejorar esto
    (r'^show_models', views.export_model_proxy),
    (r'^list_templates/', views.list_templates, ), 
    (r'^sync', sync.rpc_handler),
    (r'^templates/(.*)', views.template_static_serve, ),

)

if settings.LOCAL_DEVELOPMENT:
    from os.path import abspath, dirname, join
    protopy_path = getattr(get_app('djangoffline'), '__file__')
    protopy_path = join(abspath(dirname(protopy_path)), 'protopy')
    
    urlpatterns += patterns('django.views.static',
        (r'project/(?P<path>.*)', 'serve', {"document_root": settings.OFFLINE_ROOT,
                                            "show_indexes": True}),
        (r'protopy/(?P<path>.*)', 'serve', {"document_root": protopy_path,
                                            "show_indexes": True}),
    )