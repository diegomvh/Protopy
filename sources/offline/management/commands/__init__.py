from django.core.management.base import BaseCommand, LabelCommand, CommandError
from optparse import make_option
import sys
from glob import glob
from os.path import join, exists, basename
from django.template import Template, Context
from os.path import abspath, dirname
from os import listdir
# Some common code 

def offline_setup_checks():
    '''
    Checks basic setup has been made
    '''
    import sys
    from django.conf import settings
    from os.path import isabs, abspath, exists
    import os
    
    if not hasattr(settings, 'OFFLINE_ROOT'):
        print _("You must define settings.OFFLINE_ROOT in order to enable project offlinization")
        sys.exit(2)
          
    df_path = abspath(settings.OFFLINE_ROOT)
    if not isabs(df_path):
        print _("%s doesn't seem to be an absolute path, please correct this in your project's settings.py")
        sys.exit(3)
    
def get_app_path(app_name):
    # Returns application root in filesystem
    from django.db.models.loading import get_app
    from os.path import dirname, abspath
    app = get_app(app_name)
    return abspath(dirname(app.__file__))

def get_doffline_path():
    # Convenience function
    return get_app_path('djangoffline')



        
            
    
# TODO (nahuel): Migrate all the duplicate code of both migrate_app, start_remotesite and manifest_update
class OfflineBaseCommand(BaseCommand):
    
    option_list = (
        make_option('-f', '--force', action='store_true', default = False),
                    
    ) + BaseCommand.option_list
    
    requires_model_validation = True
    can_import_settings = True
    
    
    def __init__(self, *largs, **kwargs):
        super(OfflineBaseCommand, self).__init__(*largs, **kwargs)
        from django.conf import settings
        try:
            self._root_urlconf_mod = __import__(settings.ROOT_URLCONF)
        except Exception, _e:
            raise CommandError("Error loading ROOT_URLCONF")
    
    def fill_templates(self, path_from, path_to, template_context, **options):
        '''
        Renders templates and puts them into appropiate folder
        '''
        verbose = options.get('verbosity', 0)
        
        if type(path_from) == str:
            files_from = glob( path_from )
        else:
            files_from = path_from
        # Creates the destfile: source_file dictionary
        files_from = dict( map( lambda fname: (basename(fname), fname), files_from ) )
        
        for base_fname, full_path in files_from.iteritems():
            f = open(full_path, 'r')
            raw_template = f.read()
            f.close()
                
            template = Template(raw_template)
            context = Context(template_context)
                
            dst = join(path_to, base_fname)
            f = open(dst, 'w')
            try:
                f.write(template.render(context))
            except Exception, e:
                print "Error en el template %s" % e
            f.close()
            
            if verbose:
                sys.stdout.write("%s written\n" % dst)
                
    def offline_root_contents(self):
        '''
        @returns: Contents of the offline root directory where remote sites are held, dictionary
                    made of file_name_or_directory as key and full path as value.
            
        '''
        from django.conf import settings
        prj_path = abspath(dirname(self._root_urlconf_mod.__file__))
        if not exists(join(prj_path, settings.OFFLINE_BASE)):
            raise CommandError("""
            Offline base/root directory could not be found. You'll get rid of this
            error when you've created your first remote site. Read on
            manage.py help start_remotesite
            """)
        
        remote_dir = join(prj_path, settings.OFFLINE_BASE)
        name_fullpath = [ (name, join(remote_dir, name)) for name in listdir(remote_dir) ]
        return dict(name_fullpath)
        
class OfflineSiteCommand(OfflineBaseCommand):
    
    
    def handle(self, *names, **options):
        if not names:
            raise CommandError('Enter at least one remote site name')

        output = []
        for name in names:
            site = self.get_remotesite(name)
            cmd_output = self.handle_remotesite(site, **options)
            if cmd_output:
                output.append(cmd_output)
        return '\n'.join(output)

    def get_remotesite(self, name):
        '''
        Gets a Remote Site and invokes handle_remotesite
        '''
        from django.conf import settings
        from offline.sites import REMOTE_SITES
        site = REMOTE_SITES.get(name, False)
        if not site:
            site_names = ','.join(REMOTE_SITES.keys())
            raise CommandError("""
                Remote site '%(remotesite_name)s' is not registered. Available sites: %(site_names)s
                If your remote site already exists, check if it's installed in you settings.ROOT_URLCONF
            """ % locals())
        return site
    
    def handle_remotesite(self, site, **opts):
        raise NotImplementedError()
    
    
    