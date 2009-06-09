'''
Remote models for doff app
'''

from doffproj.blog.models import *

from doffproj.djangoffline.remotemodels import *

class TagRemote(RemoteModelProxy):
    
    class Meta:
        model = Tag
        exclude = ('fecha', )

class PostRemote(RemoteModelProxy):
    class Meta:
        model = Post
     
