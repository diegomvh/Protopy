#! /usr/bin/env python
# -*- coding: utf-8 -*-
"""

 migrate_app app
 La app debe estar en {{ settings.INSTALLED_APPS }}
 Creamos
 * crear {{ APP_PATH }}/remote_models.py
 * crear {{ OFFLINE_ROOT}}/{{APP_NAME}}/models.js
 * crear {{ OFFLINE_ROOT}}/{{APP_NAME}}/views.js
 * crear {{ OFFLINE_ROOT}}/{{APP_NAME}}/urls.js


"""
from os.path import dirname, abspath, exists, join
from django.db.models.loading import get_app
from django.template import Template
from django.template.context import Context
from offline.management.commands import get_template_colision
from django.core.exceptions import ImproperlyConfigured
import os, glob
from os.path import basename
import sys
from django.core.management.base import BaseCommand, make_option, CommandError

class Command(BaseCommand):
    help = """
        Creates the skeleton for an a offline app in the remote site.
    """
    
    option_list = (
                    make_option('-f', '--force', action='store_true', default = False),
                    
    ) + BaseCommand.option_list
    
    requires_model_validation = True
    can_import_settings = True
    
    
    def handle(self, *remote_and_apps, **largs):
        from django.db import models
        from django.conf import settings
        # Remotesite
        mod = __import__(settings.ROOT_URLCONF)
        from offline.sites import REMOTE_SITES
        
        if not REMOTE_SITES:
            raise CommandError("No remote sites registered at ROOT_URLCONF.")
        
        if not remote_and_apps:
            raise CommandError("Remote site missing")
        
        remote_site_name = remote_and_apps[0]
        
        
        if remote_site_name in REMOTE_SITES:
            remote_site = REMOTE_SITES[remote_site_name]
        else:
            raise CommandError("Remote Site named '%s' does not exist. There are %d" % 
                                (remote_site_name, len(REMOTE_SITES)) +
                               " remote sites registered: %s" % ','.join(REMOTE_SITES.keys()))
        
        app_labels =  remote_and_apps[1:]
        
        try:
            app_list = [models.get_app(app_label) for app_label in app_labels]
        except (ImproperlyConfigured, ImportError), e:
            raise CommandError("%s. Are you sure your INSTALLED_APPS setting is correct?" % e)
        
        for app in app_list:
            pass
        
        
        print remote_site_name, app_labels
    
    
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
        
