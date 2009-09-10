# -*- coding: utf-8 -*-
#coding: utf-8
'''
Remote model proxy for remote models in gears client.
'''
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseNotFound,\
    HttpResponseServerError
from django.http import Http404
from django.core.urlresolvers import Resolver404, RegexURLPattern
from django.utils.encoding import smart_str
from offline.models import SyncLog, GearsManifest, SyncData
from django.template import TemplateDoesNotExist, Template, Context
from django.utils.safestring import SafeString
from offline.debug import html_output
from django.core.exceptions import ImproperlyConfigured, ObjectDoesNotExist
from django.db import models
from django.contrib.admin.sites import AlreadyRegistered
from django.shortcuts import render_to_response
from django.db.models.fields import AutoField
from offline.util import get_project_root
import os, re
import random, string
from pprint import pformat
from django.db.models.loading import get_app
import copy
from offline.util.jsonrpc import SimpleJSONRPCDispatcher
from datetime import datetime
from django.db.models.loading import get_app, get_models
from offline.export_models import export_remotes
from offline.util import full_template_list, abswalk_with_simlinks
from django.db.models import signals
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db.models import exceptions
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
        

random_string = lambda length: ''.join( [ random.choice(string.letters) for _ in range(length) ] )

class RemoteBaseSite(object):
    '''
    For each offline application, there's a offline base
    '''
    __metaclass__ = RemoteSiteBase

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

        raise Http404(u"No url for «%s»" % (url, ))

