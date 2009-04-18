from django.conf.urls.defaults import *
import views
urlpatterns = patterns('',
    # TODO: Mejorar esto
    (r'^show_models', views.export_model_proxy),
    
                       
)