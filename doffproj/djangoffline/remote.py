'''
Remote model proxy for remote models in gears client.
'''
from django.http import HttpResponse, HttpResponseRedirect

__all__ = ('RemoteModelProxy', 
           
           )

#class ModelRemoteBase(object):
#    pass
#
#class ModelRemote(object):
#    __metaclass__ = ModelRemoteBase
    
class RemoteSite(object):
    '''
    '''
    def __init__(self):
        self.registry = {}
        self.name = "cosas"
        
    def get_urls(self):
        from django.conf.urls.defaults import patterns, url, include
        urlpatterns = patterns('',
            (r'^$', self.index),
        )
        
        return urlpatterns
    
    urls = property( lambda s: s.get_urls() )
    
    def root(self, request, url):
        ''' Pegarle al get_urls '''
        # dispatchear...
        if request.method == 'GET' and not request.path.endswith('/'):
            return HttpResponseRedirect(request.path + '/')
        
        url = url.rstrip('/') # Trim trailing slash, if it exists.

        if url == '':
            return HttpResponse("La url es: %s" % url)
        elif url == 'project_manifest':
            pass
        
            
        return self.index(request)
    
    def index(self, request):
        return HttpResponse('Hola')
    