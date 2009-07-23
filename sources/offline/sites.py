# -*- coding: utf-8 -*-
#coding: utf-8
'''
Remote model proxy for remote models in gears client.
'''
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseNotFound
from django.http import Http404
from django.core.urlresolvers import Resolver404, RegexURLPattern
from django.utils.encoding import smart_str
from offline.models import Manifest, SyncLog
from django.template import TemplateDoesNotExist
from django.utils.safestring import SafeString
from offline.debug import html_output
from django.core.exceptions import ImproperlyConfigured
from django.db import models
from django.contrib.admin.sites import AlreadyRegistered
from django.shortcuts import render_to_response
from django.db.models.fields import AutoField
import os, re
from pprint import pformat
from django.db.models.loading import get_app
import copy
import SimpleXMLRPCServer
from offline.rpc.SimpleJSONRPCServer import SimpleJSONRPCDispatcher
from datetime import datetime
from django.db.models.loading import get_app, get_models
from offline.export_models import export_remotes
from django.conf import settings

__all__ = ('RemoteSite', 
           'expose',
           'RemoteModelProxy',
           )
 
def expose(url, *args, **kwargs):
    def decorator(func):
        def new_function(*args, **kwargs):
            return func(*args, **kwargs)
        new_function.expose = (url, args, kwargs)
        return new_function
    return decorator

def jsonrpc(func):
    def new_function(*args, **kwargs):
        return func(*args, **kwargs)
    new_function.jsonrpc = func
    new_function.__doc__ = func.__doc__
    return new_function

class RemoteSiteBase(type):
    def __new__(cls, name, bases, attrs):
        '''
        Generate the class attribute with the urls.
        '''
        new_class = super(RemoteSiteBase, cls).__new__(cls, name, bases, attrs)
        urls = []
        jsonrpc = []
        for ns in [attrs, ] + [ e.__dict__ for e in bases ]:
            for name, obj in ns.iteritems():
                if hasattr(obj, 'expose'):
                    #urls.append(obj.expose)
                    regex, _largs, kwargs = obj.expose
                    urls.append(RegexURLPattern(regex, obj, kwargs, ''))
                elif hasattr(obj, 'jsonrpc'):
                    jsonrpc.append(obj.jsonrpc.__name__)  
        if urls:
            new_class._urls = urls
        if jsonrpc:
            new_class._jsonrpc = jsonrpc
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

