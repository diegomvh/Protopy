#! /usr/bin/env python
# -*- coding: utf-8 -*-


from django.core.management.base import *
from offline.models import Manifest
from offline.remote import random_string
import os
import sys

#TODO: Update if changed based on file modification date
class Command(LabelCommand):
    help = """
        Probando el sistema de comandos de Django.
    """
    requires_model_validation = False
    can_import_settings = True
    
    def handle_label(self, remotesite_name, **options):
        from django.conf import settings
        
        try:
            m = Manifest.objects.get(remotesite_name = remotesite_name)
        except Exception, e:
            print e
            print "Creating new manifest for %s" % remotesite_name
            m = Manifest()
        #template_base = self.offline_base.split('/') + ['templates', ] 
        
        # genreate random version string
        m.version = random_string(32)
        
        #remotesite = 
        
        #m.add_uris_from_pathwalk(path, uri_base, exclude_callback, followlinks)
        
        #m.add_uris_from_pathwalk(self.offline_root, '/%s/project' % self.offline_base)
        # Add templates
        #for t in full_template_list():
        #    m.add_entry( '/%s' % '/'.join( filter(bool, template_base + t.split(os.sep))))
            
        #app_labels = set(map( lambda model: model._meta.app_label, self._registry))
        
        #for app in app_labels:
        #    m.add_entry('/%s/export/%s/models.js' % (self.offline_base, app))
            
        


