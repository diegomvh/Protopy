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
from django.utils.safestring import SafeString
from offline.debug import html_output
from django.core.exceptions import ImproperlyConfigured
from django.db import models
from django.contrib.admin.sites import AlreadyRegistered
from django.shortcuts import render_to_response
import os, re
from pprint import pformat
from django.db.models.loading import get_app

__all__ = ('RemoteSite', 
           'expose',
           'RemoteModelProxy',
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
        return new_class

import random, string
random_string = lambda length: ''.join( [ random.choice(string.letters) for _ in range(length) ] )


INVALID_TEMPLATE_SUFFIXES = re.compile(r'(:?.*\.svn.*)?(?:~|#)$')
#valid_templates = lambda name: not INVALID_TEMPLATE_SUFFIXES.search( name )
SCM_FOLDER_PATTERNS = ('.hg', '.git', '.svn', )

def valid_templates(name):
    if INVALID_TEMPLATE_SUFFIXES.search(name):
        return False
    if any(map(lambda n: name.count(n) > 0, SCM_FOLDER_PATTERNS)):
        return False
    return True
    
    
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




class RemoteBaseSite(object):
    '''
    For each offline application, there's a offline base
    '''
    __metaclass__ = RemoteSiteBase
    
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
        from django.conf import settings
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
                    # El binding de la funcion se hizo en ámbito estatico
                    # por lo tanto no tiene el curry de self :)
                    return callback(self, request, *callback_args, **callback_kwargs)
        
        #TODO: Imprimir un mensaje con el listado de URLs en el 404
#        if settings.DEBUG:
#            # Build a nice message when an url isn't found
#            text = '\n'.join([str(x.regex) for x in self._urls])
#            text = SafeString(text)
        raise Http404(u"No url for «%s»" % (url, ))
    
class RemoteSite(RemoteBaseSite):
    '''
    Manages offline project support.
    @expose decorator indicates how URLs are mapped
    '''
    
    def __init__(self, offline_root = None, offline_base = None, 
                 protopy_root = None):
        
        from django.conf import settings
        if not offline_root:
            assert hasattr(settings, "OFFLINE_ROOT"), \
                "You must define OFFLINE_ROOT in your project settings file, please check protopy docs"
                
            offline_root = settings.OFFLINE_ROOT
        self.offline_root = offline_root    
        
        if not offline_base:
            assert hasattr(settings, "OFFLINE_BASE"), \
                "You must define OFFLINE_BASE in your project settings file, please check protopy docs"
            offline_base = settings.OFFLINE_BASE
        self.offline_base = offline_base
        
        if not protopy_root:
            from os.path import abspath, dirname, join
            protopy_root = getattr(get_app('offline'), '__file__')
            protopy_root = join(abspath(dirname(protopy_root)), 'protopy')
        self.protpy_root = protopy_root
        
        self._registry = {}
        
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
        random_string = lambda length: ''.join( [ random.choice(string.letters) for _ in range(length) ] )  
        m = Manifest()
        m.version = random_string(32)
        m.add_uris_from_pathwalk(self.offline_root, '/%s' % self.offline_base)
        map( m.add_entry, map( lambda t: '/%s/templates%s'% (self.offline_base, t), 
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
    
    @expose(r'^template_list/$')
    def template_list(self, request):
        '''
        Debug
        ''' 
        return HttpResponse( html_output(full_template_list(), indent = 2))
    
    @expose('^system/(.*)$')
    def system_static_serve(self, request, path):
        from django.views.static import serve
        return serve(request, path, self.protpy_root, show_indexes = True)
    
    @expose('^project/(.*)$')
    def project_static_serve(self, request, path):
        from django.views.static import serve
        return serve(request, path, self.offline_root, show_indexes = True)
    
        
        
    @expose(r'^network_check/?$')
    def network_check(self, request):
        return HttpResponse()
    
    @expose(r'^manifests/system.json$')
    def system_manifest(self, request, version = None, exclude_callback = None):
    #def dynamic_manifest_from_fs(request, path, base_uri, version = None, exclude_callback = None):
    
        if not version:
            version = random_string(32)
        version = 'system_beta_1.2'
        
        m = Manifest( version = version )
        m.add_uris_from_pathwalk(self.protpy_root, 
                                 "%s/system" % self.offline_base, 
                                 exclude_callback)
        json = m.dump_manifest()
        if 'human' in request.GET:
            json = json.replace(', ', ',\n').replace("\\", "")
        return HttpResponse( json, 'text/plain' )
    
    
    @expose(r'^manifests/project.json$')
    def project_manifest(self, request):
        
        template_base = self.offline_base.split('/') + ['templates', ] 
        m = Manifest()
        # genreate random version string
        m.version = random_string(32)
        m.version = 'project_beta_2.2'
        
        m.add_uris_from_pathwalk(self.offline_root, '/%s/project' % self.offline_base)
        # Add templates
        for t in full_template_list():
            m.add_entry( '/%s' % '/'.join( filter(bool, template_base + t.split(os.sep))))
            
        app_labels = set(map( lambda model: model._meta.app_label, self._registry))
        
        for app in app_labels:
            m.add_entry('/%s/export/%s/models.js' % (self.offline_base, app))
        
        json = m.dump_manifest()
        
        if 'human' in request.GET:
            json = json.replace(', ', ',\n')
        
        return HttpResponse( json, 'text/plain' )
    
    @expose(r'^export/(?P<app_name>.*)/models.js$')
    def export_models_for_app(self, request, app_name):
        '''
        Generates the javascript output from the model definition.
        Each model must have beer registered with the register method.
        Client vision oaver the server model may be configured with a 
        RemoteProxy class.
        '''
#        from django.db.models.loading import get_app, get_models
#        #models = get_models(get_app(app_name))
#        models = filter(lambda m: m._meta.app_label == app_name, self._registry)
#        
#        return HttpResponse("Response %s" % unicode(models))
        #app = get_app(app_name).__file__
    
        #return HttpResponse(app)
        #HttpResponse(content, mimetype, status, content_type)
        return render_to_response('djangoffline/models_example.js', mimetype = 'text/javascript')
    
    @expose(r'^export_/(?P<app_name>.*)/models.js$')
    def export_models_for_app_(self, request, app_name):
        return HttpResponse('a', mimetype = 'text/javascript')
    
    
    def register(self, model, remote_proxy = None):
        '''
        Register a proxy for a model
        '''
        assert issubclass(model, models.Model), "%s is not a Models subclass" % model
        
        if model in self._registry:
            raise AlreadyRegistered("%s is already registered" % model)
        
        if not remote_proxy:
            # If no class is given, create a basic one based on the model
            name = model._meta.object_name
            basic_meta = type('%sMeta' % name, (object,), {'model': model})
            remote_proxy = type('%sRemote' % name, 
                                (RemoteModelProxy, ), 
                                {'Meta': RemoteOptions(basic_meta)} )
        
        self._registry[model] = remote_proxy
            
    
    
class RemoteModelMetaclass(type):
    def __new__(cls, name, bases, attrs):
        '''
        Generate the class 
        '''
        meta = attrs.pop('Meta', None)
        if not meta:
            if name is not "RemoteModelProxy":
                raise ImproperlyConfigured("%s has no Meta" % name)
        else:
            attrs['_meta'] = RemoteOptions(meta)
            
        new_class = super(RemoteModelMetaclass, cls).__new__(cls, name, bases, attrs)
        return new_class

class RemoteModelProxy(object):
    __metaclass__ = RemoteModelMetaclass
    
    
    def dump(self):
        pass
    def sync(self):
        pass
    
    
class RemoteOptions(object):
    def __init__(self, class_, **options):
        self.model = getattr(class_, 'model')
        
        if not self.model or not issubclass(self.model, models.Model):
            raise ImproperlyConfigured("Invalid model %s" % self.model)
        
        if hasattr(class_, 'exclude'):
            print "Excluyendo campos"
            exclude_fields = getattr(class_, 'exclude')
            model_field_names = map(lambda f: f.name, self.model._meta.fields +
                                                        self.model._meta.many_to_many
                                                    )
            for name in exclude_fields:
                if name not in model_field_names:
                    raise ImproperlyConfigured("%s has no %s field" % (self.model, name)) 
        
    def __str__(self):
        return unicode("<RemoteOptions for %s>" % self.model._meta.object_name)
    