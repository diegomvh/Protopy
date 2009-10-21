'''
Lists the registered remotes on the project
'''
import sys
from glob import glob
from os.path import exists, abspath, dirname, join, isdir
from os import listdir
from offline.management.commands import OfflineBaseCommand
from offline.sites import REMOTE_SITES


class Command(OfflineBaseCommand):
    def handle(self, *largs, **kwargs):
        from django.conf import settings
        
        print "Offline Base:", settings.OFFLINE_BASE
        for name, site in REMOTE_SITES.iteritems():
            print " * '%s' published in url '/%s'" % (name, site.urlregex)
        
        prj_path = abspath(dirname(self._root_urlconf_mod.__file__))
        if not exists(join(prj_path, settings.OFFLINE_BASE)):
            return
        
        remote_dir = join(prj_path, settings.OFFLINE_BASE)
        name_fullpath = [ (name, join(remote_dir, name)) for name in listdir(remote_dir) ]
        name_fullpath = dict(name_fullpath)
        
        for name, full_path in name_fullpath.iteritems():
            if not isdir(full_path):
                continue
            if 'remote_%s.py' % name not in name_fullpath:
                continue
            if name in REMOTE_SITES:
                continue
            print " !", name, "not published."
        
    