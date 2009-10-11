require('doff.template.loader');
require('doff.template.context', 'RequestContext');
require('doff.utils.http', 'HttpResponse', 'HttpResponseRedirect', 'HttpResponsePermanentRedirect', 'HttpResponseGone');

function direct_to_template(request) {
    /*
    Render a given template with any extra URL parameters in the context as
    ``{{ params }}``.
    */
    var arg = new Arguments(arguments, {extra_context:null, mimetype:null});
    var kwargs = arg.kwargs;
    if (kwargs['extra_context'] == null) kwargs['extra_context'] = {};
    var dictionary = {'params': kwargs};
    for each (var [key, value] in items(kwargs['extra_context'])) {
        if (callable(value))
            dictionary[key] = value();
        else
            dictionary[key] = value;
    }
    var c = new RequestContext(request, dictionary);
    var t = loader.get_template(kwargs['template']);
    return new HttpResponse(t.render(c), { mimetype: kwargs['mimetype'] });
}

function redirect_to(request) {
    /*
    Redirect to a given URL.

    The given url may contain dict-style string formatting, which will be
    interpolated against the params in the URL.  For example, to redirect from
    ``/foo/<id>/`` to ``/bar/<id>/``, you could use the following URLconf::

        urlpatterns = patterns('',
            ('^foo/(?P<id>\d+)/$', 'django.views.generic.simple.redirect_to', {'url' : '/bar/%(id)s/'}),
        )

    If the given url is ``None``, a HttpResponseGone (410) will be issued.

    If the ``permanent`` argument is False, then the response will have a 302
    HTTP status code. Otherwise, the status code will be 301.
    */
    var arg = new Arguments(arguments, {permanent: true});
    var kwargs = arg.kwargs;
    if (kwargs['url']) {
        var klass = kwargs['permanent'] && HttpResponsePermanentRedirect || HttpResponseRedirect;
        return new klass(kwargs['url'].subs(kwargs));
    } else {
        return new HttpResponseGone();
    }
}

publish({
    direct_to_template: direct_to_template,
    redirect_to: redirect_to
});
