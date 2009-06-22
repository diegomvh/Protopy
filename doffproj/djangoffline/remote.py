'''
Remote model proxy for remote models in gears client.
'''
from django.http import HttpResponse, HttpResponseRedirect
from django.http import Http404
from django.core.urlresolvers import Resolver404
from django.utils.encoding import smart_str

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
        from django.conf.urls.defaults import patterns, url

        urlpatterns = patterns('',
            url(r'^$',
                self.index,
                kwargs={'p1': 'Pepe'}, 
                name='%sadmin_index' % self.name),
            url(r'^(?P<app_label>\w+)/$',
                self.app_index,
                kwargs={'p1': 'Pepe'}, 
                name='%sadmin_app_list' % self.name),
        )

        return urlpatterns

    urlpatterns = property(get_urls)

    def root(self, request, url):
        for pattern in self.urlpatterns:
            try:
                sub_match = pattern.resolve(url)
            except Resolver404, e:
                pass
            else:
                if sub_match:
                    sub_match_dict = {}
                    for k, v in sub_match[2].iteritems():
                        sub_match_dict[smart_str(k)] = v
                    callback = sub_match[0]
                    callback_args = sub_match[1]
                    callback_kwargs = sub_match_dict
                    return callback(request, *callback_args, **callback_kwargs)
        raise Http404()

    def index(self, request, p1):
        return HttpResponse('Hola %s' % p1)

    def app_index(self, request, app_label, p1):
        return HttpResponse('Hola %s - %s' % (app_label, p1))
    
    def get_templates(self, request):
        return None