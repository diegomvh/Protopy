from django.core.management.base import BaseCommand, LabelCommand, CommandError
from optparse import make_option
import sys
from glob import glob
from os.path import join, exists, basename
from django.template import Template, Context

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
        except Exception, e:
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
    
class OfflineLabelCommand(LabelCommand, OfflineBaseCommand):
    pass
    
    