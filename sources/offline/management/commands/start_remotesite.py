from django.template import Template
from django.template.context import Context
from offline.management.commands import  OfflineLabelCommand
import shutil
import sys
from os.path import exists, join, abspath, dirname, basename
from os import getcwd, mkdir, sep
from django.core.management.base import CommandError
from glob import glob
import offline

class Command(OfflineLabelCommand):
    
    help = """
        Creates a remote site
        
    """
    
    def handle_label(self, remote_name, **options):
        from django.conf import settings
        offline_base = getattr(settings, "OFFLINE_BASE", None)
        if not offline_base:
            raise CommandError("Please define OFFLINE_BASE in your project settings file")
                    
        offline_root = join( getcwd(), settings.OFFLINE_BASE)
        if not exists(offline_root):
            if options.get('verbosity'):
                print "Creating offline root"
            mkdir(offline_root)

        package_init = join (offline_root, "__init__.py")
        if not exists(package_init):
            if options.get('verbosity', 0) > 1:
                print "Creating python package (__init__)"
            f = open(package_init, 'w')
            f.close()

        remote_site_root = join(offline_root, remote_name)
        remote_site_mod = join(offline_root, 'remote_' + remote_name + ".py")

        
        if exists(remote_site_root):
            if not options.get('force', False):
                raise CommandError("The remote site module aready exists!")
            else:
                if options.get('verbosity'):
                    print "Removing previous remote site"
                shutil.rmtree(remote_site_root)
        mkdir(remote_site_root)    

        template_base = join( dirname(abspath(offline.__file__)), "conf") 
        template_file = open( join(template_base, "remote_site_template", "remote_site_name.py"), "r")

        template = Template(template_file.read())
        template_file.close()

        remote_site = open(remote_site_mod, 'w')
        remote_site.write( template.render(Context(locals())) )
        remote_site.close()

        
        template_folder = join(template_base, "remote_project_template", "*.*")
        #template_list = glob("%s%s*.*" % (template_folder, sep))

        self.fill_templates(template_folder, 
                            remote_site_root, locals(), **options)
        