REMOTE_SITES = {}
class RemoteSite(RemoteBaseSite):
    '''
    Manages offline project support.
    @expose decorator indicates how URLs are mapped
    '''
    
    def __init__(self, name, protopy_root = None):
        
        global REMOTE_SITES
        if name in REMOTE_SITES:
            raise Exception("You can't define two RemoteSites with the same name")
        else:
            self.name = name
            REMOTE_SITES[self.name] = self
    
        if not protopy_root:
            from os.path import abspath, dirname, join
            protopy_root = getattr(get_app('offline'), '__file__')
            protopy_root = join(abspath(dirname(protopy_root)), 'protopy')
        self._protopy_root = protopy_root
        
        # Create a Dispatcher; this handles the calls and translates info to function maps
        #self.rpc_dispatcher = SimpleJSONRPCDispatcher() # Python 2.4
        self.rpc_dispatcher = SimpleJSONRPCDispatcher(allow_none=False, encoding=None) # Python 2.5
        self.rpc_dispatcher.register_introspection_functions() #Un poco de azucar
        self.rpc_dispatcher.register_instance(self)
        
        self._registry = {}
            
    protpy_root = property(lambda inst: inst._protopy_root)

    def _get_offline_root(self):
        return "/".join(['offline', self.name])
    offline_root = property(_get_offline_root)
    
    #TODO: ver si es absoluta o relativa o como cuernos lo manejamos
    def _get_offline_base(self):
        names = settings.OFFLINE_BASE.split("/")
        names.append(self.name)
        return "/".join(names)
    offline_base = property(_get_offline_base)
    
    @expose(r'^$')
    def index(self, request):
        return HttpResponse('Yo soy el RemoteSite %s' % self.name)
    
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
    
    @expose(r'^jsonrpc/?$')
    def jsonrpc_handler(self, request):
        """
        the actual handler:
        if you setup your urls.py properly, all calls to the xml-rpc service
        should be routed through here.
        If post data is defined, it assumes it's XML-RPC and tries to process as such
        Empty post assumes you're viewing from a browser and tells you about the service.
        """
    
        response = HttpResponse()
        if len(request.POST):
            response.write(self.rpc_dispatcher._marshaled_dispatch(request.raw_post_data))
        else:
            response.write("<b>This is an JSON-RPC Service.</b><br>")
            response.write("You need to invoke it using an JSON-RPC Client!<br>")
            response.write("The following methods are available:<ul>")
            methods = self.rpc_dispatcher.system_listMethods()
    
            for method in methods:
                # right now, my version of SimpleXMLRPCDispatcher always
                # returns "signatures not supported"... :(
                # but, in an ideal world it will tell users what args are expected
                sig = self.rpc_dispatcher.system_methodSignature(method)
    
                # this just reads your docblock, so fill it in!
                help =  self.rpc_dispatcher.system_methodHelp(method)
    
                response.write("<li><b>%s</b>: [%s] %s" % (method, sig, help))
    
            response.write("</ul>")
            response.write('<a href="http://www.djangoproject.com/"> <img src="http://media.djangoproject.com/img/badges/djangomade124x25_grey.gif" border="0" alt="Made with Django." title="Made with Django."></a>')
    
        response['Content-length'] = str(len(response.content))
        return response
    
    def __str__(self):
        return "<RemoteSite '%s'>" % self.name
    
    __repr__ = __str__
    
    def _listMethods(self):
        # this method must be present for system.listMethods to work
        return self._jsonrpc or []
    
    def _methodHelp(self, method):
        # this method must be present for system.methodHelp to work
        methods = self._jsonrpc or []
        if method in methods:
            return getattr(self, method).__doc__
        return ""
        
    def _dispatch(self, method, params):
        methods = self._jsonrpc or []
        if method in methods:
            return getattr(self, method)(*params)
        else:
            raise 'bad method'
    
    @jsonrpc
    def suma(self, a, b):
        '''
        suma(a, b) => Retorna la suma de los numeros a y b
        '''
        return a + b
    @jsonrpc
    def start_sync(self, sync_request):
        '''
        1) El cliente envía SyncRequest
            sreq = new SyncRequest()
            sreq.first = True
            sync_resp = send_sync_request(sreq); // Le pega a una url y un mￃﾩtodo de json-rpc
    
        2) El server le envía SyncResponse sr1:
            
            - model_order lista de dependencias de modelos
            - current_time
            - sync_id Identificación de sincronización (transacción) (el cliente lo envía con cada SyncRequest)
        '''
        now = datetime.now()
        date = now.strftime("%Y-%m-%dT%H:%M:%S")
        return {
                'model_order': [1, 2, 4, ],
                'current_time': date,
                'sync_id': None
                }
    
    @jsonrpc
    def model_dump(self, sync_request):
        '''
        4) El cliente envía en SyncRequest con el primer contenttype de sr1.model_order (lista de dependencias)
            for each (var model in sr1.model_order){
                sreq.model = model;
                sreq.sync_id = sr1.sync_id
                sresp2 = send_sync_request(sreq);
                
                for each (var data in sr2.reponse) {
                    // Falta pasar del contenttype a la clase del lado del clinete
                    // Asumimos que el _active y el _status viene del servidor
                    m = model(data.extend({_sync_log = sl}));
                    m.save()
                }
            }
        '''
        return {'app_name': 'foo',
                'model_name': 'bar', 
                'instances': []
        }
    
    
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
        
        if not request.method == "GET":
            return Http404("Manifest must be retreived via GET HTTP method")
        try:
            refered = request.GET['refered']
            if refered != '/':
                for path in [ '/', '/index.html', 'index.htm', '/index' ]:
                    m.add_entry( path, redirect = refered )
                m.add_entry(refered)
        except KeyError:
            pass
        
        #m.add_entry('/', redirect='')
        json = m.dump_manifest()
        
        if 'human' in request.GET:
            json = json.replace(', ', ',\n')
        
        return HttpResponse( json, 'text/plain' )

    @expose(r'^export/(?P<app_name>.*)/models.js$')
    def export_models_for_app(self, request, app_name):
        return render_to_response('djangoffline/models_example.js', mimetype = 'text/javascript')
    
    @expose(r'^export_/(?P<app_name>.*)/models.js$')
    def export_models_for_app_(self, request, app_name):
        from django.db.models.loading import get_app, get_models
        from offline.export_models import export_remotes
        
        try:
            
            model_remotes = filter(lambda x: x._meta.app_label == app_name, self._registry.values())
            #print model_remotes
            #app = get_app(app_name)
            
            #app_models = get_models(app)
            models = export_remotes(model_remotes)
            
            return render_to_response('djangoffline/models.js', 
                           locals(),
                           mimetype = 'text/javascript')
        
        except ImproperlyConfigured, e:
            return HttpResponseNotFound(str(e))
    
