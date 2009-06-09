#! /usr/bin/env python
# -*- coding: utf-8 -*-


# translate_app app
# app debe estar en {{ settings.INSTALLED_APPS }}
# Creamos
# * crear {{ APP_PATH }}/remote_models.py
# * crear {{ OFFLINE_ROOT}}/{{APP_NAME}}/models.js
# * crear {{ OFFLINE_ROOT}}/{{APP_NAME}}/views.js
# * crear {{ OFFLINE_ROOT}}/{{APP_NAME}}/urls.js

from os.path import dirname, abspath, exists, join
from django.db.models.loading import get_app
from django.template import Template
from django.template.context import Context
import os, glob
from os.path import basename

from django.core.management.base import *

class Command(AppCommand):
    help = """
        Probando el sistema de comandos de Django.
    """
    requires_model_validation = True
    can_import_settings = True
    
    def handle_app(self, app, **options):
        from django.conf import settings
        from django.db.models.loading import get_model, get_models, get_apps
        from djangoffline.management.commands import fill_templates, get_template_colision
        
        app_name = os.path.dirname( app.__file__ ).split( os.sep )[-1]
        
        djangogffilne_path = dirname(abspath(get_app('djangoffline').__file__))
        project_template = join(djangogffilne_path, 'conf', 'remote_project_template')
        app_template = join(djangogffilne_path, 'conf', 'app_template')
        remote_app_template = join(djangogffilne_path, 'conf', 'remote_app_template')
        
        
        assert exists(project_template), _("Error with templates")
        
        project_name = os.environ.get('DJANGO_SETTINGS_MODULE').replace('.settings', '')
        
        app_path = os.path.join(settings.OFFLINE_ROOT, app_name)
#        if os.path.exists(app_path):
#            sys.stderr.write("""
#                App %s seems to be already migrated
#            """ % app_name)
#            sys.exit(2)
        try:
            os.mkdir( app_path )
        except:
            pass
        
        
        models = get_models(get_app(app_name))
        models = dict ( map (lambda m: (m._meta.object_name, m), models ))
        
        remote_app_templates = glob.glob( '%s%s*'  % (remote_app_template, os.sep))
        
        
        fill_templates(
                       remote_app_templates,
                       app_path,
                       locals()
                       )
            
        app_templates = glob.glob( '%s%s*' % (app_template, os.sep) )
        
        fill_templates(app_templates, app_path, locals() )
        
#        for fname in app_templates:
#            f = open(fname, 'r')
#            raw_template = f.read()
#            f.close()
#            
#            template = Template(raw_template)
#            context = Context(locals())
#            
#            base_name = basename(fname)
#            
#            dst = join(app_path, base_name)
#            f = open(dst, 'w')
#            try:
#                f.write(template.render(context))
#            except Exception, e:
#                print "Error en el template %s" % e
#            f.close()
#            print "%s written" % dst
        
        
             
            