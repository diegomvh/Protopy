#coding: utf-8
'''
Remote model proxy for remote models in gears client.
'''
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseNotFound
from django.http import Http404
from django.core.urlresolvers import Resolver404, RegexURLPattern
from django.utils.encoding import smart_str
from offline.models import Manifest
from django.template import TemplateDoesNotExist
import os, re

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

INVALID_TEMPLATE_SUFFIXES = re.compile(r'(:?.*\.svn.*)?(?:~|#)$')

valid_templates = lambda name: not INVALID_TEMPLATE_SUFFIXES.search( name )
    
def _retrieve_templates_from_path(path, template_bases = None, strip_first_slash = True):
    '''
    '''
    from os.path import join
    if not template_bases:
        template_bases = []
        
    template_files = [] 
    for root, _dirs, files in os.walk(path):
        for t_base in template_bases:
            #import ipdb; ipdb.set_trace()
            
            if t_base in root:
                index = root.index(t_base)
                root = root[index + len(t_base):]
                break
        
        template_files += map(lambda f: join(root, f), files)
        
    templates = filter(valid_templates, template_files)
    if strip_first_slash:
        templates = filter(
                                 lambda f: f.startswith('/') and f[1:] or f, 
                                 templates)
    return templates
    
def full_template_list(exclude_apps = None, exclude_callable = None):
    from django.conf import settings
    
    template_dirs = map(lambda s: s.split(os.sep)[-1], settings.TEMPLATE_DIRS)
     
    template_files = []
    for path in settings.TEMPLATE_DIRS:
        template_files += _retrieve_templates_from_path(path, template_dirs)
        # Split
    
    # Get per application template list
    if 'django.template.loaders.app_directories.load_template_source' in settings.TEMPLATE_LOADERS:
        from django.template.loaders.app_directories import app_template_dirs
        for path in app_template_dirs:
            template_files += _retrieve_templates_from_path(path, template_dirs)
    return template_files




class RemoteSite(object):
    __metaclass__ = RemoteSiteBase
    
    def __init__(self):
        self.registry = {}
        self.name = "cosas"
        
#    def get_urls(self):
#        from django.conf.urls.defaults import patterns, url
#
#        urlpatterns = patterns('',
#            url(r'^$',
#                self.index,
#                kwargs={'p1': 'Pepe'}, 
#                name='%sadmin_index' % self.name),
#            url(r'^(?P<app_label>\w+)/$',
#                self.app_index,
#                kwargs={'p1': 'Pepe'}, 
#                name='%sadmin_app_list' % self.name),
#            
#        )
#
#        return urlpatterns
#
#    urlpatterns = property(get_urls)

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
    
    @expose(r'^manifest\.json$')
    def manifest(self, request):
        return HttpResponse("Manifest")
    
    #@expose(r'')
    def get_prject_manifest(self, request):
        import random, string
        from django.conf import settings
        random_string = lambda length: ''.join( [ random.choice(string.letters) for _ in range(length) ] )  
        m = Manifest()
        m.version = random_string(32)
        m.add_uris_from_pathwalk(settings.OFFLINE_ROOT, '/%s' % settings.OFFLINE_BASE)
        map( m.add_entry, map( lambda t: '/%s/templates%s'% (settings.OFFLINE_BASE, t), 
                           full_template_list()))
        
        json = m.dump_manifest()
        
        if 'human' in request.GET:
            json = json.replace(', ', ',\n')
    
        return HttpResponse( json, 'text/plain' )
    
    @expose(r'^templates/(.*)$')
    def templates_static_serve(self, request, path):
        from django.template.loader import find_template_source
        try:
            template_source, _origin = find_template_source(path)
        except TemplateDoesNotExist:
            return HttpResponseNotFound(u'404: template not found: \"%s\"' % path)
        return HttpResponse(template_source)        

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