#        return render_to_response('djangoffline/models.js', locals(),
#                              mimetype = 'text/javascript')
#        
#        
#        return HttpResponse('a', mimetype = 'text/javascript')
    
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
            opts = RemoteOptions(meta)
            #server_id_class = type(opts.model.pk)
#            server_pk = copy.copy(opts.model._meta.pk)
#            server_pk.primary_key = False
#            server_pk.blank = True
#            server_pk.null = True
#            server_pk.help_text = 
#            attrs['server_pk'] = server_pk
            server_pk_type = type(opts.model._meta.pk)
            if server_pk_type is AutoField:
                server_pk_type = models.PositiveIntegerField
            server_pk = server_pk_type(
                                      name = "server_pk",
                                      #help_text = "Server ID",
                                      primary_key = False,
                                      null = True,
                                      blank = True
            )
            attrs['server_pk'] = server_pk
            #attrs['server_pk'] = copy.copy(opts.model._meta.pk)
            #attrs['server_pk'] = opts.model._meta.pk
            
            if not isinstance(opts.model._meta.pk, AutoField):
                pk_name = opts.model._meta.pk.name
                attrs[ pk_name ] = opts.model._meta.pk 
            
            attrs['_meta'] = opts
            #print attrs
            class_fields = {}
            
            field_check = lambda field: isinstance(field, models.Field)
            
            opts.fields = []
            
            for base in bases:
                for f_name, field in base.__dict__.iteritems():
                    if field_check(field):
                        if field.name != f_name:
                            field.name = f_name
                        opts.fields.append(field)
            
            for f_name, field in attrs.iteritems():
                if isinstance(field, models.Field):
                    if field.name != f_name:
                        field.name = f_name
                    opts.fields.append(field)
                    #print "Agregando field interno", f_name
        
        new_class = super(RemoteModelMetaclass, cls).__new__(cls, name, bases, attrs)
        return new_class


class RemoteModelProxy(object):
    __metaclass__ = RemoteModelMetaclass
    STATUS_CHOICES = (
                      ('s', 'Synced'),
                      ('c', 'Created'),
                      ('m', 'Modified'),
                      ('d', 'Deleted'),
                      # Otro cliente modifico la MISMA instancia y la comprobación de igualdad 
                      # dio falso.
                      ('b', 'Bogus'),
    )
    # Client ID
    #remote_id_column = models.CharField(max_length = 160, default = 'id')
    #_created_at = models.DateTimeField(editable = False)
    #_updated_at = models.DateTimeField(editable = False)
    _sync_log = models.ForeignKey(SyncLog, blank = True, null = True)
    _active = models.BooleanField(editable = False, default = True)
    _status = models.CharField(choices = STATUS_CHOICES, max_length = 1)
    #id_start = models.PositiveIntegerField()
    #_synced_at = models.DateTimeField(editable = False)
    
    
    def dump(self):
        '''
        '''
        pass
    
    def sync(self):
        pass
    
    
class RemoteOptions(object):
    def __init__(self, class_meta, **options):
        self.model = getattr(class_meta, 'model')
        
        #TODO: __module__ ???
        
        
        if not self.model or not issubclass(self.model, models.Model):
            raise ImproperlyConfigured("Invalid model %s" % self.model)
        
        if hasattr(class_meta, 'exclude'):
            exclude_fields = getattr(class_meta, 'exclude')
            # model_field_names is for checking purposes only
            model_field_names = map(lambda f: f.name, self.model._meta.fields +
                                                        self.model._meta.many_to_many
                                                    )
            for name in exclude_fields:
                if name not in model_field_names:
                    raise ImproperlyConfigured("%s has no %s field" % (self.model, name)) 
    
    app_label = property(lambda s: s.model._meta.app_label, doc="Points to model app_label")
    
    def __str__(self):
        return unicode("<RemoteOptions for %s>" % self.model._meta.object_name)
    