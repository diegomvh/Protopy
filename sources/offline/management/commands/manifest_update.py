#! /usr/bin/env python
# -*- coding: utf-8 -*-


from django.core.management.base import *
from offline.models import Manifest
import os
import sys

class Command(LabelCommand):
    help = """
        Probando el sistema de comandos de Django.
    """
    requires_model_validation = False
    can_import_settings = True
    
    def handle_label(self, offline_root, **options):
        if not os.path.exists(offline_root):
            sys.stderr.write("%s does not exist\n" % offline_root)
            sys.exit(-1)
        else:
            offline_root = os.path.abspath(offline_root)
            manifests = Manifest.objects.filter(offline_root = offline_root)
            
            
            
    
    
