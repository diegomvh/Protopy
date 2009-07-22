import sys
from os.path import exists
from os import mkdir
from django.core.management.base import LabelCommand

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
            sys.exit(3)
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
                    sys.exit(4)
                    
                #TODO: Absolute path?
                mkdir(offline_root)
        
        #Ok, has offline_root and offline_base
        