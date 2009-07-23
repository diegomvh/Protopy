# -*- coding: utf-8 -*-


from django.conf.urls.defaults import *
from blog.post import views
    
urlpatterns = patterns('django.views.generic.simple', 
    (r'^add_tag/$', views.add_tag),
    (r'^remove_tag/$', views.remove_tag),
    (r'^add_post/$', views.add_post),
    (r'^remove_post/$', views.remove_post)
)