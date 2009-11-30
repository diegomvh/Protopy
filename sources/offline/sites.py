# -*- coding: utf-8 -*-

# From python
import datetime
import time
import os, re

from django.http import HttpResponse, HttpResponseNotFound, HttpResponseServerError
from django.http import Http404
from django.core.urlresolvers import Resolver404, RegexURLPattern
from django.utils.encoding import smart_str
from django.template import TemplateDoesNotExist, Template, Context
from offline.debug import html_output
from django.db import models
from django.core.exceptions import ImproperlyConfigured, ObjectDoesNotExist
from django.contrib.admin.sites import AlreadyRegistered
from django.shortcuts import render_to_response
from offline.util.jsonrpc import SimpleJSONRPCDispatcher
from django.db.models.loading import get_app, get_model
from offline.util import random_string, get_project_root, full_template_list
from offline.models import GearsManifest, SyncData
from django.db.models import signals
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db.models import exceptions
from offline.export_models import export_remotes, get_model_order,\
    get_related_models, get_related_apps
from offline.remotes import RemoteModelProxy, RemoteReadOnlyModelProxy, RemoteOptions, RemoteManager, RemoteReadOnlyManager

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

class RemoteBaseSite(object):
    '''
    For each offline application, there's a offline base
    '''
    __metaclass__ = RemoteSiteBase

    def root(self, request, url):
        for pattern in self._urls:
            try:
                sub_match = pattern.resolve(url)
            except Resolver404:
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

