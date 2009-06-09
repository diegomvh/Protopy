import sys
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
    
    # Brute force check
    #module_name = os.environ.get('DJANGO_SETTINGS_MODULE').replace('.settings', '.urls')
    
    #project_urlpatterns = getattr(__import__(module_name, {}, {}, ['urlpatterns', ] ), 'urlpatterns')
     
    #for patt_obj in project_urlpatterns:
    #    print patt_obj
#         
#    import ipdb; ipdb.set_trace()
    




def get_app_path(app_name):
    # Returns application root in filesystem
    from django.db.models.loading import get_app
    from os.path import dirname, abspath
    app = get_app(app_name)
    return abspath(dirname(app.__file__))

def get_doffline_path():
    # Convenience function
    return get_app_path('djangoffline')


def fill_templates(path_from, path_to, template_context, overwrite = False):
    '''
    '''
    
    from glob import glob
    from os.path import join, exists, basename
    from django.template import Template, Context
    
    if type(path_from) == str:
        files_from = glob( path_from )
    else:
        files_from = path_from
    files_from = dict( map( lambda fname: (basename(fname), fname), files_from ) )
    
    
    for f_basename in files_from:
        if exists(join(path_to, f_basename)):
            sys.stdout.write('File "%s" already exists in "%s"\nRemove the file\n' % (f_basename, path_to))
            sys.exit(-3)
        
    
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
        print "%s written" % dst
        
        #print base_fname, full_path
        #print path_to
        
    
    
    
    
    
    


    
    