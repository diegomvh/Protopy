'''
Remote models for doff app
'''

from blog.post.models import *
from offline.remote import RemoteSite 
from django.db import models
from offline.remote import RemoteModelProxy

class TagRemote(RemoteModelProxy):
#    
#    fecha_x = models.DateField('Fecha de creacion' )
#    
#    def dump(self):
#        user = get_user()
#        pass
#    
#    def sync(self, data):
#        raise NotImplementedError("No funca")
#    
    class Meta:
        model = Tag
        exclude = ('title', )
        #manager = Tag.objects

#
#class PostRemote(RemoteModelProxy):
#    class Meta:
#        model = Post



site = RemoteSite('blog')
site.register(Post)
site.register(Tag, TagRemote)
