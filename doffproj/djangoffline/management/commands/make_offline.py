#! /usr/bin/env python
# -*- coding: utf-8 -*-


# make_offline 
# genera el {{ settings.OFFLINE_ROOT }}/offline_{{ PROJECT_NAME }}/settings.js
# {{ settings.OFFLINE_ROOT }}/offline_{{ PROJECT_NAME }}/urls.js
#
#

from django.core.management.base import *

class Command(NoArgsCommand):
    help = """
        Probando el sistema de comandos de Django.
    """
    requires_model_validation = False
    can_import_settings = True
    
    def handle_noargs(self, **options):
        print "Hola mundo"
