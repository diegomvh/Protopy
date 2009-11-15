# -*- coding: utf-8 -*-
from blog.post.models import Tag, Post, Persona, Empleado, Jefe
from offline.sites import RemoteSite 
from offline.sites import RemoteModelProxy

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
        manager = Tag.objects

#
#class PostRemote(RemoteModelProxy):
#    class Meta:
#        model = Post


class BlogRemoteSite(RemoteSite):
    exclude_patterns = (r'.*~$', )

site = BlogRemoteSite('blog')
site.register('post', Post)
site.register('post', Tag, TagRemote)
site.register('post', Persona)