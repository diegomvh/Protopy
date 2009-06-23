#! /usr/bin/env python
# -*- coding: utf-8 -*-


# make_offline 
# genera el {{ settings.OFFLINE_ROOT }}/offline_{{ PROJECT_NAME }}/settings.js
# {{ settings.OFFLINE_ROOT }}/offline_{{ PROJECT_NAME }}/urls.js
#
#

from django.core.management.base import *
from django.utils.translation import gettext_lazy as _
from os.path import abspath, dirname, isabs, exists, join, basename
from django.db.models.loading import get_app
from django.template import Template, Context
import os
from glob import glob
from djangoffline.management.commands import offline_setup_checks, get_doffline_path

class Command(NoArgsCommand):

    def handle_noargs(self, **options):
        from django.conf import settings
        from djangoffline.management.commands import fill_templates
        offline_setup_checks()
        
        offline_root = abspath(settings.OFFLINE_ROOT)
        
        project_name = os.environ.get('DJANGO_SETTINGS_MODULE').replace('.settings', '')
        
        #offline_project_root = join(offline_root, '%s_offline' % project_name)
        offline_project_root = settings.OFFLINE_ROOT
        
        if not exists(offline_project_root):
            print _("Crearing djangoffline project base at %s" % offline_project_root)
            try:
                os.mkdir(offline_project_root)
            except OSError, e:
                import errno
                if e.errno == errno.ENOENT:
                    print _("Can't create offline project root, check if location exists and has apporopiate permissions")
                    sys.exit(e.errno)
                    
        else:
            print _("Offline project found at: %s" % offline_project_root)
        
        doffline_path = get_doffline_path()
        

        project_templates = join(doffline_path, 'conf', 'remote_project_template')
        assert exists(project_templates), _("Error with templates")
        
        project_templates = "%s%s*" % (project_templates, os.sep)
        
        fill_templates(project_templates, offline_project_root, locals())
        
        
#        #return NoArgsCommand.handle_noargs(self, **options)

    help = "Makes a project offline"
    requires_model_validation = False
    can_import_settings = True
    