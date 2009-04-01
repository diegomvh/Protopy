"""
This module converts requested URLs to callback view functions.

RegexURLResolver is the main class here. Its resolve() method takes a URL (as
a string) and returns a tuple in this format:

    (view_function, function_args, function_kwargs)
"""

import re

from django.http import Http404
from django.core.exceptions import ImproperlyConfigured, ViewDoesNotExist
from django.utils.datastructures import MultiValueDict
from django.utils.encoding import iri_to_uri, force_unicode, smart_str
from django.utils.functional import memoize
from django.utils.regex_helper import normalize
from django.utils.thread_support import currentThread

try:
    reversed
except NameError:
    from django.utils.itercompat import reversed     # Python 2.3 fallback
    from sets import Set as set

_resolver_cache = {} # Maps urlconf modules to RegexURLResolver instances.
_callable_cache = {} # Maps view and url pattern names to their view functions.

# SCRIPT_NAME prefixes for each thread are stored here. If there's no entry for
# the current thread (which is the only one we ever access), it is assumed to
# be empty.
_prefixes = {}

var RegexURLPattern = type('RegexURLPattern', [object], {});
class Resolver404(Http404):
    pass

var RegexURLPattern = type('RegexURLPattern', [object], {});
class NoReverseMatch(Exception):
    # Don't make this raise an error when used in a template.
    silent_variable_failure = True

/*
Convert a string version of a function name to the callable object.

If the lookup_view is not an import path, it is assumed to be a URL pattern
label and the original string is returned.

If can_fail is True, lookup_view might be a URL pattern label, so errors
during the import fail and the string is returned.
*/
function get_callable(lookup_view, can_fail) {
    can_fail = can_fail || false;
    if (!callable(lookup_view))
        try {
            //Bail early for non-ASCII strings (they can't be functions).
            mod_name, func_name = get_mod_func(lookup_view);
            if (func_name)
                var lookup_view = $L(mod_name, func_name);
                if (!callable(lookup_view))
                    throw new AttributeError("'%s.%s' is not a callable.".subs(mod_name, func_name));
        } catch (e if isincance(e, [LoadError, AttributeError]) {
            if (!can_fail)
                throw e;
        }
    return lookup_view;
}
//TODO: quiza este bueno algo para la memoria :)
//get_callable = memoize(get_callable, _callable_cache, 1)

function get_resolver(urlconf) {
    if (!urlconf) {
        var settings = $L('doff.conf', 'settings');
        urlconf = settings.ROOT_URLCONF;
    }
    return new RegexURLResolver(r'^/', urlconf);
}
//get_resolver = memoize(get_resolver, _resolver_cache, 1)

function get_mod_func(callback) {
    // Converts 'doff.views.news.stories.story_detail' to ['doff.views.news.stories', 'story_detail']
    var dot = callback.lastIndexOf('.');
    if (dot == -1)
        return [callback, ''];
    return [callback.slice(0, dot), callback.slice(dot + 1)];
}

var RegexURLPattern = type('RegexURLPattern', [object], {
    __init__: function __init__(regex, callback, default_args, name) {
        // regex is a string representing a regular expression.
        // callback is either a string like 'foo.views.news.stories.story_detail'
        // which represents the path to a module and a view function name, or a
        // callable object (view).
        this.regex = RegExp(regex);
        if (callable(callback))
            this._callback = callback;
        else {
            this._callback = null;
            this._callback_str = callback;
        }
        this.default_args = default_args || {};
        this.name = name;
    },

    add_prefix: function add_prefix(prefix) {
        //Adds the prefix string to a string-based callback.
        if (!prefix || !hasattr(this, '_callback_str'))
            return;
        this._callback_str = prefix + '.' + this._callback_str;
    }

    resolve: function resolve(path)
        var match = this.regex.exec(path);
        if (bool(match)) {
            // If there are any named groups, use those as kwargs, ignoring
            // non-named groups. Otherwise, pass all non-named arguments as
            // positional arguments.
            var kwargs = match.groupdict();
            if (kwargs)
                args = [];
            else
                args = match.groups();
            // In both cases, pass any extra_kwargs as **kwargs.
            extend(kwargs, this.default_args);

            return [this.callback, args, kwargs];
       }
    },

    get callback() {
        if (this._callback != null)
            return this._callback;
        try {
            this._callback = get_callable(this._callback_str);
        } catch (e if isinstance(e, LoadError)) {
            var [mod_name, none] = get_mod_func(this._callback_str);
            throw new ViewDoesNotExist("Could not import %s. Error was: %s".subs(mod_name, str(e)));
        } catch (e) {
            var [mod_name, func_name] = get_mod_func(this._callback_str);
            throw new ViewDoesNotExist("Tried %s in module %s. Error was: %s".subs(func_name, mod_name, str(e)));
        }
        return this._callback;
    }
});

