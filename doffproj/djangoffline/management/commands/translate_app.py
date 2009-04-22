#! /usr/bin/env python
# -*- coding: utf-8 -*-


# translate_app app
# app debe estar en {{ settings.INSTALLED_APPS }}
# Creamos
# * crear {{ APP_PATH }}/remote_models.py
# * crear {{ OFF_APP_TEMPLATE}}/model_mixins.js
# * crear {{ OFF_APP_TEMPLATE }}/views.js
# * crear {{ OFF_APP_TEMPLATE }}/urls.js


from django.core.management.base import *

class Command(NoArgsCommand):
    help = """
        Probando el sistema de comandos de Django.
    """
    requires_model_validation = False
    can_import_settings = True
    
    def handle_noargs(self, **options):
        print "Hola mundo"
