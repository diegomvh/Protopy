'''
File handling
'''
import os
import re

def abswalk_with_simlinks(path):
    '''
    Python <2.6 version walk(followlinks = True)
    '''

    for path, subdirs, files in os.walk(path):
        files = map( lambda n: os.path.join( path, n), files )
        for f in files:
                yield f
        for dirname in subdirs:
            full_dir_path = os.path.join(path, dirname)
            if os.path.islink( full_dir_path ):
                for f in abswalk_with_simlinks( full_dir_path ):
                    yield f

# This should be adapted for non Unix OSs
ishidden = lambda f: f.startswith('.')

# DEBUG
def show(f):
    from pprint import pformat
    def wrapped(*largs, **kwargs):
        print f.func_name, "<-", largs or '', kwargs or ''
        
        ret = f(*largs, **kwargs)
        print " =>", pformat(ret)
        return ret
    return wrapped

#@show
def valid_file_callback(name):
    # Is it a hidden file?
    name, dir_ = os.path.split(name)
    if not name:
        
        return False
    
    if ishidden(name):
        return False
    # Any of those dirs is hidden??
    if any(map(ishidden, dir_.split(os.path.sep))):
        return False
    return True

def excluding_abswalk_with_simlinks(path, exclude = None):
    '''
    Returns an iterator on the path base taking into account a list of 
    @param path: Base path
    @param exclude: May be a list of strings, regular expressions or functions
    '''
    # TODO: Excludes should be treated more transparently
    if type(exclude) is not list:
        exclude = [exclude, ]
    
    for p in abswalk_with_simlinks(path):
        
        for e in exclude:
            if issubclass(type(e), basestring):
                if e == p:
                    continue
            elif callable(e) and e(p):
                continue
            # Try to identify a Regular Expression
            elif hasattr(e, 'search') and callable(getattr(e, 'search')) and e.search(p):
                continue
        if valid_file_callback(p):
            yield p

def relpath(path, start=os.curdir):
    """Return a relative version of a path"""
    
    if not path:
        raise ValueError("no path specified")

    start_list = os.path.abspath(start).split(os.sep)
    path_list = os.path.abspath(path).split(os.sep)
    
    # Work out how much of the filepath is shared by start and path.
    i = len(os.path.commonprefix([start_list, path_list]))

    rel_list = [os.path.pardir] * (len(start_list)-i) + path_list[i:]
    if not rel_list:
        return os.curdir
    return os.path.join(*rel_list)

INVALID_TEMPLATE_SUFFIXES = re.compile(r'(:?.*\.svn.*)?(?:~|#)$')
#valid_templates = lambda name: not INVALID_TEMPLATE_SUFFIXES.search( name )
SCM_FOLDER_PATTERNS = ('.hg', '.git', '.svn', )



def valid_templates(name):
    if INVALID_TEMPLATE_SUFFIXES.search(name):
        return False
    if any(map(lambda n: name.count(n) > 0, SCM_FOLDER_PATTERNS)):
        return False
    # Check it the file should be added
    return valid_file_callback(name)

def retrieve_templates_from_path(path, template_bases = None, strip_first_slash = True):
    '''
    '''
    from os.path import join
    if not template_bases:
        template_bases = []

    template_files = [] 
    for root, _dirs, files in os.walk(path):
        for t_base in template_bases:
            #import ipdb; ipdb.set_trace()

            if t_base in root:
                index = root.index(t_base)
                root = root[index + len(t_base):]
                break

        template_files += map(lambda f: join(root, f), files)

    templates = filter(valid_templates, template_files)

    if strip_first_slash:
        templates = map( lambda f: f[0] == '/' and f[1:] or f, templates)
    return templates

#@show
def full_template_list(exclude_apps = None, exclude_callable = None):
    from django.conf import settings
    template_dirs = map(lambda s: s.split(os.sep)[-1], settings.TEMPLATE_DIRS)

    template_files = []
    for path in settings.TEMPLATE_DIRS:
        template_files += retrieve_templates_from_path(path, template_dirs)
        # Split

    # Get per application template list
    if 'django.template.loaders.app_directories.load_template_source' in settings.TEMPLATE_LOADERS:
        from django.template.loaders.app_directories import app_template_dirs
        for path in app_template_dirs:
            template_files += retrieve_templates_from_path(path, template_dirs)

    return template_files

#
#def get_templates_and_files(path, template_bases = None, strip_first_slash = True):
#    '''
#    Scan filesystem for templates and returns 
#    (tempalte_relative_name, tempalte_full_path)
#    '''
#    from os.path import join
#    if not template_bases:
#        template_bases = []
#
#    template_files = [] 
#    for root, _dirs, files in os.walk(path):
#        for t_base in template_bases:
#            #import ipdb; ipdb.set_trace()
#
#            if t_base in root:
#                index = root.index(t_base)
#                root = root[index + len(t_base):]
#                break
#
#        template_files += map(lambda f: join(root, f), files)
#    
#    templates = filter(valid_templates, template_files)
#    if strip_first_slash:
#        templates = filter(
#                                 lambda f: f.startswith('/') and f[1:] or f, 
#                                 templates)
#    
#    return templates