# This module variable holds remote site instances, so that
REMOTE_SITES = {}
class RemoteSite(RemoteBaseSite):
    '''
    Manages offline project support.
    @expose decorator indicates how URLs are mapped
    '''
    TEMPLATES_PREFIX = 'templates'
    JS_PREFIX = 'js'
    LIB_PREFIX = 'lib'
    #OFFLINE_ROOT = 'offline'
    OFFLINE_ROOT = settings.OFFLINE_BASE
    
    TEMPLATE_RE_EXCLUDE = map(re.compile, (r'\.svn', r'\.hg', r'\.*~$'))
    #TODO: (nahuel) es necesario?
    TEMPLATE_CALLBACK_EXCLUDE = None
    
    def __init__(self, name, protopy_root = None):

        global REMOTE_SITES
        if name in REMOTE_SITES:
            raise Exception("You can't define two RemoteSites with the same name")
        else:
            self.name = name
            REMOTE_SITES[ self.name ] = self

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
        if settings.MEDIA_URL and settings.MEDIA_URL[-1] == '/':
            return settings.MEDIA_URL[:-1]
        return settings.MEDIA_URL
    media_url = property(_get_media_url, doc = "Media url")
    
    def _get_media_root(self):
        if not settings.MEDIA_ROOT:
            raise Exception("MEDIA_ROOT not definded!")
        return os.path.abspath(settings.MEDIA_ROOT)
    media_root = property(_get_media_root, doc = "Media root")
    
    
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
        print self.name, self.url 
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

    @expose(r'^sync/?$')
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

    @expose(r'^data/(?P<app_label>\w+)/(?P<model_name>\w+)/$')
    def data(self, request, app_label, model_name):
        response = HttpResponse()
        models = self._registry.get(app_label, None)
        if models == None:
            response.write("<b>This is an JSON-RPC Service.</b><br>")
            response.write("You need to invoke it using an JSON-RPC Client!<br>")
        else:
            model = get_model(app_label, model_name)
            if request.method == 'POST':
                proxy = models[model]
                response.write(proxy.remotes._marshaled_dispatch(request.raw_post_data))
            else:
                proxy = models[model]
                response.write("<b>This is an JSON-RPC Service.</b><br>")
                response.write("You need to invoke it using an JSON-RPC Client!<br>")
                response.write("The following methods are available:<ul>")
                methods = proxy.remotes.system_listMethods()

                for method in methods:
                    # right now, my version of SimpleXMLRPCDispatcher always
                    # returns "signatures not supported"... :(
                    # but, in an ideal world it will tell users what args are expected
                    sig = proxy.remotes.system_methodSignature(method)

                    # this just reads your docblock, so fill it in!
                    help =  proxy.remotes.system_methodHelp(method)

                    response.write("<li><b>%s</b>: [%s] %s" % (method, sig, help))

                response.write("</ul>")
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
        return value

    @jsonrpc
    def user(self):
        #TODO Controlar el error si no esta el middleware
        from offline.middleware import threadlocals
        user = threadlocals.get_current_user()
        data = {
                'class': 'AnonymousUser',
                'username': user.username,
                'is_staff': user.is_staff,
                'is_active': user.is_active,
                'is_superuser': user.is_superuser
                }
        if not user.is_anonymous():
            data.update({
                'class': 'User',
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'password': user.password,
                })
        return data
    
    @jsonrpc
    def authenticate(self, username, password):
        from django.contrib.auth import authenticate
        user = authenticate(username=username, password=password)
        if user is not None and user.is_active:
            user = {
                    'class': 'User',
                    'username': user.username,
                    'is_staff': user.is_staff,
                    'is_active': user.is_active,
                    'is_superuser': user.is_superuser
                    }
        return user

    #===========================================================================
    # Synchronization
    #===========================================================================
    @jsonrpc
    def pull(self, sync_log = None):
        retorno = {}
        first = sync_log == None

        new_sync = datetime.datetime.now()
        if not first:
            last_sync = datetime.datetime(*time.strptime(sync_log['fields']['synced_at'], '%Y-%m-%d %H:%M:%S')[:6])

        # Veamos los modelos
        # TODO: Mejorar esto de meterle mano al SyncData
        models = []
        for app in self._registry.values():
            for model in app.keys():
                # Si no es el primero filtro solo los modelos interesantes
                if not first:
                    model_type = ContentType.objects.get_for_model(model)
                    sd = SyncData.objects.filter(content_type__pk = model_type.id, update_at__gt=last_sync).filter(update_at__lt=new_sync)
                    if bool(sd):
                        models.append(model)
                else:
                    models.append(model)

        models = get_model_order(models)
        retorno['models'] = map(lambda m: str(m._meta), models)
        retorno['objects'] = []
        for model in models:
            remote = self._registry[model._meta.app_label][model]
            remote_manager = remote._default_manager
            # Si no es el primero filtro solo los objetos de modelos interesantes
            if first:
                retorno['objects'].extend(remote_manager.all())
            else:
                retorno['objects'].extend(remote_manager.filter(update_at__gt = last_sync, update_at__lt = new_sync))

        retorno['sync_log'] = {}
        retorno['sync_log']['synced_at'] = new_sync.strftime("%Y-%m-%d %H:%M:%S")
        retorno['sync_log']['sync_id'] = random_string(32)

        return retorno

    @jsonrpc
    def push(self, received):
        #TODO: Tirar errores
        retorno = {}

        # Validacion
        remote_deleted = dict(map(lambda m: (m, self.get_remote(m)), received['deleted']['models']))
        remote_modified = dict(map(lambda m: (m, self.get_remote(m)), received['modified']['models']))
        remote_created = dict(map(lambda m: (m, self.get_remote(m)), received['created']['models']))

        # Hay un remote para cada modelo ? 
        if not all(remote_deleted.values() + remote_modified.values() + remote_created.values()):
            raise Exception('Remote Error')

        # Por cada cambio que quiero meter, tenes el utimo sync log?
        all_models = set(received['deleted']['models'] + received['modified']['models'] + received['created']['models'])
        for app_model in all_models:
            model = get_model(*app_model.split('.'))
            last_sync = datetime.datetime(*time.strptime(received['sync_log'][app_model]['fields']['synced_at'], '%Y-%m-%d %H:%M:%S')[:6])
            model_type = ContentType.objects.get_for_model(model)
            sd = SyncData.objects.filter(content_type__pk = model_type.id, update_at__gt = last_sync)
            if bool(sd):
                raise Exception('Need Pull')

        # Cada cambio que quiere meter tiene sus objetos correspondientes?

        # Si estamos aca es porque todo bien, los cambios entran
        retorno['deleted'] = {'models': received['deleted']['models'], 'pks': {}}
        retorno['modified'] = {'models': received['modified']['models'], 'pks': {}}
        retorno['created'] = {'models': received['created']['models'], 'pks': {}}

        # Primero los borrados
        for app_model, remote in remote_deleted.iteritems():
            remote_manager = remote._default_manager
            retorno['deleted']['pks'][app_model] = remote_manager.delete(received['deleted']['objects'][app_model])

        # Luego modificados
        for app_model, remote in remote_modified.iteritems():
            remote_manager = remote._default_manager
            retorno['modified']['pks'][app_model] = remote_manager.update(received['modified']['objects'][app_model])

        # Terminando los Creados
        for app_model, remote in remote_created.iteritems():
            remote_manager = remote._default_manager
            retorno['created']['pks'][app_model] = remote_manager.insert(received['created']['objects'][app_model])

        new_sync = datetime.datetime.now()

        retorno['sync_log'] = {}
        retorno['sync_log']['synced_at'] = new_sync.strftime("%Y-%m-%d %H:%M:%S")
        retorno['sync_log']['sync_id'] = random_string(32)

        return retorno

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
        js_output = manifest.json_dumps()
        #from ipdb import set_trace; set_trace()
        if request.GET.has_key('human'):
            js_output = js_output.replace(', ', ',\n')
        return HttpResponse(js_output, 'text/javascript')
    
    #===========================================================================
    # Models
    #===========================================================================
    def export_models(self, app_label):
        try:
            models = export_remotes(self._registry[app_label])
            models = map(lambda m: (m[0]._meta.object_name, \
                            issubclass(self._registry[app_label][m[0]], RemoteModelProxy) and 'RemoteModel' or 'RemoteReadOnlyModel', \
                            m[1]), models.items())
            related_apps = get_related_apps(self._registry[app_label])
            related_apps.discard(app_label)
            return render_to_response(
                            'djangoffline/models.js',
                           {'models': models, 'apps': related_apps, 'app': app_label, 'site': self},
                           mimetype = 'text/javascript')

        except ImproperlyConfigured, e:
            return HttpResponseNotFound(str(e))

    #===========================================================================
    # Model handling
    #===========================================================================
    def register(self, model_or_proxy):
        remote_proxy = None
        model = None
        
        if issubclass(model_or_proxy, RemoteModelProxy):
            model = model_or_proxy._meta.model
            remote_proxy = model_or_proxy
        elif issubclass(model_or_proxy, models.Model):
            model = model_or_proxy
            # If no class is given, create a basic one based on the model
            name = model._meta.object_name
            basic_meta = type('%sMeta' % name, (object,), {'model': model})
            remote_proxy = type('%sRemote' % name, 
                                (RemoteModelProxy, ), 
                                {'Meta': RemoteOptions(basic_meta)} )
        else:
            raise Exception("%s is not a Models or RemoteModelProxy subclass" % model_or_proxy)
            
        app_registry = self._registry.setdefault(model._meta.app_label, {})

        if model in app_registry and not isinstance(app_registry[model], RemoteReadOnlyModelProxy):
            raise AlreadyRegistered("%s is already registered" % model)
        elif model not in app_registry:
            signals.post_save.connect(self.model_saved, model)
            signals.post_delete.connect(self.model_deleted, model)

        app_registry[model] = remote_proxy
        rm = RemoteManager()
        rm.contribute_to_class(remote_proxy)
        
        related_models = get_related_models(model, remote_proxy)
        for related_model in related_models:
            app_registry = self._registry.setdefault(related_model._meta.app_label, {})
            if related_model in app_registry:
                continue
            signals.post_save.connect(self.model_saved, related_model)
            signals.post_delete.connect(self.model_deleted, related_model)

            name = related_model._meta.object_name
            basic_meta = type('%sMeta' % name, (object,), {'model': related_model })
            remote_proxy = type('%sRemote' % name,
                                (RemoteReadOnlyModelProxy, ),
                                {'Meta': RemoteOptions(basic_meta)} )

            app_registry[related_model] = remote_proxy
            rm = RemoteReadOnlyManager()
            rm.contribute_to_class(remote_proxy)

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
        try:
            sd = SyncData.objects.get(content_type__pk = model_type.id, object_id=kwargs['instance'].pk)
        except exceptions.ObjectDoesNotExist:
            sd = SyncData(content_object = kwargs['instance'])
        sd.active = False
        sd.save()

    def app_names(self):
        '''
        Returns the  app_labels handled by a RemoteSite.
        '''
        #return set(map( lambda m: m._meta.app_label, self._registry))
        return self._registry.keys()

    def get_remote(self, app_model):
        app_label, model_name = app_model.split('.')
        models = self._registry.get(app_label, None)
        if models:
            model = get_model(app_label, model_name)
            return models[model]
        return None