import os
import re
import datetime
import sys as _sys

from operator import itemgetter as _itemgetter
from keyword import iskeyword as _iskeyword
from django.utils import simplejson
from glob import glob

try:
    import decimal
except ImportError:
    from django.utils import _decimal as decimal    # Python 2.3 fallback

#===============================================================================
# Python <2.6 support code
#===============================================================================
def namedtuple(typename, field_names, verbose=False, rename=False):
    """Returns a new subclass of tuple with named fields.

    >>> Point = namedtuple('Point', 'x y')
    >>> Point.__doc__                   # docstring for the new class
    'Point(x, y)'
    >>> p = Point(11, y=22)             # instantiate with positional args or keywords
    >>> p[0] + p[1]                     # indexable like a plain tuple
    33
    >>> x, y = p                        # unpack like a regular tuple
    >>> x, y
    (11, 22)
    >>> p.x + p.y                       # fields also accessable by name
    33
    >>> d = p._asdict()                 # convert to a dictionary
    >>> d['x']
    11
    >>> Point(**d)                      # convert from a dictionary
    Point(x=11, y=22)
    >>> p._replace(x=100)               # _replace() is like str.replace() but targets named fields
    Point(x=100, y=22)

    """

    # Parse and validate the field names.  Validation serves two purposes,
    # generating informative error messages and preventing template injection attacks.
    if isinstance(field_names, basestring):
        field_names = field_names.replace(',', ' ').split() # names separated by whitespace and/or commas
    field_names = tuple(map(str, field_names))
    if rename:
        names = list(field_names)
        seen = set()
        for i, name in enumerate(names):
            if (not min(c.isalnum() or c=='_' for c in name) or _iskeyword(name)
                or not name or name[0].isdigit() or name.startswith('_')
                or name in seen):
                    names[i] = '_%d' % i
            seen.add(name)
        field_names = tuple(names)
    for name in (typename,) + field_names:
        if not min(c.isalnum() or c=='_' for c in name):
            raise ValueError('Type names and field names can only contain alphanumeric characters and underscores: %r' % name)
        if _iskeyword(name):
            raise ValueError('Type names and field names cannot be a keyword: %r' % name)
        if name[0].isdigit():
            raise ValueError('Type names and field names cannot start with a number: %r' % name)
    seen_names = set()
    for name in field_names:
        if name.startswith('_') and not rename:
            raise ValueError('Field names cannot start with an underscore: %r' % name)
        if name in seen_names:
            raise ValueError('Encountered duplicate field name: %r' % name)
        seen_names.add(name)

    # Create and fill-in the class template
    numfields = len(field_names)
    argtxt = repr(field_names).replace("'", "")[1:-1]   # tuple repr without parens or quotes
    reprtxt = ', '.join('%s=%%r' % name for name in field_names)
    template = '''class %(typename)s(tuple):
        '%(typename)s(%(argtxt)s)' \n
        __slots__ = () \n
        _fields = %(field_names)r \n
        def __new__(_cls, %(argtxt)s):
            return _tuple.__new__(_cls, (%(argtxt)s)) \n
        @classmethod
        def _make(cls, iterable, new=tuple.__new__, len=len):
            'Make a new %(typename)s object from a sequence or iterable'
            result = new(cls, iterable)
            if len(result) != %(numfields)d:
                raise TypeError('Expected %(numfields)d arguments, got %%d' %% len(result))
            return result \n
        def __repr__(self):
            return '%(typename)s(%(reprtxt)s)' %% self \n
        def _asdict(self):
            'Return a new dict which maps field names to their values'
            return dict(zip(self._fields, self)) \n
        def _replace(_self, **kwds):
            'Return a new %(typename)s object replacing specified fields with new values'
            result = _self._make(map(kwds.pop, %(field_names)r, _self))
            if kwds:
                raise ValueError('Got unexpected field names: %%r' %% kwds.keys())
            return result \n
        def __getnewargs__(self):
            return tuple(self) \n\n''' % locals()
    for i, name in enumerate(field_names):
        template += '        %s = _property(_itemgetter(%d))\n' % (name, i)
    if verbose:
        print template

    # Execute the template string in a temporary namespace
    namespace = dict(_itemgetter=_itemgetter, __name__='namedtuple_%s' % typename,
                     _property=property, _tuple=tuple)
    try:
        exec template in namespace
    except SyntaxError, e:
        raise SyntaxError(e.message + ':\n' + template)
    result = namespace[typename]

    # For pickling to work, the __module__ variable needs to be set to the frame
    # where the named tuple is created.  Bypass this step in enviroments where
    # sys._getframe is not defined (Jython for example) or sys._getframe is not
    # defined for arguments greater than 0 (IronPython).
    try:
        result.__module__ = _sys._getframe(1).f_globals.get('__name__', '__main__')
    except (AttributeError, ValueError):
        pass

    return result

