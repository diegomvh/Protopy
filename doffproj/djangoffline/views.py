# -*- encoding: utf-8 -*-

from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.db.models import get_app, get_apps, get_model, get_models
from django.core.exceptions import ImproperlyConfigured
from django.http import HttpResponse, Http404, HttpResponseNotFound
from django.utils.html import escape
from django.template import TemplateDoesNotExist
from django.shortcuts import render_to_response
from djangoffline.models import Manifest
import inspect
from pprint import pformat
from remotemodels import RemoteModelProxy
import os
import re
from djangoffline.debug import html_output
 
def create_system_manifest(request):
    version = None

def create_project_manifest(request):
    version = None


def conditional_import(name, f):
    e = []
    mod = __import__(name)
    components = name.split('.')
    for comp in components[1:]:
        mod = getattr(mod, comp)
    for v in mod.__dict__.itervalues():
        if (f(v)):
            e.append(v)
    return e


def export_model_proxy(request):
    assert hasattr(settings, 'OFFLINE_APPS'), _('You must add OFFLINE_APPS to settings.')
    apps = []
    
    for offline_app_str in settings.OFFLINE_APPS:
        try:
            prj_name, app_label = offline_app_str.split('.')
            app = get_app( app_label )
            models = get_models( app )
            models_dict = dict(map( lambda mod: (mod.__name__, mod), models ))
            mod_name = app.__name__.replace('.models', '.remotemodels')
            print "*" * 40
            print mod_name
            print "*" * 40
            proxys = conditional_import(mod_name, lambda x: inspect.isclass(x) and RemoteModelProxy in inspect.getmro(x))
            
                
        except ValueError:
            raise Exception(_("%s can't be found as an app. You should inlude them as PROJETC_NAME(dot)APP_LABEL") % offline_app_str)
        except ImproperlyConfigured:
            raise Exception(_("%s is included as an offlineapp but it doesn't seem to be included") % offline_app_str)
        except ImportError, e:
            print e
            raise Exception(_("%s has no remotemodels, please crete a remotemodels.py in %s folder") % 
                                (offline_app_str, offline_app_str.replace('.', '/')))
    
    return HttpResponse('<pre>%s</pre>' % escape( pformat(models_dict) ))
    
# TODO: (nahuel) Use Filsesystem's enconding for names

INVALID_TEMPLATE_SUFFIXES = re.compile(r'(?:~|#)$')
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


    

def list_templates(request):
    # Retrieve template full list
    
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
        
    
    return HttpResponse( html_output(template_files, indent = 2))


def template_static_serve(request, path):
    from django.template.loader import find_template_source
    try:
        template_source, _origin = find_template_source(path)
    except TemplateDoesNotExist:
        return HttpResponseNotFound(u'404: template not found: \"%s\"' % path)
    return HttpResponse(template_source)


def build_manifest(request):
    return 

def project_static_serve(request, path):
    return

def index(request):
    keys = 'OFFLINE_BASE', 'OFFLINE_ROOT'
    # Filter some settings values
    data = dict( map(lambda n: (n, getattr(settings, n, None)), keys ) )
    
    return render_to_response('djangoffline/index.html', data)

def get_manifest(request):
    latest_manifest = Manifest.objects.latest('version')
    output = latest_manifest.dump_manifest()
    output = output.replace(', ', ',\n')
    return HttpResponse( output, 'text/plain' )


def get_project_manifest(request):
    import random, string
    m = Manifest()
    # genreate random version string
    m.version = ''.join( [ random.choice(string.letters) for _ in range(32) ] )
    
    def uris_from_pathwalk(path, uri_base, exclude_callback = None ):
        file_list = []
        for pth, _dirs, files in os.walk(path):
            tmp_list = map( lambda n: os.path.join( pth, n), files)
            if callable(exclude_callback):
                tmp_list = filter(exclude_callback, tmp_list)
            
            tmp_list = map( lambda n: '%s/%s' % (
                            uri_base,                     
                            n[ n.index(path) + len(path) + 1: ]      
                            ),
                            tmp_list)
            file_list += tmp_list
        return file_list
    
    for uri in uris_from_pathwalk(settings.OFFLINE_ROOT, '/%s' % settings.OFFLINE_BASE):
        m.add_entry(uri) 
    json = m.dump_manifest()
    
    if 'human' in request.GET:
        json = json.replace(', ', ',\n')
    
    return HttpResponse( json, 'text/plain' )
