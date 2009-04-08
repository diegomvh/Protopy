#! /usr/bin/env python
# -*- coding: utf-8 -*-


from django.core.management.base import *

class Command(NoArgsCommand):
    help = """
        Probando el sistema de comandos de Django.
    """
    requires_model_validation = False
    can_import_settings = True
    
    def handle_noargs(self, **options):
        print "Hola mundo"
