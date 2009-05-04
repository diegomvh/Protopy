require('doff.core.urlresolvers', 'RegexURLPattern', 'RegexURLResolver');
require('doff.core.exceptions', 'ImproperlyConfigured');

var handler404 = 'django.views.defaults.page_not_found';
var handler500 = 'django.views.defaults.server_error';

function include(urlconf_module) {
    return [urlconf_module];
}

function patterns(prefix) {
    var arguments = new Arguments(arguments);
    var args = arguments.args;
    var pattern_list = [];
    for each (var t in args) {
        if (isinstance(t, Array))
            t = url(t[0], t[1], t[2], t[3], prefix = prefix)
        else if (isinstance(t, RegexURLPattern))
            t.add_prefix(prefix)
        pattern_list.push(t);
    }
    return pattern_list;
}

function url(regex, view, kwargs, name, prefix) {
    prefix = prefix || '';
    if (isinstance(view, Array)) {
        // For include(...) processing.
        return new RegexURLResolver(regex, view[0], kwargs)
    } else {
        if (isinstance(view, String)) {
            if (!view)
                throw new ImproperlyConfigured('Empty URL pattern view name not permitted (for pattern %s)'.subs(regex));
            if (prefix)
                view = prefix + '.' + view;
	}
        return new RegexURLPattern(regex, view, kwargs, name);
    }
}

publish({
    handler404: handler404,
    handler500: handler500,
    include: include,
    patterns: patterns,
    url: url
});