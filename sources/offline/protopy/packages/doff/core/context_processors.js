/*
A set of request processors that return dictionaries to be merged into a
template context. Each function takes the request object as its only parameter
and returns a dictionary to add to the context.

These are referenced from the setting TEMPLATE_CONTEXT_PROCESSORS and used by
RequestContext.
*/

require('doff.core.project', 'get_settings', 'get_project');
var settings = get_settings();
var project = get_project();

/*
def auth(request):
    """
    Returns context variables required by apps that use Django's authentication
    system.

    If there is no 'user' attribute in the request, uses AnonymousUser (from
    django.contrib.auth).
    """
    if hasattr(request, 'user'):
        user = request.user
    else:
        from django.contrib.auth.models import AnonymousUser
        user = AnonymousUser()
    return {
        'user': user,
        'messages': user.get_and_delete_messages(),
        'perms': PermWrapper(user),
    }
*/
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

function offline(request) {
    return {'OFFLINE': true};
}

function request(request) {
    return {'request': request};
}

publish({
    debug: debug,
    media: media,
    offline: offline,
    request: request
});