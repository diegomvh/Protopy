require('doff.core.urlresolvers');
require('doff.utils.http');
require('doff.conf.settings', 'settings');

var CommonMiddleware = type('CommonMiddleware', [ object ], {
    
    process_request: function(request) {
        var host = request.host;
        var old_url = [host, request.path];
        var new_url = [host, request.path];

        // Append a slash if APPEND_SLASH is set and the URL doesn't have a
        // trailing slash and there is no pattern for the current path
        if (settings.APPEND_SLASH && (!old_url[1].endswith('/'))) {
            if (! _is_valid_path(request.path) && _is_valid_path("%s/".subs(request.path))) {
                new_url[1] = new_url[1] + '/';
                if (settings.DEBUG && request.method == 'POST')
                    throw new RuntimeError, ("You called this URL via POST, but the URL doesn't end " +
                                            "in a slash and you have APPEND_SLASH set. Django can't " +
                                            "redirect to the slash URL while maintaining POST data. " +
                                            "Change your form to point to %s%s (note the trailing " +
                                            "slash), or set APPEND_SLASH=False in your Django " +
                                            "settings.".subs(new_url[0], new_url[1]));
            }
        }

        if (new_url[0] == old_url[0] && new_url[1] == old_url[1])
            // No redirects required.
            return;
        if (new_url[0])
            var newurl = "%s://%s%s".subs( request.is_secure() && 'https' || 'http', new_url[0], new_url[1]);
        else
            var newurl = new_url[1];
        if (bool(request.GET))
            newurl += '?' + request.URL.query;
        return new http.HttpResponsePermanentRedirect(newurl);
    },

    process_exception: function(request, exception) {
        debugger;
        alert('instalame');
    }
});

function _is_valid_path(path) {
    /*
    Returns True if the given path resolves against the default URL resolver,
    False otherwise.

    This is a convenience method to make working with "is this a match?" cases
    easier, avoiding unnecessarily indented try...except blocks.
    */
    try {
        urlresolvers.resolve(path);
        return true;
    } catch (e if isinstance(e, urlresolvers.Resolver404)) {
        return false;
    }
}

publish({
    CommonMiddleware: CommonMiddleware
});