from blog.post.models import Tag, Post
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
        #manager = Tag.objects

#
#class PostRemote(RemoteModelProxy):
#    class Meta:
#        model = Post


class BlogRemoteSite(RemoteSite):
    exclude_patterns = (r'.*~$', )
#site = RemoteSite('blog')
site = BlogRemoteSite('blog')
site.register(Post)
site.register(Tag, TagRemote)