REMOTE_SITES = {}
class RemoteSite(RemoteBaseSite):
    '''
    Manages offline project support.
    @expose decorator indicates how URLs are mapped
    '''
    TEMPLATES_PREFIX = 'templates'
    JS_PREFIX = 'js'
    LIB_PREFIX = 'lib'
    OFFLINE_ROOT = 'offline'
    
    TEMPLATE_RE_EXCLUDE = map(re.compile, (r'\.svn', r'\.hg', r'\.*~$'))
    #TODO: (nahuel) es necesario?
    TEMPLATE_CALLBACK_EXCLUDE = None
    
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
        self.protopy_root = protopy_root
        
        # Create a Dispatcher; this handles the calls and translates info to function maps
        #self.rpc_dispatcher = SimpleJSONRPCDispatcher() # Python 2.4
        self.rpc_dispatcher = SimpleJSONRPCDispatcher(allow_none=False, encoding=None) # Python 2.5
        self.rpc_dispatcher.register_introspection_functions() #Un poco de azucar
        self.rpc_dispatcher.register_instance(self)
        self._registry = {}
        
        
    
    def _get_project_root(self):
        return os.sep.join([get_project_root(), self.OFFLINE_ROOT, self.name])
    project_root = property(_get_project_root, doc = "File system offline location")

    def _get_url(self):
        names = settings.OFFLINE_BASE.split("/")
        names.append(self.name)
        return "/" + "/".join(names)
    url = property(_get_url, doc = "Absolute URL to the remote site")

    def _get_urlregex(self):
        if not self.url.startswith('/'):
            return self.url
        return self.url[1:]
    urlregex = property(_get_urlregex, doc = "For regex in url.py")
    
    def _get_js_url(self):
        return '/'.join([self.url, self.JS_PREFIX])
    js_url = property(_get_js_url, doc = "For something")
    
    def _get_lib_url(self):
        return '/'.join([self.url, self.LIB_PREFIX])
    lib_url = property(_get_lib_url, doc = "For lib")
    
    def _get_templates_url(self):
        return '/'.join([self.url, self.TEMPLATES_PREFIX])
    templates_url = property(_get_templates_url, doc = "Base url for templates")
    
    def _get_media_url(self):
        if settings.MEDIA_URL[-1] == '/':
            return settings.MEDIA_URL[:-1]
        return settings.MEDIA_URL
    media_url = property(_get_media_url, doc = "Media url")
    
    
    def _get_media_root(self):
        from django.conf import settings
        return os.path.abspath(settings.MEDIA_ROOT)
    media_root = property(_get_media_root, doc = "Medai root")
    
    
    #===========================================================================
    # View methods
    #===========================================================================
    @expose(r'^$')
    def index(self, request):
        content = '''
            <html>
            <head>
                <script type="text/javascript;version=1.7" src="{{ site.lib_url }}/protopy.js"></script>
                <script type="text/javascript;version=1.7">
                    require('doff.core.project', 'new_project');
                    var {{ site.name }} = new_project('{{ site.name }}', '{{ site.url }}');
                    {{ site.name }}.bootstrap();
                </script>
            </head>
            <body>
            </body>
            </html>
        '''
        template = Template(content);
        return HttpResponse(template.render(Context({'site': self})));

    @expose(r'^%s/(.*)$' % TEMPLATES_PREFIX)
    def templates_static_serve(self, request, path):
        from django.template.loader import find_template_source
        try:
            template_source, _origin = find_template_source(path)
        except TemplateDoesNotExist:
            return HttpResponseNotFound(u'404: template not found: \"%s\"' % path)
        return HttpResponse(template_source)

    @expose(r'^template_list/?$')
    def template_list(self, request):
        '''
        Debug
        ''' 
        return HttpResponse( html_output(full_template_list(), indent = 2))

    @expose('^%s/(.*)$' % LIB_PREFIX)
    def system_static_serve(self, request, path):
        from django.views.static import serve
        return serve(request, path, self.protopy_root, show_indexes = True)


    @expose('^%s/(.*)$' % JS_PREFIX)
    def project_static_serve(self, request, path):
        from django.views.static import serve
        try:
            return serve(request, path, self.project_root, show_indexes = False)
        except Http404, e:
            match = re.compile(r'^(?P<app_name>.*)/models.js$').match(path)
            if match:
                app = match.groupdict()['app_name']
                return self.export_models(app)
            raise e

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
    def echo(self, value):
        '''
        echo(value) => value
        '''
        return value
   
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
    
    #===========================================================================
    # Manifests
    #===========================================================================
    @expose('^manifest.json$')
    def manifest(self, request):
        '''
        For simlicity reasons, we merge both the protopy (aka system manifest)
        and the project manifest into mainfest.json
        Using the update_manifest command these manifests can be updated.
        '''
        try:
            manifest = GearsManifest.objects.get(remotesite_name = self.name)
        except ObjectDoesNotExist:
            return HttpResponseServerError("No manifest for '%s'. Please run manage.py manifest_update." % self.name)
        try:
            refered = request.GET['refered']
            if refered != '/':
                for path in [ '/', '/index.html', 'index.htm', '/index' ]:
                    manifest.add_fake_entry( url = path, redirect = refered )
                manifest.add_fake_entry(url = refered)
        except KeyError:
            pass
        js_output = manifest.json_dumps()
        #from ipdb import set_trace; set_trace()
        if request.GET.has_key('human'):
            js_output = js_output.replace(', ', ',\n')
        return HttpResponse(js_output, 'text/javascript')
    
    #===========================================================================
    # Models
    #===========================================================================
    def export_models(self, app_name):
        from django.db.models.loading import get_app, get_models
        from offline.export_models import export_remotes

        try:

            model_remotes = filter(lambda x: x._meta.app_label == app_name, self._registry[app_name].values())
            models = export_remotes(model_remotes)

            return render_to_response('djangoffline/models.js', 
                           {'models': models, 'app': app_name, 'site': self},
                           mimetype = 'text/javascript')

        except ImproperlyConfigured, e:
            return HttpResponseNotFound(str(e))

    #===========================================================================
    # Model handling
    #===========================================================================
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

        app = self._registry.setdefault(model._meta.app_label, {})
        app[model] = remote_proxy

        signals.post_save.connect(self.model_saved, model)
        signals.post_delete.connect(self.model_deleted, model)
        
    def model_saved(self, **kwargs):
        model_type = ContentType.objects.get_for_model(kwargs['sender'])
        try:
            sd = SyncData.objects.get(content_type__pk = model_type.id, object_id=kwargs['instance'].pk)
        except exceptions.ObjectDoesNotExist:
            sd = SyncData(content_object = kwargs['instance'])
        sd.active = True
        sd.save()
    
    def model_deleted(self, **kwargs):
        model_type = ContentType.objects.get_for_model(kwargs['sender'])
        sd = SyncData.objects.get(content_type__pk = model_type.id, object_id=kwargs['instance'].pk)
        sd.active = False
        sd.save()
        
    def app_names(self):
        return set(map( lambda m: m._meta.app_label, self._registry))
    
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
