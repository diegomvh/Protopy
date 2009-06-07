#! /usr/bin/env python
# -*- coding: utf-8 -*-


# translate_app app
# app debe estar en {{ settings.INSTALLED_APPS }}
# Creamos
# * crear {{ APP_PATH }}/remote_models.py
# * crear {{ OFF_APP_TEMPLATE}}/model_mixins.js
# * crear {{ OFF_APP_TEMPLATE }}/views.js
# * crear {{ OFF_APP_TEMPLATE }}/urls.js

from os.path import dirname, abspath, exists, join
from django.db.models.loading import get_app
import os, shutil

from django.core.management.base import *

class Command(AppCommand):
    help = """
        Probando el sistema de comandos de Django.
    """
    requires_model_validation = False
    can_import_settings = True
    
    def handle_app(self, app, **options):
        from django.conf import settings
        app_name = os.path.dirname( app.__file__ ).split( os.sep )[-1]
        
        djangogffilne_path = dirname(abspath(get_app('djangoffline').__file__))
        project_templates = join(djangogffilne_path, 'conf', 'remote_project_template')
        app_templates = join(djangogffilne_path, 'conf', 'app_template')
        remote_app_templates = join(djangogffilne_path, 'conf', 'remote_app_template')
        
        
        assert exists(project_templates), _("Error with templates")
        
        project_name = os.environ.get('DJANGO_SETTINGS_MODULE').replace('.settings', '')
        
        app_path = os.path.join(settings.OFFLINE_ROOT, app_name)
        if os.path.exists(app_path):
            sys.stderr.write("""
                App %s seems to be already migrated
            """ % app_name)
            sys.exit(2)
        os.path.mkdir(app_path)
        
             
                