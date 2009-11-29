require('doff.template.loader');
require('doff.forms.models', 'ModelForm');
var models = require('doff.db.models.base');
require('doff.utils.http', 'HttpResponse', 'Http404', 'HttpResponseRedirect');
require('doff.core.exceptions', 'ObjectDoesNotExist', 'ImproperlyConfigured');
require('doff.template.context', 'RequestContext');

var GenericViewError = type('GenericViewError', [ Exception ]);

function apply_extra_context(extra_context, context) {
    /*
    Adds items from extra_context dict to context.  If a value in extra_context
    is callable, then it is called and the result is added to context.
    */
    for each (var [key, value] in items(extra_context)) {
        if (callable(value))
            context.set(key, value());
        else
            context.set(key, value);
    }
}

function get_model_and_form_class(model, form_class) {

    if (form_class)
        return [form_class._meta.model, form_class];
    if (model) {
        var class_name = model.__name__ + 'Form';

        var form_class = type(class_name, [ ModelForm ], {'Meta': {model: model}});
        return [ model, form_class ];
    }
    throw new Exception("Generic view must be called with either a model or form_class argument.");
}
function redirect(post_save_redirect, obj) {
    /**
     * 
     * 
     */
    if (post_save_redirect) {
        return new HttpResponseRedirect(post_save_redirect.subs(obj.__dict__) );
    } else {
        if (!isundefined(obj.get_absolute_url)) {
            return new HttpResponseRedirect(obj.get_absolute_url());
        } else {
            throw new ImproperlyConfigured( "No URL to redirect to.  Either pass a post_save_redirect" +
                                            " parameter to the generic view or define a get_absolute_url" +
                                            " method on the Model.");
        }
    }
}

function lookup_object(model, object_id, slug, slug_field) {
    
    var lookup_kwargs = {};
    if (object_id) {
        lookup_kwargs[ '%s__exact'.subs(model._meta.pk.name) ] = object_id;
    } else {
        if (slug && slug_gield){
            lookup_kwargs['%s__exact'.subs(slug_field)] = slug;
        } else {
            throw new GenericViewError("Generic view must be called with either an object_id or a slug/slug_field.");
        }
    }
    try {
        return model.objects.get( lookup_kwargs );
    } catch (e if isinstance(e, ObjectDoesNotExist)) {
        throw new Http404("No %s found for %s".subs([model._meta.verbose_name, lookup_kwargs]));
    }
}

function create_object(request) {
    var arg = new Arguments(arguments, {
        model: null, 
        template_name: null,
        template_loader: loader, 
        extra_context: null,
        post_save_redirect: null,
        login_required: null, 
        context_processors: null, 
        form_class: null
    });
    var kwargs = arg.kwargs;
    var form, new_object, t, c;

    if (!kwargs['extra_context'])
        kwargs['extra_context'] = {};
    var [model, form_class] = get_model_and_form_class(kwargs['model'], kwargs['form_class']);

    if (request.method == 'POST') {
        var form = new form_class({'data': request.POST, 'files': request.FILES});
        if (form.is_valid()) {
            var new_object = form.save();
            return redirect(kwargs['post_save_redirect'], new_object);
        }
    } else {
        var form = new form_class();
    }

    if (!kwargs['template_name']) {
        kwargs['template_name'] = "%s/%s_form.html".subs(model._meta.app_label, model._meta.module_name);
    }

    var t = kwargs['template_loader'].get_template(kwargs['template_name']);
    var c = new RequestContext(request, {
        'form': form,
        'context_procesors': kwargs['context_processors']
    });

    apply_extra_context(kwargs['extra_context'], c);
    return new HttpResponse(t.render(c));
}

function update_object(request, object_id) {
    var arg = new Arguments(arguments, {
        model:null,
        //object_id:null,
        slug:null,
        slug_field:'slug',
        template_name:null,
        template_loader:loader,
        extra_context: null,
        post_save_redirect:null,
        login_required:False,
        context_processors:null,
        template_object_name:'object',
        form_class:null
    });

    var kwargs = arg.kwargs;
    if (!kwargs['extra_context'])
        kwargs['extra_context'] = {};

    //if login_required and not request.user.is_authenticated():
    //    return redirect_to_login(request.path)

    var [model, form_class] = get_model_and_form_class(kwargs['model'], kwargs['form_class']);
    var obj = lookup_object(model, object_id, kwargs['slug'], kwargs['slug_field']);
    if (request.method == "POST") {
        var form = new form_class({'data': request.POST, 'files': request.FILES, 'instance': obj});
        return redirect(kwargs['post_save_redirect'], obj);
    } else {
        var form = new form_class({'instance':obj})
        if (!kwargs['template_name']) {
            kwargs['template_name'] = "%s/%s_form.html".subs(model._meta.app_label, model._meta.module_name);
        }
    }
    var t = template_loader.get_template(kwargs['template_name']);
    var c = new RequestContext(request, {
            form: form,
            template_object_name: obj,
            }, context_processors);
    apply_extra_context(kwargs['extra_context'], c);
    var response = new HttpResponse(t.render(c));
    //populate_xheaders(request, response, model, getattr(obj, obj._meta.pk.attname));
    return response;
}

function delete_object(request, object_id){
    var arg = new Arguments(arguments, {
        //object_id : null,
    	model: null,
    	post_delete_redirect: null,
        slug_field : 'slug',
        template_name : null,
        template_loader : loader,
        extra_context : null,
        login_required : null,
        context_processors : null,
        template_object_name : 'object'
    });

    var kwargs = arg.kwargs;
    if (!kwargs['extra_context'])
        kwargs['extra_context'] = {};

    var obj = lookup_object(kwargs['model'], object_id, kwargs['slug'], kwargs['slug_field']);

    if (request.method == 'POST') {
        obj.delete();
        return new HttpResponseRedirect(kwargs['post_delete_redirect']);
    } else {
        if (!kwargs['template_name']) {
            kwargs['template_name'] = "%s/%s_confirm_delete.html".subs(kwargs['model']._meta.app_label, kwargs['model']._meta.module_name);
        }
        var t = template_loader.get_template(kwargs['template_name']),
            c = new RequestContext(request, {
                        template_object_name: obj },
                        kwargs['context_processors']);
        apply_extra_context(kwargs['extra_context'], c);
        var response = new HttpResponse(t.render(c));
        //populate_xheaders(request, response, model, getattr(obj, obj._meta.pk.attname));
        return response;
    }
}

publish({
    create_object: create_object,
    update_object: update_object,
    get_model_and_form_class: get_model_and_form_class,
    delete_object: delete_object
});
