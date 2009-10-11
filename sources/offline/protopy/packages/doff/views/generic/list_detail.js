require('doff.template.loader');
require('doff.template.context', 'RequestContext');
require('doff.utils.http', 'Http404', 'HttpResponse');
//WTF: from django.core.xheaders import populate_xheaders
require('doff.core.paginator', 'Paginator', 'InvalidPage');
require('doff.core.exceptions', 'ObjectDoesNotExist');

function object_list(request) {
    /*
    Generic list of objects.

    Templates: ``<app_label>/<model_name>_list.html``
    Context:
        object_list
            list of objects
        is_paginated
            are the results paginated?
        results_per_page
            number of objects per page (if paginated)
        has_next
            is there a next page?
        has_previous
            is there a prev page?
        page
            the current page
        next
            the next page
        previous
            the previous page
        pages
            number of pages, total
        hits
            number of objects, total
        last_on_page
            the result number of the last of object in the
            object_list (1-indexed)
        first_on_page
            the result number of the first object in the
            object_list (1-indexed)
        page_range:
            A list of the page numbers (1-indexed).
    */
    var arg = new Arguments(arguments, { paginate_by:null, page:null, allow_empty:true,
            template_name:null, template_loader:loader, extra_context:null, context_processors:null,
            template_object_name:'object', mimetype:null});
    var kwargs = arg.kwargs;
    if (kwargs['extra_context'] == null)
        kwargs['extra_context'] = {};
    var queryset = kwargs['queryset']._clone();
    if (kwargs['paginate_by']) {
        var paginator = new Paginator(queryset, paginate_by, kwargs['allow_empty']);
        if (!kwargs['page'])
            var page = request.GET['page'] || 1;
        var page_number = Number(page);
        if (isNaN(page_number)) {
            if (kwargs['page'] == 'last')
                page_number = paginator.num_pages;
            else
                throw new Http404();
        }
        try {
            var page_obj = paginator.page(page_number);
        } catch (e if isinstance(e, InvalidPage)) {
            throw new Http404();
        }
        var data = {
            'paginator': paginator,
            'page_obj': page_obj,
            'is_paginated': page_obj.has_other_pages(),
            'results_per_page': paginator.per_page,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'page': page_obj.number,
            'next': page_obj.next_page_number(),
            'previous': page_obj.previous_page_number(),
            'first_on_page': page_obj.start_index(),
            'last_on_page': page_obj.end_index(),
            'pages': paginator.num_pages,
            'hits': paginator.count,
            'page_range': paginator.page_range,
        };
        data['%s_list'.subs(kwargs['template_object_name'])] = page_obj.object_list;
        var c = new RequestContext(request, data, kwargs['context_processors']);
    } else {
        var data = {
            'paginator': null,
            'page_obj': null,
            'is_paginated': false,
        };
        data['%s_list'.subs(kwargs['template_object_name'])] = queryset;
        var c = new RequestContext(request, data, kwargs['context_processors']);
        if (!kwargs['allow_empty'] && len(queryset) == 0)
            throw new Http404();
    }
    for each (var [key, value] in items(kwargs['extra_context'])) {
        if (callable(value))
            c[key] = value();
        else
            c[key] = value;
    }
    if (!kwargs['template_name']) {
        var model = queryset.model;
        var template_name = "%s/%s_list.html".subs(model._meta.remote_app_label, model._meta.module_name);
    }
    var t = kwargs['template_loader'].get_template(template_name);
    return new HttpResponse(t.render(c), { mimetype: kwargs['mimetype'] });
}

function object_detail(request) {

    /*
    Generic detail of an object.

    Templates: ``<app_label>/<model_name>_detail.html``
    Context:
        object
            the object
    */
    var arg = new Arguments(arguments, {object_id:null, slug:null, slug_field:'slug',
        template_name:null, template_name_field:null, template_loader: loader, extra_context:null,
        context_processors:null, template_object_name:'object', mimetype:null});
    var kwargs = arg.kwargs;
    if (kwargs['extra_context'] == null)
        kwargs['extra_context'] = {};
    var queryset = kwargs['queryset'];
    var model = queryset.model;
    if (kwargs['object_id']) {
        queryset = queryset.filter({ pk: object_id });
    } else if (kwargs['slug'] && kwargs['slug_field']) {
        var query = {};
        query[kwargs['slug_field']] = kwargs['slug'];
        queryset = queryset.filter(query);
    } else {
        throw new AttributeError("Generic detail view must be called with either an object_id or a slug/slug_field.");
    }
    try {
        var obj = queryset.get();
    } catch (e if isinstance(e, ObjectDoesNotExist)) {
        throw new Http404("No %s found matching the query".subs(model._meta.verbose_name));
    }
    if (!kwargs['template_name'])
        kwargs['template_name'] = "%s/%s_detail.html".subs(model._meta.remote_app_label, model._meta.module_name);
    if (kwargs['template_name_field']) {
        var template_name_list = [getattr(obj, kwargs['template_name_field']), template_name];
        var t = kwargs['template_loader'].select_template(template_name_list);
    } else {
        var t = kwargs['template_loader'].get_template(kwargs['template_name']);
    }
    var c = new RequestContext(request, {
        template_object_name: obj,
    }, kwargs['context_processors']);
    for each (var [key, value] in items(kwargs['extra_context'])) {
        if (callable(value))
            c[key] = value();
        else
            c[key] = value;
    }
    var response = new HttpResponse(t.render(c), { mimetype: kwargs['mimetype'] });
    //populate_xheaders(request, response, model, getattr(obj, obj._meta.pk.name))
    return response;
}

publish({
    object_list: object_list,
    object_detail: object_detail
});