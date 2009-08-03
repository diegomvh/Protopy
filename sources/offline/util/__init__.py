from types import *
from files import *

import glob

#===============================================================================
# Magic, don't touch
#===============================================================================
OFFLINE_ROOT_DIR = 'offline'

# These function rule how protopy will handle offline paths in the local
# development eveiroment.
# 

def get_project_name():
    from django.conf import settings
    return settings.ROOT_URLCONF.split('.')[0]

def get_project_root():
    project_mod = __import__(get_project_name(), {}, {}, ['*', ])
    return os.path.dirname(os.path.abspath(project_mod.__file__))

def get_offline_root():
    return os.path.join(get_project_root(), OFFLINE_ROOT_DIR)

def get_site_root(site_name):
    if not get_site(site_name):
        return
    return os.path.join(get_offline_root(), site_name)

def get_site(name):
    from django.conf import settings
    from offline import sites
    project_name = settings.ROOT_URLCONF.split('.')[0]
    try:
        __import__('.'.join([project_name, 'offline', "remote_" + name ]), {}, {}, ['*', ])
        return sites.REMOTE_SITES[name]
    except (ImportError, KeyError), e:
        pass 

def get_sites():
    from django.conf import settings
    from offline import sites
    project_name = get_project_name()
    
    package = __import__('.'.join([project_name, 'offline' ] ), {}, {}, ['*', ])
    path = package.__path__[0]
    sites = []
    for f in glob(path + os.sep + "*.py"):
        name = f.split('/')[-1].split('.')[0]
        site = get_site(name)
        if site:
            sites.append(site)
    return sites

