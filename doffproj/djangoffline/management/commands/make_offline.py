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

class Command(NoArgsCommand):

    def handle_noargs(self, **options):
        from django.conf import settings
        if not hasattr(settings, 'OFFLINE_ROOT'):
            print _("You must define settings.OFFLINE_ROOT in order to enable project offlinization")
            sys.exit(2)
        
        df_path = abspath(settings.OFFLINE_ROOT)
        if not isabs(df_path):
            print _("%s doesn't seem to be an absolute path, please correct this in your project's settings.py")
            sys.exit(3)
        
        if not exists(df_path):
            print _("Crearing djangoffline project base at %s" % df_path)
            try:
                os.mkdir(df_path)
            except IOError, e:
                print
        #else: 
        elif exists(join(df_path, 'settings.js')):
            # If the pats exists already, don't touch anything
            print _("""It seems that an offline project is already set up in %s.
                        Please remove the directory and rerun to start over.""" % df_path)
        
        app = get_app('djangoffline')
        base_df_path = dirname(abspath(app.__file__))
        
        project_templates = join(base_df_path, 'conf', 'project_template')
        
        assert exists(project_templates), _("Error with templates")
        
        project_name = os.environ.get('DJANGO_SETTINGS_MODULE').replace('.settings', '')
        
        for fname in glob("%s%s*" % (project_templates, os.sep)):
            f = open(fname, 'r')
            raw_template = f.read()
            f.close()
            template = Template(raw_template)
            context = Context(locals())
            
            base_name = basename(fname)
            dst = join(df_path, base_name)
            f = open(dst, 'w')
            f.write(template.render(context))
            f.close()
            print "%s written" % dst 
        
        #return NoArgsCommand.handle_noargs(self, **options)

    help = """
        Probando el sistema de comandos de Django.
    """
    requires_model_validation = False
    can_import_settings = True
    