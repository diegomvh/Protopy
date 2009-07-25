# -*- coding: utf-8 -*-
from django.db import models
from django.utils.datastructures import SortedDict
from simplejson import loads, dumps
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic
from django.conf import settings
import os
from offline.util import abswalk_with_simlinks

MAX_APP_NAME_LENGTH = 160

class OfflineApp(models.Model):
    '''
    This model holds information about the offline apps
    '''
    app_name = models.CharField(max_length = MAX_APP_NAME_LENGTH)
 

class Manifest(models.Model):
    '''
    According to 
    http://code.google.com/intl/es-AR/apis/gears/api_localserver.html#manifest_file
    ============================================================================
    Google Sample Code:
    {
      // version of the manifest file format
      "betaManifestVersion": 1,
    
      // version of the set of resources described in this manifest file
      "version": "my_version_string",
    
      // optional
      // If the store specifies a requiredCookie, when a request would hit
      // an entry contained in the manifest except the requiredCookie is
      // not present, the local server responds with a redirect to this URL.
      "redirectUrl":  "login.html",
    
      // URLs to be cached (URLs are given relative to the manifest URL)
      "entries": [
          { "url": "main.html", "src": "main_offline.html" },
          { "url": ".", "redirect": "main.html" },
          { "url": "main.js" }
          { "url": "formHandler.html", "ignoreQuery": true },
        ]
    }
    '''
    # Gears internals
    MANIFEST_VERSION = 1
    
    # Version string
    version = models.CharField(max_length=150, blank = False)
    content = models.TextField(editable = False, null = True, blank = True)
    remotesite_name = models.TextField(max_length = 150, editable = False)
    
    class Meta:
        unique_together = (('version'), )
    
    def __init__(self, *largs, **kwargs):
        super(Manifest, self).__init__(*largs, **kwargs)
        self._entries = None
        
    def entries(): #@NoSelf
        '''
        Entries property
        '''
        def fget(self):
            if self._entries == None:
                # May raise ValueError
                if self.content:
                    self._entries = loads( self.content )
                else:
                    self._entries = []
                
            return self._entries
        def fset(self, value):
            self._entries = value
        return locals()
    entries = property(**entries()) 
    
    def add_entry(self, url, src = None, redirect = None, ignoreQuery = None):
        #TODO: Update docs
        '''
        
        Possible keys are:
            url: str
            src: str
            redirect: str
            ignoreQuery: bool
        '''
        if src and redirect:
            raise Exception("src and redirect are mutually excluding")
        if ignoreQuery:
            assert type(ignoreQuery) == bool, "ignoreQuery must be null"
        entry = dict( url = url )
        
        if src:
            entry.update( src = src )
        if redirect:
            entry.update( redirect = redirect )
        if ignoreQuery:
            entry.update( ignoreQuery = ignoreQuery )
            
        self.entries.append( entry )
        
    def dump_manifest(self):
        '''
        Generates a gears' managed store compatible manifest
        '''
        # Json guarantee
        
        return dumps({
            "betaManifestVersion": self.MANIFEST_VERSION,
            "version": self.version,
            "entries": self.entries 
        })
    
    
    
    def save(self, *largs, **kwargs):
        
        assert self.version is not None, "version can't be null"
        self.content = dumps( self.entries )    
        super(Manifest, self).save(*largs, **kwargs)
    
    def __unicode__(self):
        return self.version
    
    def add_uris_from_pathwalk(self, path, uri_base, exclude_callback = None, followlinks = True):
        '''
        Recursively adds a path walk served statically behind a uri_base
        to the manifest's entries.
        '''
        uri_base = filter(bool, uri_base.split('/'))
        file_list = []
        for f in abswalk_with_simlinks( path ):
            if callable(exclude_callback) and exclude_callback(f):
                continue
            pth = f[ f.index(path) + len(path) + 1: ]
            pth = pth.split(os.sep)
            pth = '/%s' % '/'.join( uri_base + pth)
            file_list.append(pth)
            
#            file_list.append('%s/%s' % ( uri_base,                     
#                                        f[ f.index(path) + len(path) + 1: ]
#                            ))

        map( self.add_entry, file_list )
    
    def __add__(self, other):
        '''
        Joins manifests
        '''
        m = Manifest()
        m.version = self.version
        m.entries = self.entries + other.entries
        return m

class GearsManifest(models.Model):
    '''
    Transition class, moving from list based entries to DB relationship.
    '''
    # Gears internals
    MANIFEST_VERSION = 1
    
    # Version string
    version = models.CharField(max_length=150, blank = False)
    content = models.TextField(editable = False, null = True, blank = True)
    remotesite_name = models.TextField(max_length = 150, editable = False)
    
    def uri_base(): #@NoSelf
        def fget(self):
            return settings.OFFLINE_ROOT
        return locals()
    uri_base = property(**uri_base())
        
    
    def add_uris_from_pathwalk(self, path, uri_base = None, exclude_callback = None, followlinks = True):
        '''
        Recursively adds a path walk served statically behind a uri_base
        to the manifest entries.
        '''
        uri_base = filter(bool, uri_base.split('/'))
        
        file_list = []
        for f in abswalk_with_simlinks( path ):
            if callable(exclude_callback) and exclude_callback(f):
                continue
            pth = f[ f.index(path) + len(path) + 1: ]
            pth = pth.split(os.sep)
            pth = '/%s' % '/'.join( uri_base + pth)
            file_list.append(pth)
            
#            file_list.append('%s/%s' % ( uri_base,                     
#                                        f[ f.index(path) + len(path) + 1: ]
#                            ))

        map( self.add_entry, file_list )
        
    def __unicode__(self):
        return "<%s for site %s>" % (type(self).__name__, self.remotesite_name or "?")
    
    __repr__ = __unicode__
    
class GearsManifestEntry(models.Model):
    '''
    
    '''
    manifest = models.ForeignKey(GearsManifest)
    url = models.URLField()
    redirect = models.URLField()
    src = models.URLField()
    ignoreQuery = models.BooleanField()
    file_mtime = models.DateTimeField()
    
    #, src = None, redirect = None, ignoreQuery = None):
        

                
        
class SyncData(models.Model):
    '''
    Saves some data taken from 
    http://trimpath.googlecode.com/svn/trunk/junction_docs/files/junction_doc_sync-txt.html
    '''
    content_type = models.ForeignKey(ContentType)
    object_id = models.PositiveIntegerField()
    content_object = generic.GenericForeignKey('content_type', 'object_id')
    
    # Indica si el registro fue borrado en algun cliente
    active = models.BooleanField()
    synced_at = models.DateTimeField()
    
class SyncLog(models.Model):
    '''
    This is a client side only model
    '''
    synced_at = models.DateTimeField()
    sync_id = models.CharField(max_length = 512)
        