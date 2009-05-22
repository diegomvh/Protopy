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
import os

from django.core.management.base import *

class Command(AppCommand):
    help = """
        Probando el sistema de comandos de Django.
    """
    requires_model_validation = False
    can_import_settings = True
    
    def handle_app(self, app, **options):
        print app
        
        djangogffilne_path = dirname(abspath(get_app('djangoffline').__file__))
        project_templates = join(djangogffilne_path, 'conf', 'project_template')
        
        assert exists(project_templates), _("Error with templates")
        
        project_name = os.environ.get('DJANGO_SETTINGS_MODULE').replace('.settings', '')
