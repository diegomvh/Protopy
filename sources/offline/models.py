# -*- coding: utf-8 -*-

from django.db import models
from django.utils.datastructures import SortedDict
from simplejson import loads, dumps
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic
from django.conf import settings
import os
import time, datetime
from offline.util import abswalk_with_simlinks, get_site, full_template_list

class GearsManifest(models.Model):
    '''
    Transition class, moving from list based entries to DB relationship.
    '''
    # Gears internals
    MANIFEST_VERSION = 1
    _fake_entries = []

    # Version string
    version = models.CharField(max_length=150, blank = False)
    remotesite_name = models.TextField(max_length = 150, editable = False)

    def _get_site(self):
        return get_site(self.remotesite_name)
    site = property(_get_site)

    def uri_base(): #@NoSelf
        def fget(self):
            return settings.OFFLINE_ROOT
        return locals()
    uri_base = property(**uri_base())

    # TODO: Validate
    def add_fake_entry(self, **parms):
        self._fake_entries.append(parms)
        # DONT SAVE!

    def json_dumps(self):
        entries = []
        # Es una lista de diccionarios
        if self._fake_entries:
            entries += self._fake_entries
        entries += [ e.dict_dump() for e in self.gearsmanifestentry_set.all() ] 
        return dumps({
                      "betaManifestVersion": self.MANIFEST_VERSION,
                      "version": self.version,
                      "entries": entries 
                      })

    def __unicode__(self):
        return "<%s for site %s>" % (type(self).__name__, self.remotesite_name or "?")

    __repr__ = __unicode__

class GearsManifestEntry(models.Model):
    # Thse files should be serialized
    manifest = models.ForeignKey(GearsManifest)
    name = models.CharField(max_length = 250)

    # JSONizables
    url = models.URLField()
    redirect = models.URLField(default = '')
    src = models.URLField(default = '')
    ignoreQuery = models.BooleanField(default = False)

    # These fields should not be serialized
    file_mtime = models.DateTimeField(blank = True, null = True)
    file_size = models.IntegerField(blank = True, null = True)
    #real_file = models.BooleanField(default = False)

    def dict_dump(self):
        d = {}
        for k in ("url", "redirect", "src", "ignoreQuery"):
            v = getattr(self, k)
            if v:
                d[k] = v
        return d

    def altered(self, filename):
        mtime, size = datetime.datetime.utcfromtimestamp(os.path.getmtime(filename)), os.path.getsize(filename)
        if self.file_mtime and self.file_mtime != mtime:
            return True
        if self.file_size and self.file_size != size:
            return True

    def update_mtime_and_size(self, filename):
        mtime, size = datetime.datetime.utcfromtimestamp(os.path.getmtime(filename)), os.path.getsize(filename)
        self.file_mtime = mtime
        self.file_size = size
        self.save()

    def __unicode__(self):
        return "%s" % self.url

class SyncData(models.Model):
    '''
    Saves some data taken from 
    http://trimpath.googlecode.com/svn/trunk/junction_docs/files/junction_doc_sync-txt.html
    '''
    content_type = models.ForeignKey(ContentType, blank=True, null=True, serialize=False)
    object_id = models.CharField(max_length=255, serialize=False)
    content_object = generic.GenericForeignKey('content_type', 'object_id')

    # Indica si el registro fue borrado en algun cliente
    active = models.BooleanField()
    update_at = models.DateTimeField(serialize=False)

    def __unicode__(self):
        if self.content_object:
            return "Modified or Created: %s - %s" % (self.content_type.model_class().__name__, unicode(self.content_object))
        else:
            return "Deleted: %s - %s" % (self.content_type.model_class().__name__, self.object_id)

    def save(self):
        from datetime import datetime
        self.update_at = datetime.now()
        super(SyncData, self).save()