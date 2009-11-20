'''
Lists the registered remotes on the project
'''

from os.path import isdir
from offline.management.commands import OfflineBaseCommand
from offline.sites import REMOTE_SITES


class Command(OfflineBaseCommand):
    def handle(self, *largs, **kwargs):
        from django.conf import settings
        
        print "Offline Base:", settings.OFFLINE_BASE
        for name, site in REMOTE_SITES.iteritems():
            print " * '%s' published in url '/%s'" % (name, site.urlregex)
        
        name_fullpath = self.offline_root_contents()
        
        for name, full_path in name_fullpath.iteritems():
            if not isdir(full_path):
                continue
            if 'remote_%s.py' % name not in name_fullpath:
                continue
            if name in REMOTE_SITES:
                continue
            print " !", name, "not published."
    
    