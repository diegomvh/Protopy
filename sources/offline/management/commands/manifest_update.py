#! /usr/bin/env python
# -*- coding: utf-8 -*-

from django.core.management.base import *
#from offline.models import Manifest
from offline.models import GearsManifest, GearsManifestEntry
from django.db import models 
#TODO: (d3f0)Move away code from
from offline.sites import random_string
from offline.util import get_site, get_site_root, excluding_abswalk_with_simlinks ,\
    full_template_list, abswalk_with_simlinks
from offline.util import get_project_root
from django.template.loader import find_template_source
import os
import sys
import time
from pprint import pprint

try:
    from os.path import relpath as relativepath
except ImportError, e:
    from offline.util import relpath as relativepath

from django.db.models import exceptions
#TODO: Update if changed based on file modification date
class Command(LabelCommand):
    help = \
    """
        This command updates manifest files for remote site sincronization.
    """
    requires_model_validation = False
    can_import_settings = True
    
    option_list = LabelCommand.option_list + (
        make_option('-c', '--clear', action='store_true', dest='clear', default = False,
                    help="Clears application manifests"),
        make_option('-r', '--ver', action='store', dest='version', 
                    help = "Version")                                      
        )
    
    def invalid_file(self, path):
        for regex in self.site.TEMPLATE_RE_EXCLUDE:
            if regex.search(path):
                return True
        
    
    def handle_label(self, remotesite_name, **options):
        from django.conf import settings
        self.site = get_site(remotesite_name)
        if not self.site:
            print "Can't find any site by the name '%s'" % remotesite_name
            # Won't exit if it fails since more than one site maight have been
            # passed to the command
            #sys.exit(3)
            return
        try:
            self.manifest = GearsManifest.objects.get(remotesite_name = remotesite_name)
        except models.exceptions.ObjectDoesNotExist:
            print "No resmote instance"
            self.manifest = GearsManifest()
            self.manifest.remotesite_name = remotesite_name
            
        except (models.exceptions.FieldError, models.exceptions.ValidationError):
            print "Syncdb?"
            return
        
        # Switches
        
        
        if options.get('clear'):
            return self.clear_manifest()
        
        entries = self.manifest.gearsmanifestentry_set.count()
        
        offline_base = self.site.url
        splitted_offline_base = offline_base.split('/')
        # Cambiar el numero de version
        if not self.manifest.version:
            self.manifest.version = random_string(32)
        print self.manifest.version
        
        # Application Code
        file_list = []
        
        print "Adding/updating templates..."
        for t in full_template_list():
            if self.invalid_file(t):
                continue
            _template_source, template_origin = find_template_source(t)
            fname = template_origin.name
            mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(fname)))
            fsize = os.path.getsize(fname)
            file_list.append({'name': t, 'url': '/'.join([self.site.templates_url, t]), 
                              'file_mtime': mtime, 'file_size': fsize})
        
        print "Adding/updating js..."
        for js in abswalk_with_simlinks(self.site.project_root):
            if self.invalid_file(js):
                continue
            relpath = relativepath(js, self.site.project_root)
            mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(js)))
            fsize = os.path.getsize(js)
            file_list.append({'name': relpath, 'url': '/'.join([self.site.js_url, relpath]), 
                              'file_mtime': mtime, 'file_size': fsize})
        
        print "Adding/updating models..."
        for app in self.site.app_names():
            #relpath = relativepath(js, self.site.project_root)
            #mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(js)))
            #fsize = os.path.getsize(js)
            name = '/'.join([app, 'models.js'])
            #TODO: Check if the file exists
            file_list.append({'name': name, 'url': '/'.join([ self.site.js_url, name ])})
        
        
        print "Adding/updating lib..."
        for lib in abswalk_with_simlinks(self.site.protopy_root):
            if self.invalid_file(lib):
                continue
            relpath = relativepath(lib, self.site.protopy_root)
            mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(lib)))
            fsize = os.path.getsize(lib)
            file_list.append({'name': relpath, 'url': '/'.join([self.site.lib_url, relpath]), 
                              'file_mtime': mtime, 'file_size': fsize})
        
        print "Adding/updating media..."
        media_root = os.path.abspath(settings.MEDIA_ROOT)
        if settings.MEDIA_URL[-1] == '/':
            media_url = settings.MEDIA_URL[:-1]
        else:
            media_url = settings.MEDIA_URL
        
        for media in abswalk_with_simlinks(media_root):
            if self.invalid_file(js):
                continue
            relpath = relativepath(media, media_root)
            mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(media)))
            fsize = os.path.getsize(media)
            file_list.append({'name': relpath, 'url': '/'.join([media_url, relpath]), 
                              'file_mtime': mtime, 'file_size': fsize})
            
        if not entries:
            # New instance or empty, just create entries and add them
            self.manifest.save()
            for f in file_list:
                entry = GearsManifestEntry(manifest = self.manifest, **f)
                entry.save()
            #self.manifest.save()
        else:
            # Compraracion por modificaciones
            print "Comparing file sizes and mtime"
            file_mapping = dict([(m.name, m) for m in self.manifest.gearsmanifestentry_set.all()])
            
            m_templates_qs = self.manifest.gearsmanifestentry_set.filter(url__startswith = self.site.templates_url)
            f_m_templates = dict([(m.url, m) for m in m_templates_qs.all()])
            print f_m_templates
            for template_url in [ f['url'] for f in file_list if f['url'].startswith(self.site.templates_url)]:
                print template_url 
            #filter(lambda f['url']: f['url'].startswith(self.site.templates_url), file_list):
                if template_url not in f_m_templates:
                    print "deleted"
                else:
                    print "OK"
        #print full_template_list()
        #pprint(locals())
    def template_compare(self, url, templates):
        pass
    
    def clear_manifest(self):
        print "Clear manifest...",
        self.manifest.gearsmanifestentry_set.all().delete()
        if not self.manifest.gearsmanifestentry_set.count():
            print "OK"
            
        
    
    def update_manifest(self):
        pass
    
    
    def check_system_manifest(self):
        pass
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
            
        


