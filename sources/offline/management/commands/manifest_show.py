#!/usr/bin/env python
#-*- encoding: utf-8 -*-
# Created: 03/12/2009 by defo

from django.core.management.base import *
from offline.management.commands import OfflineSiteCommand
from offline.models import GearsManifest
from django.db.models import ObjectDoesNotExist
#TODO: Update if changed based on file modification date
class Command(OfflineSiteCommand):
    help = \
    """
        This command shows manifest contents
    """
    requires_model_validation = False
    can_import_settings = True
    
    option_list = LabelCommand.option_list + (
        make_option('-C', '--count', action='store_true', dest='count', default = False,
                    help="Count manifest entries"),
#        make_option('-r', '--manifest-version', action='store', dest='manifest_ver', 
#                    help = "Version", default = None),
        )
    
    def handle_remotesite(self, site, **opts):
        try:
            manifest = GearsManifest.objects.get(remotesite_name = site.name)
        except ObjectDoesNotExist:
            return "No manifest created. Try manifest_update"
        
        count = manifest.entries_count()
        if opts.get('count'):
            return "%d" % count
        output = []
        if count:
            for e in manifest.gearsmanifestentry_set.all():
                output.append("%s" % e)
        return '\n'.join(output)
        
        
        
    
    