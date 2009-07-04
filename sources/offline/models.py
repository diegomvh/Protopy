# -*- coding: utf-8 -*-
from django.db import models
from django.utils.datastructures import SortedDict
from simplejson import loads, dumps
import os

MAX_APP_NAME_LENGTH = 160

class OfflineApp(models.Model):
    '''
    This model holds information about the offline apps
    '''
    app_name = models.CharField(max_length = MAX_APP_NAME_LENGTH)
 
 
class Log(models.Model):
    '''
    Log:
        Uso para la sincronización.
    '''
    pass

#class BaseModelProxy(m):


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
        file_list = []
        for f in abswalk_with_simlinks( path ):
            if callable(exclude_callback) and exclude_callback(f):
                continue
            file_list.append('%s/%s' % ( uri_base,                     
                                        f[ f.index(path) + len(path) + 1: ]
                            ))
        map( self.add_entry, file_list )
        
        
def abswalk_with_simlinks(path):
    '''
    Python <2.6 version walk(followlinks = True)
    '''
     
    for path, subdirs, files in os.walk(path):
        
        files = map( lambda n: os.path.join( path, n), files )
        for f in files:
                yield f
        for dirname in subdirs:
            full_dir_path = os.path.join(path, dirname)
            if os.path.islink( full_dir_path ):
                for f in abswalk_with_simlinks( full_dir_path ):
                    yield f
                
        
        