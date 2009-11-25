/*
A set of request processors that return dictionaries to be merged into a
template context. Each function takes the request object as its only parameter
and returns a dictionary to add to the context.

These are referenced from the setting TEMPLATE_CONTEXT_PROCESSORS and used by
RequestContext.
*/

require('doff.core.project', 'get_project');
require('doff.conf.settings', 'settings');


function auth(request) {
    var user;
	if (hasattr(request, 'user')) {
        user = request.user;  
	} else {
        require('doff.contrib.auth.models', 'AnonymousUser');
        user = new AnonymousUser();
    }
    return { 'user': user };
}

function debug(request) {
    //Returns context variables helpful for debugging.
    var context_extras = {}
    if (settings.DEBUG)
        context_extras['debug'] = true;
        /*from django.db import connection
        context_extras['sql_queries'] = connection.queries*/
    return context_extras;
}

function media(request) {
    return {'MEDIA_URL': settings.MEDIA_URL};
}

function request(request) {
    return {'request': request};
}

publish({
	auth: auth,
    debug: debug,
    media: media,
    request: request
});