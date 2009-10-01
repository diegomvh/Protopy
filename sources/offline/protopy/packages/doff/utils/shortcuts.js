require('doff.template.loader');
require('doff.utils.http', 'HttpResponse', 'Http404', 'HttpResponseRedirect', 'HttpResponsePermanentRedirect');
require('doff.db.models.manager', 'Manager');
require('doff.db.models.query', 'QuerySet');
require('doff.core.urlresolvers');

function render_to_response() {
    var arg = new Arguments(arguments);
    var httpresponse_kwargs = {'mimetype': arg.kwargs['mimetype'] || null};
    return new HttpResponse(loader.render_to_string.apply(this, arg.argskwargs), httpresponse_kwargs);
}

function redirect(to) {
    /*
    Returns an HttpResponseRedirect to the apropriate URL for the arguments
    passed.
    
    The arguments could be:
    
        * A model: the model's `get_absolute_url()` function will be called.
    
        * A view name, possibly with arguments: `urlresolvers.reverse()` will
          be used to reverse-resolve the name.
         
        * A URL, which will be used as-is for the redirect location.
        
    By default issues a temporary redirect; pass permanent=True to issue a
    permanent redirect
    */
    var arg = new Arguments(arguments);
    if (arg.kwargs['permanent'])
        var redirect_class = HttpResponsePermanentRedirect;
    else
        var redirect_class = HttpResponseRedirect;
    
    // If it's a model, use get_absolute_url()
    if (hasattr(to, 'get_absolute_url'))
        return new redirect_class(to.get_absolute_url());
    
    /* Next try a reverse URL resolution. no implemented
    try:
        return new redirect_class(urlresolvers.reverse(to, args=args, kwargs=kwargs))
    except urlresolvers.NoReverseMatch:
        # If this doesn't "feel" like a URL, re-raise.
        if '/' not in to and '.' not in to:
            raise
    */
    // Finally, fall back and assume it's a URL
    return new redirect_class(to);
}

function _get_queryset(klass) {
    /*
    Returns a QuerySet from a Model, Manager, or QuerySet. Created to make
    get_object_or_404 and get_list_or_404 more DRY.
    */
    if (isinstance(klass, QuerySet))
        return klass;
    else if (isinstance(klass, Manager))
        var manager = klass;
    else
        var manager = klass._default_manager;
    return manager.all();
}

function get_object_or_404(klass) {
    /*
    Uses get() to return an object, or raises a Http404 exception if the object
    does not exist.

    klass may be a Model, Manager, or QuerySet object. All other passed
    arguments and keyword arguments are used in the get() query.

    Note: Like with get(), an MultipleObjectsReturned will be raised if more than one
    object is found.
    */
    var arg = new Arguments(arguments);
    var queryset = _get_queryset(klass);
    try {
        return queryset.get.apply(queryset, arg.argskwargs);
    } catch (e if isintance(e, queryset.model.DoesNotExist)) {
        throw new Http404('No %s matches the given query.'.subs(queryset.model._meta.object_name));
    }
}

function get_list_or_404(klass) {
    /*
    Uses filter() to return a list of objects, or raise a Http404 exception if
    the list is empty.

    klass may be a Model, Manager, or QuerySet object. All other passed
    arguments and keyword arguments are used in the filter() query.
    */
    var arg = new Arguments(arguments);
    var queryset = _get_queryset(klass)
    var obj_list = array(queryset.filter.apply(queryset, arg.argskwargs));
    if (!bool(obj_list))
        throw new Http404('No %s matches the given query.'.subs(queryset.model._meta.object_name));
    return obj_list;
}

publish ({
    render_to_response: render_to_response,
    redirect: redirect,
    get_object_or_404: get_object_or_404,
    get_list_or_404: get_list_or_404
});