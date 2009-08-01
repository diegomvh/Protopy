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
from offline.util import get_project_root, objdict
from django.template.loader import find_template_source
from django.template import TemplateDoesNotExist
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
        make_option('-r', '--manifest-version', action='store', dest='manifest_ver', 
                    help = "Version", default = None),
        make_option('-s', '--no-output', action='store_true', dest='no_output',
                    default = False),                  
        )
    
    
    def invalid_file(self, path):
        '''
        Checks weather a file has or not to be included in a manifest file
        based on the TEMPLATE_RE_EXCLUDE tuple or list defined in the RemoteSite.
        '''
        for regex in self.site.TEMPLATE_RE_EXCLUDE:
            if regex.search(path):
                return True
        
    
    
    def output(self, no_newline = False, *largs):
        if self.verbose: 
            sys.stderr.write(u" ".join(map(unicode, largs)))
    
    def handle_label(self, remotesite_name, **options):
        self.verbose = not options.get('no_output')
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
            print "New manifest created"
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
            if options.get('manifest_ver'):
                self.manifest.version = options.get('manifest_ver')
            else: 
                self.manifest.version = random_string(32)
        print "Version:", self.manifest.version
        
        # Application Code
        file_list = []
        
        print "Adding/updating templates..."
        for t in full_template_list():
            if self.invalid_file(t):
                continue
            fname = self.get_template_file(t)
            mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(fname)))
            fsize = os.path.getsize(fname)
            file_list.append(objdict({
                                      'name': t, 
                                      'url': '/'.join([self.site.templates_url, t]),
                                      'file_mtime': mtime, 
                                      'file_size': fsize
                                      })
            )
        
        print "Adding/updating js..."
        for js in abswalk_with_simlinks(self.site.project_root):
            if self.invalid_file(js):
                continue
            relpath = relativepath(js, self.site.project_root)
            mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(js)))
            fsize = os.path.getsize(js)
            file_list.append(objdict({'name': relpath, 
                                      'url': '/'.join([self.site.js_url, relpath]),
                                      'file_mtime': mtime, 
                                      'file_size': fsize,
                                      })
            )
        
        print "Adding/updating models..."
        for app in self.site.app_names():
            #relpath = relativepath(js, self.site.project_root)
            #mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(js)))
            #fsize = os.path.getsize(js)
            name = '/'.join([app, 'models.js'])
            #TODO: Check if the file exists
            file_list.append(objdict({'name': name, 
                                      'url': '/'.join([ self.site.js_url, name ]),
                                      })
            )
        
        
        print "Adding/updating lib..."
        for lib in abswalk_with_simlinks(self.site.protopy_root):
            if self.invalid_file(lib):
                continue
            relpath = relativepath(lib, self.site.protopy_root)
            mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(lib)))
            fsize = os.path.getsize(lib)
            file_list.append(objdict({'name': relpath, 
                                      'url': '/'.join([self.site.lib_url, relpath]),
                                      'file_mtime': mtime, 
                                      'file_size': fsize,
                                      })
            )
        
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
            file_list.append(objdict({'name': relpath, 
                                      'url': '/'.join([media_url, relpath]),
                                      'file_mtime': mtime, 
                                      'file_size': fsize,
                                      })
            )
            
        if not entries:
            # New instance or empty, just create entries and add them
            print "Creating new manifest...",
            self.manifest.save()
            for f in file_list:
                entry = GearsManifestEntry(manifest = self.manifest, **f)
                entry.save()
            #self.manifest.save()
            print "OK"
        else:
            # Compraracion por modificaciones
            print "Checking for updates..."
            
            m_templates_qs = self.manifest.gearsmanifestentry_set.filter(url__startswith = self.site.templates_url)
            
            
            updated_templates, \
            new_templates, \
            deleted_templates = self.get_updates_for_entry_qs(m_templates_qs,
                                                              file_list,
                                                              self.site.templates_url,
                                                              self.get_template_file)
            
#            url_entry_map = dict([(m.url, m) for m in m_templates_qs.all()])
#            
#            updated_templates, new_templates, deleted_templates = 0, 0, 0
#            
#            # For each template...
#            for file_info in filter(lambda f: f.url.startswith(self.site.templates_url), 
#                                       file_list):
#                # Is there a database entry?
#                entry = file_info.url in url_entry_map and url_entry_map[file_info.url] or None
#                if entry:
#                    filename = self.get_template_file(file_info.name)
#                    if entry.altered( filename ):
#                        entry.update_mtime_and_size(filename)
#                        updated_templates += 1
#                        print "ALTERED: %s"% file_info.name
#                else:
#                    print "NEW: %s" % file_info.name
#                    new_template = GearsManifestEntry(manifest = self.manifest, **file_info)
#                    new_template.save()
#                    new_templates += 1
#            #from ipdb import set_trace; set_trace()
#            for deleted_template in m_templates_qs.exclude(url__in = map(lambda f: f.url, file_list)):
#                print "DELETED: %s" % deleted_template
#                deleted_template.delete()
#                deleted_templates += 1
                
                
            templates_modified = updated_templates or new_templates or deleted_templates
            lib_modified = False
            js_modifed = False
            media_modified = False
            
            if templates_modified or lib_modified or js_modifed or media_modified:
                
                self.manifest.version = options.get('manifest_ver') or random_string(32)
                self.manifest.save()
                print "Manifest version updated to %s" % self.manifest.version
                
    def get_updates_for_entry_qs(self, entry_qs, file_list, url_prefix, dict_to_file_callback):
        '''
        Returns updated, modified, deleted
        '''
        created, modified, deleted = 0, 0, 0
        url_entry_map = dict([(m.url, m) for m in entry_qs.all()])
        
        # For each template...
        for file_info in filter(lambda f: f.url.startswith(url_prefix), 
                                   file_list):
            # Is there a database entry?
            entry = file_info.url in url_entry_map and url_entry_map[file_info.url] or None
            if entry:
                #filename = self.get_template_file(file_info.name)
                filename = dict_to_file_callback(file_info.name)
                
                if entry.altered( filename ):
                    entry.update_mtime_and_size(filename)
                    modified += 1
                    print "ALTERED: %s"% file_info.name
            else:
                print "NEW: %s" % file_info.name
                new_template = GearsManifestEntry(manifest = self.manifest, **file_info)
                new_template.save()
                created += 1
        #from ipdb import set_trace; set_trace()
        for deleted_template in entry_qs.exclude(url__in = map(lambda f: f.url, file_list)):
            print "DELETED: %s" % deleted_template
            deleted_template.delete()
            deleted += 1
        
        return created, modified, deleted
     
        
    def get_template_file(self, name):
        try:
            _template_source, template_origin = find_template_source(name)
            return template_origin.name
        except TemplateDoesNotExist:
            name = name[1:]
            _template_source, template_origin = find_template_source(name)
            return template_origin.name
        
    
    def is_file_altered(self, filename, entry_instance):
        mtime, size = time.localtime(os.path.getmtime(filename)), os.path.getsize(filename)
        if entry_instance.file_mtime and entry_instance.file_mtime != mtime:
            return True
        if entry_instance.file_size and entry_instance.file_size != size:
            return True
        
    
    def clear_manifest(self):
        print "Clear manifest...",
        self.manifest.delete()
        print "OK"
    
    def update_manifest(self):
        pass
    
    
    def check_system_manifest(self):
        pass

            
        


