#coding: utf-8
'''
Remote model proxy for remote models in gears client.
'''
from django.http import HttpResponse, HttpResponseRedirect
from django.http import Http404
from django.core.urlresolvers import Resolver404, RegexURLPattern
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
                    #urls.append(obj.expose)
                    regex, largs, kwargs = obj.expose
                    urls.append(RegexURLPattern(regex, obj, kwargs, ''))
        if urls:
            new_class._urls = urls
        print urls
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
                    print "***", sub_match
                    sub_match_dict = {}
                    for k, v in sub_match[2].iteritems():
                        sub_match_dict[smart_str(k)] = v
                    callback = sub_match[0]
                    callback_args = sub_match[1]
                    callback_kwargs = sub_match_dict
                    # El binding de la funcion se hizo en ámbito estatico
                    # por lo tanto no tiene el curry de self :)
                    return callback(self, request, *callback_args, **callback_kwargs)
        raise Http404(u"No url for «%s»" % url)
    
    @expose(r'^get_templates/(?P<app_name>\w*)/$')
    def get_templates(self, request, app_name):
        return HttpResponse("Some day tamplates will be served from here")
    
    @expose(r'^$')
    def index(self, request):
        return HttpResponse('Hola %s')
    
    @expose(r'^app_index/(?P<app_label>\w+)/$')
    def app_index(self, request, app_label):
        return HttpResponse('App index %s' % app_label)
    
    
    

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