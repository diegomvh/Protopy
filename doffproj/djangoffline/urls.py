from django.conf.urls.defaults import *
import views
import sync

urlpatterns = patterns('',
    # TODO: Mejorar esto
    (r'^show_models', views.export_model_proxy),
    (r'^sync', sync.rpc_handler),

)