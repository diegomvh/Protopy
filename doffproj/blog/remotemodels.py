'''
Remote models for doff app
'''

from doffproj.blog.models import *

from doffproj.djangoffline.remotemodels import *

class TagRemote(RemoteModelProxy):
    
    class Meta:
        model = Tag
        exclude = ('fecha', )
        client_mixin = '<poject_name>.<app_label>....<Class>'
        

class PostRemote(RemoteModelProxy):
    class Meta:
        model = Post
     
