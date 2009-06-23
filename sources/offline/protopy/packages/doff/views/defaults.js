require('doff.core.http');
require('doff.template.context', 'Context', 'RequestContext');
require('doff.template.loader');

function page_not_found(request, template_name) {
    /*
    Default 404 handler.

    Templates: `404.html`
    Context:
        request_path
            The path of the requested URL (e.g., '/app/pages/bad_page/')
    */
    template_name = template_name || '404.html';
    var t = loader.get_template(template_name);
    return new http.HttpResponseNotFound(t.render(new RequestContext(request, {'request_path': request.path})));
}

function server_error(request, template_name) {
/*
    500 error handler.

    Templates: `500.html`
    Context: None
    */
    template_name = template_name || '500.html';
    t = loader.get_template(template_name);
    return new http.HttpResponseServerError(t.render(new Context({})));
}

publish({
    page_not_found:page_not_found,
    server_error:server_error
});