'''
Remote model proxy for remote models in gears client.
'''
from django.http import HttpResponse, HttpResponseRedirect
from django.http import Http404
from django.core.urlresolvers import Resolver404
from django.utils.encoding import smart_str

__all__ = ('RemoteSite', 
           'expose',
           )

#class ModelRemoteBase(object):
#    pass
#
#class ModelRemote(object):
#    __metaclass__ = ModelRemoteBase
 
def expose(url, *args, **kwargs):
    def decorator(func):
        def new_function(*args, **kwargs):
            return func(*args, **kwargs)
        new_function.expose = (url, args, kwargs)
        return new_function
    return decorator

class RemoteSiteBase(type):
    def __new__(cls, name, bases, attrs):
        '''
        Generate the class attribute with the urls.
        '''
        new_class = super(RemoteSiteBase, cls).__new__(cls, name, bases, attrs)
        urls = []
        for ns in [attrs, ] + [ e.__dict__ for e in bases ]:
            for name, obj in ns.iteritems():
                if hasattr(obj, 'expose'):
                    urls.append(obj.expose)
        if urls:
            new_class._urls = urls
        return new_class


class RemoteSite(object):
    __metaclass__ = RemoteSiteBase
    
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
        for pattern in self._urls:
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
    
    @expose(r'^get_templates/(?P<app_name>\s)')
    def get_templates(self, request, app_name):
        return HttpResponse("Some day tamplates will be served from here")
    
    def index(self, request, p1):
        return HttpResponse('Hola %s' % p1)

    def app_index(self, request, app_label, p1):
        return HttpResponse('Hola %s - %s' % (app_label, p1))
    
    
    

class MySite(RemoteSite):
    @expose(r'index$', kwargs = {'algo': 'algo'}, name = 'index')
    def index(self):
        return "Hello world!"
        
    @expose(r'app_index/', name='app_index')
    def app_index(self, request):
        return 'otra'

if __name__ == "__main__":
    from pprint import pprint
    m = MySite()
    pprint(m._urls)