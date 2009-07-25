#! /usr/bin/env python
# -*- coding: utf-8 -*-

from django.core.management.base import *
#from offline.models import Manifest
from offline.models import GearsManifest, GearsManifestEntry
from django.db import models 
#TODO: (d3f0)Move away code from
from offline.sites import random_string
from offline.util import get_site, get_site_root, excluding_abswalk_with_simlinks 
import os
import sys
from pprint import pprint

#TODO: Update if changed based on file modification date
class Command(LabelCommand):
    help = \
    """
        This command updates manifest files for remote site sincronization.
    """
    requires_model_validation = False
    can_import_settings = True
    
    def handle_label(self, remotesite_name, **options):
        from django.conf import settings
        site = get_site(remotesite_name)
        if not site:
            print "Can't find any site by the name '%s'" % remotesite_name
            # Won't exit if it fails since more than one site maight have been
            # passed to the command
            #sys.exit(3)
            return
        try:
            manifest = GearsManifest.objects.get(remotesite_name = remotesite_name)
        except models.exceptions.ObjectDoesNotExist:
            print "No resmote instance"
            manifest = GearsManifest()
            manifest.remotesite_name = remotesite_name
            
        except (models.exceptions.FieldError, models.exceptions.ValidationError):
            print "Syncdb?"
            return
        
        entries = manifest.gearsmanifestentry_set.count()
        
        offline_base = site.offline_base
        splitted_offline_base = offline_base.split('/')
        # Cambiar el numero de version
        if not manifest.version:
            manifest.version = random_string(32)
        print manifest.version
        
        # Application Code
        file_list = []
        site_root = get_site_root(remotesite_name)
        for f in excluding_abswalk_with_simlinks(site_root):
            pth = f[ f.index(site_root) + len(site_root) + 1: ]
            pth = pth.split(os.sep)
            pth = '/'.join( splitted_offline_base + pth)
            file_list.append({'url': pth, 'file': f, 'mtime': os.path.getmtime(f), 'size': os.path.getsize(f)})
        
        
        pprint(locals())
        #manifest.add_uris_from_pathwalk(path, uri_base, exclude_callback, followlinks)
        #from ipdb import set_trace; set_trace()
        
#        try:
#            m = Manifest.objects.get(remotesite_name = remotesite_name)
#        except Exception, e:
#            print e
#            print "Creating new manifest for %s" % remotesite_name
#            m = Manifest()
        #template_base = self.offline_base.split('/') + ['templates', ] 
        
        # genreate random version string
#        m.version = random_string(32)
        
        #remotesite = 
        
        #m.add_uris_from_pathwalk(path, uri_base, exclude_callback, followlinks)
        
        #m.add_uris_from_pathwalk(self.offline_root, '/%s/project' % self.offline_base)
        # Add templates
        #for t in full_template_list():
        #    m.add_entry( '/%s' % '/'.join( filter(bool, template_base + t.split(os.sep))))
            
        #app_labels = set(map( lambda model: model._meta.app_label, self._registry))
        
        #for app in app_labels:
        #    m.add_entry('/%s/export/%s/models.js' % (self.offline_base, app))
            
        


