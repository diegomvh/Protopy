#! /usr/bin/env python
# -*- coding: utf-8 -*-

from django.core.management.base import *
#from offline.models import Manifest
from offline.models import GearsManifest, GearsManifestEntry
from django.db import models 

from offline.util import random_string, \
    full_template_list, abswalk_with_simlinks, \
    objdict
from django.template.loader import find_template_source
from django.template import TemplateDoesNotExist
from offline.management.commands import OfflineSiteCommand

import time

try:
    from os.path import relpath as relativepath
except ImportError, e:
    from offline.util import relpath as relativepath

#TODO: Update if changed based on file modification date
class Command(OfflineSiteCommand):
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
        )
    
    
    def invalid_file(self, site, path):
        '''
        Checks weather a file has or not to be included in a manifest file
        based on the TEMPLATE_RE_EXCLUDE tuple or list defined in the RemoteSite.
        '''
        for regex in site.TEMPLATE_RE_EXCLUDE:
            if regex.search(path):
                return True

    def output(self, no_newline = False, *largs):
        if self.verbose: 
            sys.stderr.write(u" ".join(map(unicode, largs)))
    
    def handle_remotesite(self, site, **options):
        output = []
        self.site = site
        try:
            manifest = GearsManifest.objects.get(remotesite_name = site.name)
        except models.exceptions.ObjectDoesNotExist:
            print "New manifest created"
            manifest = GearsManifest()
            manifest.remotesite_name = site.name
            
        except (models.exceptions.FieldError, models.exceptions.ValidationError):
            print "Syncdb?"
            return
        
        count = manifest.gearsmanifestentry_set.count()
        
        # Switches
        if options.get('clear'):
            if manifest.id:
                manifest.delete()
                return "Manifest entries for %s deleted (%d)" % (site.name, count)
            else:
                return "Nothing to delete"
        
        #entries = manifest.gearsmanifestentry_set.count()
        
        # Cambiar el numero de version
        if not manifest.version:
            if options.get('manifest_ver'):
                manifest.version = options.get('manifest_ver')
            else: 
                manifest.version = random_string(32)
        print "Version:", manifest.version
        
        # Application Code
        file_list = []

        # TODO: Uniformar las cosas en site para no tener que estar apendeando "/"
        print "Adding/updating root..."
        file_list.append(objdict({'name': '/', 
                                  'url': '/'.join([ site.url ]) + '/',
                       })
        )
        print "Adding/updating templates..."
        for t in full_template_list():
            if self.invalid_file(site, t):
                continue
            fname = self.get_template_file(t)
            mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(fname)))
            fsize = os.path.getsize(fname)
            file_list.append(objdict({
                                      'name': t, 
                                      'url': '/'.join([site.templates_url, t]),
                                      'file_mtime': mtime, 
                                      'file_size': fsize
                                      })
            )
        
        print "Adding/updating js..."
        for js in abswalk_with_simlinks(site.project_root):
            if self.invalid_file(site, js):
                continue
            relpath = relativepath(js, site.project_root)
            mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(js)))
            fsize = os.path.getsize(js)
            file_list.append(objdict({'name': relpath, 
                                      'url': '/'.join([site.js_url, relpath]),
                                      'file_mtime': mtime, 
                                      'file_size': fsize,
                                      })
            )
        
        print "Adding/updating models..."
        for app in site.app_names():
            name = '/'.join([app, 'models.js'])
            #TODO: Check if the file exists
            file_list.append(objdict({'name': name, 
                                      'url': '/'.join([ site.js_url, name ]),
                                      })
            )
        
        
        print "Adding/updating lib..."
        for lib in abswalk_with_simlinks(site.protopy_root):
            if self.invalid_file(site, lib):
                continue
            relpath = relativepath(lib, site.protopy_root)
            mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(lib)))
            fsize = os.path.getsize(lib)
            file_list.append(objdict({'name': relpath, 
                                      'url': '/'.join([site.lib_url, relpath]),
                                      'file_mtime': mtime, 
                                      'file_size': fsize,
                                      })
            )
        
        print "Adding/updating media from %s..." % site.media_root
        for media in abswalk_with_simlinks(site.media_root):
            if self.invalid_file(site, js):
                continue
            
            relpath = relativepath(media, site.media_root)
            mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(os.path.getmtime(media)))
            fsize = os.path.getsize(media)
            #from ipdb import set_trace; set_trace()
            file_list.append(objdict({'name': relpath, 
                                      'url': '/'.join([site.media_url, relpath]),
                                      'file_mtime': mtime, 
                                      'file_size': fsize,
                                      })
            )
            
        if not count:
            # New instance or empty, just create entries and add them
            print "Creating new manifest...",
            manifest.save()
            for f in file_list:
                entry = GearsManifestEntry(manifest = manifest, **f)
                entry.save()
            #manifest.save()
            print "OK"
        else:
            # Compraracion por modificaciones
            print "Checking for updates..."
            
            m_templates_qs = manifest.gearsmanifestentry_set.filter(url__startswith = site.templates_url)
            
            updated_templates, \
            new_templates, \
            deleted_templates = self.get_updates_for_entry_qs(m_templates_qs,
                                                              file_list,
                                                              site.templates_url,
                                                              self.get_template_file,
                                                              manifest = manifest)
            
            m_js_qs = manifest.gearsmanifestentry_set.filter(url__startswith = site.js_url)
            updated_js, \
            new_js, \
            deleted_js = self.get_updates_for_entry_qs(m_js_qs,
                                                       file_list,
                                                       site.js_url,
                                                       self.get_js_file,
                                                       manifest = manifest)
            
            
            m_lib_qs =  manifest.gearsmanifestentry_set.filter(url__startswith = site.lib_url)
            
            updated_lib, \
            new_lib, \
            deleted_lib = self.get_updates_for_entry_qs(m_lib_qs,
                                                       file_list,
                                                       self.site.lib_url,
                                                       self.get_lib_file,
                                                       manifest = manifest)
            
            m_media_qs =  manifest.gearsmanifestentry_set.filter(url__startswith = site.media_url)
            
            updated_media, \
            new_media, \
            deleted_media = self.get_updates_for_entry_qs(m_media_qs,
                                                              file_list,
                                                              self.site.media_url,
                                                              self.get_media_file,
                                                              manifest = manifest)
            
                
            templates_modified = updated_templates or new_templates or deleted_templates
            lib_modified = updated_lib or new_lib or deleted_lib
            js_modifed = updated_js or new_js or deleted_js
            media_modified = updated_media or new_media or deleted_media
            
            
            if templates_modified or lib_modified or js_modifed or media_modified:
                
                manifest.version = options.get('manifest_ver') or random_string(32)
                manifest.save()
                print "Manifest version updated to %s" % manifest.version
        return output
                
    def get_updates_for_entry_qs(self, entry_qs, file_list, url_prefix, dict_to_file_callback, manifest = None):
        '''
        Returns updated, modified, deleted
        '''
        modified, created, deleted = 0, 0, 0
        url_entry_map = dict([(m.url, m) for m in entry_qs.all()])
        
        # For each template...
        for file_info in filter(lambda f: f.url.startswith(url_prefix), 
                                   file_list):
            # Is there a database entry?
            entry = file_info.url in url_entry_map and url_entry_map[file_info.url] or None
            if entry:
                
                if file_info.file_mtime and file_info.file_mtime: 
                    filename = dict_to_file_callback(file_info.name)
                else:
                    continue
                
                if entry.altered( filename ):
                    entry.update_mtime_and_size(filename)
                    modified += 1
                    print "ALTERED: %s"% file_info.name
            else:
                print "NEW: %s" % file_info.name
                new_template = GearsManifestEntry(manifest = manifest, **file_info)
                new_template.save()
                created += 1
                
        exclude_urls = map(lambda f: f.url, file_list)
        
        # When too many templates are passed to exclude DB-API fails :(
        #for deleted_template in entry_qs.exclude(url__in = exclude_urls):
        #    print "DELETED: %s" % deleted_template
        #    deleted_template.delete()
        #    deleted += 1
        
        
        db_entries = entry_qs.values('id', 'url') # --> [{id: ..., url: ....}]
        for entry in db_entries:
            if entry['url'] not in exclude_urls:
                entry_qs.get(id = entry['id']).delete()
                deleted += 1
                
        return modified, created, deleted
     
        
    def get_template_file(self, name):
        try:
            _template_source, template_origin = find_template_source(name)
            return template_origin.name
        except TemplateDoesNotExist:
            name = name[1:]
            _template_source, template_origin = find_template_source(name)
            return template_origin.name
    
    def get_js_file(self, name):
        return os.path.join(self.site.project_root, name)
    
    def get_lib_file(self, name):
        return os.path.join(self.site.protopy_root, name)
    
    def get_media_file(self, name):
        return os.path.join(self.site.media_root, name)
    
    
    def is_file_altered(self, filename, entry_instance):
        mtime, size = time.localtime(os.path.getmtime(filename)), os.path.getsize(filename)
        if entry_instance.file_mtime and entry_instance.file_mtime != mtime:
            return True
        if entry_instance.file_size and entry_instance.file_size != size:
            return True
    
    def update_manifest(self):
        pass
    
    
    def check_system_manifest(self):
        pass

            
        


