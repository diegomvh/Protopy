from django.conf.urls.defaults import patterns
from views import *
from models import *

urlpatterns = patterns('',
        # Ver una ciudad
        (r'ciudad/(?P<ciudad_id>\d{1,5})/$', view_ciudad),
        # Editar una ciudad
        (r'ciudad/(?P<ciudad_id>\d{1,5})/edit/$', add_edit_ciudad),
        # Agrear ciudad
        (r'ciudad/add/$', add_edit_ciudad),
        # Listado de ciudades
        #(r'ciudades/$', list_ciudad),
        (r'ciudades/(?P<per_page>\d{1,5})/(?P<start_page>\d{1,5})/$', list_ciudad),
        (r'ciudades/$', 'django.views.generic.list_detail.object_list',{
            'queryset': Ciudad.objects.all()
            }
        ), 
        
)