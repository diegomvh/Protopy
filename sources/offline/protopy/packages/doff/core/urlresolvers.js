require('doff.utils.http', 'Http404');
require('doff.core.exceptions', 'ViewDoesNotExist');

var Resolver404 = type('Resolver404', Http404);
var NoReverseMatch = type('NoReverseMatch', Exception);

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
            var [mod_name, func_name] = get_mod_func(lookup_view);
            if (func_name)
                var lookup_view = require(mod_name, func_name);
                if (!callable(lookup_view))
                    throw new AttributeError("'%s.%s' is not a callable.".subs(mod_name, func_name));
        } catch (e if isincance(e, [LoadError, AttributeError])) {
            if (!can_fail)
                throw e;
        }
    return lookup_view;
}
//TODO: quiza este bueno algo para la memoria :)
//get_callable = memoize(get_callable, _callable_cache, 1)

function get_resolver(urlconf) {
    if (!urlconf) {
        var settings = require('doff.core.project', 'get_settings');
	var settings = get_settings();
        urlconf = settings.ROOT_URLCONF;
    }
    return new RegexURLResolver('^/', urlconf);
}
//get_resolver = memoize(get_resolver, _resolver_cache, 1)

function get_mod_func(callback) {
    // Converts 'doff.views.news.stories.story_detail' to ['doff.views.news.stories', 'story_detail']
    var dot = callback.lastIndexOf('.');
    if (dot == -1)
        return [callback, ''];
    return [callback.slice(0, dot), callback.slice(dot + 1)];
}

var RegexURLPattern = type('RegexURLPattern', [ object ], {
    __init__: function(regex, callback, default_args, name) {
        // regex is a string representing a regular expression.
        // callback is either a string like 'foo.views.news.stories.story_detail'
        // which represents the path to a module and a view function name, or a
        // callable object (view).
        this.regex = new RegExp(regex);
        if (callable(callback))
            this._callback = callback;
        else {
            this._callback = null;
            this._callback_str = callback;
        }
        this.default_args = default_args || {};
        this.name = name;
    },

    add_prefix: function(prefix) {
        //Adds the prefix string to a string-based callback.
        if (!prefix || !hasattr(this, '_callback_str'))
            return;
        this._callback_str = prefix + '.' + this._callback_str;
    },

    resolve: function(path) {
        var match = path.match(this.regex);
        if (bool(match)) {
            // In both cases, pass any extra_kwargs as **kwargs.
            return [this.callback, match.slice(1), this.default_args];
       }
    },

    get callback() {
        if (this._callback != null)
            return this._callback;
        try {
            this._callback = get_callable(this._callback_str);
        } catch (e if isinstance(e, LoadError)) {
            var [mod_name, none] = get_mod_func(this._callback_str);
            throw new ViewDoesNotExist("Could not import %s. Error was: %s".subs(mod_name, string(e)));
        } catch (e) {
            var [mod_name, func_name] = get_mod_func(this._callback_str);
            throw new ViewDoesNotExist("Tried %s in module %s. Error was: %s".subs(func_name, mod_name, string(e)));
        }
        return this._callback;
    }
});

var RegexURLResolver = type('RegexURLResolver', object, {
    __init__: function(regex, urlconf_name, default_kwargs) {
        // regex is a string representing a regular expression.
        // urlconf_name is a string representing the module containing urlconfs.
        this.regex = new RegExp(regex);
        this.urlconf_name = urlconf_name;
        this.callback = null;
        this.default_kwargs = default_kwargs || {};
        this._reverse_dict = {}; //MultiValueDict()
    },

    resolve: function resolve(path) {
        var tried = [];
        var index = path.search(this.regex);
        var match = path.match(this.regex);
        if (index != -1) {
            var new_path = path.slice(match[0].length + index);
            for each (var pattern in this.urlconf_module.urlpatterns) {
                try {
                    var sub_match = pattern.resolve(new_path);
                } catch (e if isinstance(e, Resolver404)) {
                    tried = tried.concat([(pattern.regex.pattern + '   ' + t) for (t in e.args[0]['tried'])]);
                }
            if (sub_match) {
                return [sub_match[0], sub_match[1], this.default_kwargs];
            }
                tried.push(pattern.regex.pattern);
            }
            throw new Resolver404({'tried': tried, 'path': new_path});
        }
    },

    get urlconf_module() {
        var ret = this._urlconf_module;
        if (!ret) {
            ret = this._urlconf_module = require(this.urlconf_name);
        }
        return ret;
    },

    get url_patterns() {
        return this.urlconf_module.urlpatterns;
    },

    _resolve_special: function(view_type) {
        callback = getattr(this.urlconf_module, 'handler%s'.subs(view_type));
        var [mod_name, func_name] = get_mod_func(callback);
        try {
            return [require(mod_name, func_name), {}];
        } catch (e if isinstance(e, LoadError)) {
            throw new ViewDoesNotExist("Tried %s. Error was: %s".subs(callback, e));
        }
    },

    resolve404: function() {
        return this._resolve_special('404');
    },

    resolve500: function() {
        return this._resolve_special('500');
    }
/*
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
*/
});

function resolve(path, urlconf) {
    return get_resolver(urlconf).resolve(path);
}

publish({
    RegexURLPattern: RegexURLPattern,
    RegexURLResolver: RegexURLResolver 
});