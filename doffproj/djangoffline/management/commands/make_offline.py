#! /usr/bin/env python
# -*- coding: utf-8 -*-


# make_offline 
# genera el {{ settings.OFFLINE_ROOT }}/offline_{{ PROJECT_NAME }}/settings.js
# {{ settings.OFFLINE_ROOT }}/offline_{{ PROJECT_NAME }}/urls.js
#
#

from django.core.management.base import *
from django.utils.translation import gettext_lazy as _
from os.path import abspath, dirname

class Command(AppCommand):
    help = """
        Probando el sistema de comandos de Django.
    """
    requires_model_validation = False
    can_import_settings = True
    
    #def handle_noargs(self, **options):
    #    print "Hola mundo"
    def handle_app(self, app, **options):
        print app, options
        if hasattr(app, '__file__'):
            path = dirname( abspath( app.__file__ ) ) 
            print "*" * 40
            print path
            
        else:
            print _("Can't handle module") 
        import ipdb; ipdb.set_trace()
