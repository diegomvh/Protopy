# -*- coding: utf-8 -*-
from django.db import models
from django.utils.datastructures import SortedDict
import simplejson

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
    from pickle import dumps, loads
    version = models.CharField(max_length=150)
    content = models.TextField(editable = False)
    
    def __init__(self, *largs, **kwargs):
        super(Manifest, self).__init__(*largs, **kwargs)
        self._entries = []
        
    def entries(): #@NoSelf
        '''
        Entries property
        '''
        def fget(self):
            return self._entries
        def fset(self, value):
            self._entries = value
        return locals()
    entries = property(**entries()) 
    
    def add_entry(self, **kwargs):
        '''
        Possible keys are:
            url: str
            src: str
            redirect: str
            ignoreQuery: bool
        '''
        assert kwargs,"Entries can't be null"
        assert 'url' in kwargs, "url parameter required"
        assert not ('src' in kwargs and 'redirect' in kwargs), "src and redirect are multually exclusive"
        assert not 'ignoreQuery' in kwargs or type(kwargs['ignoreQuery']) == bool, "ignoreQuery must be boolean"
        print kwargs
        
        self.entries.append(kwargs)
        
    def dump_manifest(self):
        simplejson.dumps(None)
        pass
        