#! /usr/bin/env python
# -*- coding: utf-8 -*-
"""

 migrate_app app
 La app debe estar en {{ settings.INSTALLED_APPS }}
 Creamos
 * crear {{ APP_PATH }}/remote_models.py
 * crear {{ OFFLINE_ROOT}}/{{APP_NAME}}/models.js
 * crear {{ OFFLINE_ROOT}}/{{APP_NAME}}/views.js
 * crear {{ OFFLINE_ROOT}}/{{APP_NAME}}/urls.js


"""
from os.path import dirname, join
from offline.management.commands import OfflineBaseCommand
from django.core.exceptions import ImproperlyConfigured
import os, shutil
from django.core.management.base import CommandError
from django.db import models

import offline
class Command(OfflineBaseCommand):
    help = """
        Creates the skeleton for an a offline app in the remote site.
    """
    
    def handle(self, *remote_and_apps, **options):
        from django.conf import settings
        # Remotesite
        mod = __import__(settings.ROOT_URLCONF)
        from offline.sites import REMOTE_SITES
        
        if not REMOTE_SITES:
            raise CommandError("No remote sites registered at ROOT_URLCONF.")
        
        if not remote_and_apps:
            raise CommandError("Remote site missing")
        
        remote_site_name = remote_and_apps[0]
        
        
        if remote_site_name in REMOTE_SITES:
            remote_site = REMOTE_SITES[remote_site_name]
        else:
            raise CommandError("Remote Site named '%s' does not exist. There are %d" % 
                                (remote_site_name, len(REMOTE_SITES)) +
                               " remote sites registered: %s" % ','.join(REMOTE_SITES.keys()))
        
        app_labels =  remote_and_apps[1:]
        
        try:
            app_list = [models.get_app(app_label) for app_label in app_labels]
        except (ImproperlyConfigured, ImportError), e:
            raise CommandError("%s. Are you sure your INSTALLED_APPS setting is correct?" % e)
        
        template_base = join(dirname(offline.__file__), 'conf')
        
        for app in app_list:
            #from ipdb import set_trace; set_trace()
            mod_name = app.mod_name
            project_root = remote_site.project_root
            remote_app_dir = join(project_root, mod_name)
            if os.path.exists(remote_app_dir):
                
                if options.get('force', False):
                    shutil.rmtree(remote_app_dir)
                else:
                    raise CommandError(
                        "The app '%s' is installed in the remote site '%s'\n" % 
                        (mod_name, remote_site_name, ))
                
            os.mkdir(remote_app_dir)
            
            
            self.fill_templates(join(template_base, "remote_app_template", "*.*"),
                                remote_app_dir, {}, **options )