class objdict(dict):
    '''
    Enables a dict to accpet dot syntax for element access.
    Instead of my_dict['url'], you could write my_objdict.url
    '''
    def __getattr__(self, k):
        if self.has_key(k):
            return self[k]


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

def excluding_abswalk_with_simlinks(path, exclude = None):
    '''
    Returns an iterator on the path base taking into account a list of 
    @param path: Base path
    @param exclude: May be a list of strings, regular expressions or functions
    '''
    if type(exclude) is not list:
        exclude = [exclude, ]
        
    for p in abswalk_with_simlinks(path):
        #TODO: Optimizar esto, es una asco
        for e in exclude:
            if issubclass(type(e), basestring):
                if e == p:
                    continue
            elif callable(e) and e(p):
                continue
            # Try to identify a Regular Expression
            elif hasattr(e, 'search') and callable(getattr(e, 'search')) and e.search(p):
                continue
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
    return True

def _retrieve_templates_from_path(path, template_bases = None, strip_first_slash = True):
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

def full_template_list(exclude_apps = None, exclude_callable = None):
    from django.conf import settings
    template_dirs = map(lambda s: s.split(os.sep)[-1], settings.TEMPLATE_DIRS)

    template_files = []
    for path in settings.TEMPLATE_DIRS:
        template_files += _retrieve_templates_from_path(path, template_dirs)
        # Split

    # Get per application template list
    if 'django.template.loaders.app_directories.load_template_source' in settings.TEMPLATE_LOADERS:
        from django.template.loaders.app_directories import app_template_dirs
        for path in app_template_dirs:
            template_files += _retrieve_templates_from_path(path, template_dirs)

    return template_files

def get_templates_and_files(path, template_bases = None, strip_first_slash = True):
    '''
    Scan filesystem for templates and returns 
    (tempalte_relative_name, tempalte_full_path)
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
        templates = filter(
                                 lambda f: f.startswith('/') and f[1:] or f, 
                                 templates)
    return templates

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


# TODO: Fix
#class ProtpyJsonEncoder(DjangoJSONEncoder):
    #def default(self, o):
        #from offline.models import GearsManifest, GearsManifestEntry
        
        #if isinstance(o, GearsManifest):
            #entries = o.gearsmanifestentry_set.all()
            #data = []
            
            #for entry in entries:
                #d = {}
                #for k in ("url", "redirect", "src", "ignoreQuery"):
                    #v = getattr(entry, k)
                    #if v:
                        #d[k] = v
                #data.append(d)
            
            #return self.default({
                #"betaManifestVersion": o.MANIFEST_VERSION,
                #"version": o.version,
                #"entries": unicode(data)
                ##"entries": self.default(list(o.gearsmanifestentry_set.all())) 
            #})
        #elif isinstance(o, GearsManifestEntry):
            #d = {}
            #for k in ("url", "redirect", "src", "ignoreQuery"):
                #v = getattr(o, k)
                #if v:
                    #d[k] = v
            #return self.default(d)
        
        #else:
            #print type(o)
            #return super(ProtpyJsonEncoder, self).default(o)


if __name__ == '__main__':
    # verify that instances can be pickled
    from cPickle import loads, dumps
    Point = namedtuple('Point', 'x, y', True)
    p = Point(x=10, y=20)
    assert p == loads(dumps(p, -1))

    # test and demonstrate ability to override methods
    class Point(namedtuple('Point', 'x y')):
        @property
        def hypot(self):
            return (self.x ** 2 + self.y ** 2) ** 0.5
        def __str__(self):
            return 'Point: x=%6.3f y=%6.3f hypot=%6.3f' % (self.x, self.y, self.hypot)

    for p in Point(3,4), Point(14,5), Point(9./7,6):
        print p

    class Point(namedtuple('Point', 'x y')):
        'Point class with optimized _make() and _replace() without error-checking'
        _make = classmethod(tuple.__new__)
        def _replace(self, _map=map, **kwds):
            return self._make(_map(kwds.get, ('x', 'y'), self))

    print Point(11, 22)._replace(x=100)

    import doctest
    TestResults = namedtuple('TestResults', 'failed attempted')
    print TestResults(*doctest.testmod())
