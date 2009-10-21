from offline.management.commands import OfflineLabelCommand
from django.core.management.base import CommandError



class Command(OfflineLabelCommand):
    help = '''
        Publish remotesite in ROOT_URLCONF
    '''
    def handle_label(self, remotesite_name, **options):
        from offline.sites import REMOTE_SITES
        
        if remotesite_name in REMOTE_SITES.keys():
            raise CommandError("%s already published, check urls" % remotesite_name)
        
        