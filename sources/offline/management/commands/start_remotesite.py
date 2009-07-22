from django.template import Template
from django.template.context import Context
import sys
from os.path import exists, join, abspath, dirname, basename
from os import mkdir
import os
from django.core.management.base import LabelCommand
from glob import glob
import offline

#TODO: Make this pretty
def read_input(message, valid_input, default = None):
    '''
    
    @param message: A sting
    @param valid_input: A list
    @param default: (optional) the default option (must be in valid_input)
    '''
    if default:
        assert default in valid_input, "Default (%s) is not in valid inputs %s" % (default, valid_input)
    while True:
        print "%s [%s]?" % (message, "/".join(valid_input))
        resp = raw_input() or default
        if resp.lower() in map(lambda s: s.lower(), valid_input):
            return resp
        
            
        
class Command(LabelCommand):
    
    def handle_label(self, remote_name, **options):
        from django.conf import settings
        if not hasattr(settings, "OFFLINE_BASE"):
            print "Please define OFFLINE_BASE in your project settings file"
            sys.exit(-3)
        else:
            offline_base = settings.OFFLINE_BASE
            
        if not hasattr(settings, "OFFLINE_ROOT"):
            print "Please define OFFLINE_ROOT in your project settings file"
        else:
            offline_root = settings.OFFLINE_ROOT
            if not exists(offline_root):
                resp = read_input("%s does not exist, do you want to create it now?" % offline_root,
                           ["y", "n"], "y")
                if resp == "n":
                    sys.exit(-4)
                    
                #TODO: Absolute path?
                mkdir(offline_root)
            package_init = join (offline_root, "__init__.py")
            if not exists(package_init):
                f = open(package_init)
                f.close()
        
        remote_site_root = join(offline_root, remote_name)
        remote_site_mod = join(offline_root, remote_name + ".py")
        
        broken = False
        if exists(remote_site_root):
            print "The offline site root already exists"
            broken = True
        if exists(remote_site_mod):
            print "The remote site module aready exists %s" % (broken and "too" or "")
        if broken:
            print "Aborted"
            sys.exit(-5)
        
        template_base = join( dirname(abspath(offline.__file__)), "conf") 
        template_file = open( join(template_base, "remote_site_template", "remote_site_name.py"), "r")
        
        template = Template(template_file.read())
        template_file.close()
        
        remote_site = open(remote_site_mod, 'w')
        remote_site.write( template.render(Context(locals())) )
        remote_site.close()
        
        mkdir(remote_site_root)
        template_folder = join(template_base, "remote_project_template")
        template_list = glob("%s%s*.*" % (template_folder, os.sep))
        for template_path in template_list:
            name = basename(template_path)
            f_template = open(template_path, "r")
            template = Template(f_template.read())
            f_template.close()
            
            dest_name = join(remote_site_root, name)
            f_dest = open(dest_name, "w")
            f_dest.write(template.render(Context(locals())))
            f_dest.close()
            
         
        #f = open(remote_site_mod)
        
        #Ok, has offline_root and offline_base
        