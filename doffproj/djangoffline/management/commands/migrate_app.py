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
from djangoffline.management.commands import get_template_colision
import os, glob
from os.path import basename

from django.core.management.base import *

class Command(AppCommand):
    help = """
        Creates the skeleton for an a offline app in OFFLINE_ROOT.
    """
    
    option_list = (
                    make_option('-f', '--force', action='store_true', default = False),
                    
    ) + AppCommand.option_list
    
    requires_model_validation = True
    can_import_settings = True
    
    def handle_app(self, app, **options):
        from django.conf import settings
        from django.db.models.loading import get_model, get_models, get_apps
        from djangoffline.management.commands import fill_templates, get_template_colision
        
        app_root = dirname(app.__file__)
        app_name = app_root.split( os.sep )[-1]
        
        djangogffilne_path = dirname(abspath(get_app('djangoffline').__file__))
        project_template = join(djangogffilne_path, 'conf', 'remote_project_template')
        app_template = join(djangogffilne_path, 'conf', 'app_template')
        remote_app_template = join(djangogffilne_path, 'conf', 'remote_app_template')
        
        assert exists(project_template), _("Error with templates")
        
        project_name = os.environ.get('DJANGO_SETTINGS_MODULE').replace('.settings', '')
        
        app_path = os.path.join(settings.OFFLINE_ROOT, app_name)
        
        try:
            os.mkdir( app_path )
        except:
            pass
        
        models = get_models(get_app(app_name))
        models = dict ( map (lambda m: (m._meta.object_name, m), models ))
        
        remote_app_templates = glob.glob( '%s%s*'  % (remote_app_template, os.sep))
        app_templates = glob.glob( '%s%s*' % (app_template, os.sep) )
        
        # Detect colisions
        colisions = filter( lambda x: x, [ get_template_colision( remote_app_templates, app_path ),
                    get_template_colision( app_templates, app_root ) ])
        
        if any(colisions):
            if options.get('force'):
                sys.stderr.write('Overwritting files\n')
            else:
                sys.stderr.write("File colisions %s" % colisions.pop())
                sys.exit(-1)
                        
        fill_templates( remote_app_templates, app_path, locals() )
        
        fill_templates(app_templates, app_root, locals() )
        