var RegexURLResolver = type('RegexURLResolver', [object], {
    def __init__(self, regex, urlconf_name, default_kwargs=None):
        # regex is a string representing a regular expression.
        # urlconf_name is a string representing the module containing urlconfs.
        self.regex = re.compile(regex, re.UNICODE)
        self.urlconf_name = urlconf_name
        self.callback = None
        self.default_kwargs = default_kwargs or {}
        self._reverse_dict = MultiValueDict()

    get reverse_dict() {
        if not self._reverse_dict and hasattr(self.urlconf_module, 'urlpatterns'):
            for pattern in reversed(self.urlconf_module.urlpatterns):
                p_pattern = pattern.regex.pattern
                if p_pattern.startswith('^'):
                    p_pattern = p_pattern[1:]
                if isinstance(pattern, RegexURLResolver):
                    parent = normalize(pattern.regex.pattern)
                    for name in pattern.reverse_dict:
                        for matches, pat in pattern.reverse_dict.getlist(name):
                            new_matches = []
                            for piece, p_args in parent:
                                new_matches.extend([(piece + suffix, p_args + args) for (suffix, args) in matches])
                            self._reverse_dict.appendlist(name, (new_matches, p_pattern + pat))
                else:
                    bits = normalize(p_pattern)
                    self._reverse_dict.appendlist(pattern.callback, (bits, p_pattern))
                    self._reverse_dict.appendlist(pattern.name, (bits, p_pattern))
        return self._reverse_dict
    },

    def resolve(self, path):
        tried = []
        match = self.regex.search(path)
        if match:
            new_path = path[match.end():]
            for pattern in self.urlconf_module.urlpatterns:
                try:
                    sub_match = pattern.resolve(new_path)
                except Resolver404, e:
                    tried.extend([(pattern.regex.pattern + '   ' + t) for t in e.args[0]['tried']])
                else:
                    if sub_match:
                        sub_match_dict = dict([(smart_str(k), v) for k, v in match.groupdict().items()])
                        sub_match_dict.update(self.default_kwargs)
                        for k, v in sub_match[2].iteritems():
                            sub_match_dict[smart_str(k)] = v
                        return sub_match[0], sub_match[1], sub_match_dict
                    tried.append(pattern.regex.pattern)
            raise Resolver404, {'tried': tried, 'path': new_path}

    get urlconf_module() {
        try:
            return self._urlconf_module
        except AttributeError:
            self._urlconf_module = __import__(self.urlconf_name, {}, {}, [''])
            return self._urlconf_module
    }

    get url_patterns() {
        return self.urlconf_module.urlpatterns
    }

    def _resolve_special(self, view_type):
        callback = getattr(self.urlconf_module, 'handler%s' % view_type)
        mod_name, func_name = get_mod_func(callback)
        try:
            return getattr(__import__(mod_name, {}, {}, ['']), func_name), {}
        except (ImportError, AttributeError), e:
            raise ViewDoesNotExist, "Tried %s. Error was: %s" % (callback, str(e))

    def resolve404(self):
        return self._resolve_special('404')

    def resolve500(self):
        return self._resolve_special('500')

    def reverse(self, lookup_view, *args, **kwargs):
        if args and kwargs:
            raise ValueError("Don't mix *args and **kwargs in call to reverse()!")
        try:
            lookup_view = get_callable(lookup_view, True)
        except (ImportError, AttributeError), e:
            raise NoReverseMatch("Error importing '%s': %s." % (lookup_view, e))
        possibilities = self.reverse_dict.getlist(lookup_view)
        for possibility, pattern in possibilities:
            for result, params in possibility:
                if args:
                    if len(args) != len(params):
                        continue
                    unicode_args = [force_unicode(val) for val in args]
                    candidate =  result % dict(zip(params, unicode_args))
                else:
                    if set(kwargs.keys()) != set(params):
                        continue
                    unicode_kwargs = dict([(k, force_unicode(v)) for (k, v) in kwargs.items()])
                    candidate = result % unicode_kwargs
                if re.search(u'^%s' % pattern, candidate, re.UNICODE):
                    return candidate
        raise NoReverseMatch("Reverse for '%s' with arguments '%s' and keyword "
                "arguments '%s' not found." % (lookup_view, args, kwargs))
});

function resolve(path, urlconf) {
    return get_resolver(urlconf).resolve(path);
}

def reverse(viewname, urlconf=None, args=None, kwargs=None, prefix=None):
    args = args or []
    kwargs = kwargs or {}
    if prefix is None:
        prefix = get_script_prefix()
    return iri_to_uri(u'%s%s' % (prefix, get_resolver(urlconf).reverse(viewname,
            *args, **kwargs)))

def clear_url_caches():
    global _resolver_cache
    global _callable_cache
    _resolver_cache.clear()
    _callable_cache.clear()

def set_script_prefix(prefix):
    """
    Sets the script prefix for the current thread.
    """
    if not prefix.endswith('/'):
        prefix += '/'
    _prefixes[currentThread()] = prefix

def get_script_prefix():
    """
    Returns the currently active script prefix. Useful for client code that
    wishes to construct their own URLs manually (although accessing the request
    instance is normally going to be a lot cleaner).
    """
    return _prefixes.get(currentThread(), u'/')

