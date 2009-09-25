require('doff.template.loader');
require('doff.forms.models', 'ModelForm');

function get_model_and_form_class(model, form_class) {

    if (form_class)
        return [form_class._meta.model, form_class];
    if (model) {
//         var Meta = type('Meta', [object ],{
//                 
//                 model: model
//             });
        var class_name = model.__name__ + 'Form';

        var form_class = type(class_name, [ ModelForm ], {'Meta': {model: model}});
        return [ model, form_class ];
        
    }
    throw new Exception("Generic view must be called with either a model or"+
                            " form_class argument.");
}

// def get_model_and_form_class(model, form_class):
//     """
//     Returns a model and form class based on the model and form_class
//     parameters that were passed to the generic view.
// 
//     If ``form_class`` is given then its associated model will be returned along
//     with ``form_class`` itself.  Otherwise, if ``model`` is given, ``model``
//     itself will be returned along with a ``ModelForm`` class created from
//     ``model``.
//     """
//     if form_class:
//         return form_class._meta.model, form_class
//     if model:
//         # The inner Meta class fails if model = model is used for some reason.
//         tmp_model = model
//         # TODO: we should be able to construct a ModelForm without creating
//         # and passing in a temporary inner class.
//         class Meta:
//             model = tmp_model
//         class_name = model.__name__ + 'Form'
//         form_class = ModelFormMetaclass(class_name, (ModelForm,), {'Meta': Meta})
//         return model, form_class
//     raise GenericViewError("Generic view must be called with either a model or"
//                            " form_class argument.")

function update_object(request) {
    var args = new Arguments(arguments,{
        model:null,
        object_id:null,
        slug:null,
        slug_field:'slug',
        template_name:null,
        template_loader:loader,
        extra_context:null,
        post_save_redirect:null,
        login_required:False,
        context_processors:null,
        template_object_name:'object',
        form_class:null
    });

    if (!extra_context)
        extra_context = {};
        
    //if login_required and not request.user.is_authenticated():
    //    return redirect_to_login(request.path)

    var [model, form_class] = get_model_and_form_class(model, form_class);
    obj = lookup_object(model, object_id, slug, slug_field);

    

}

publish({
    update_object: update_object,
    get_model_and_form_class: get_model_and_form_class,
});



// def update_object(request, model=None, object_id=None, slug=None,
//         slug_field='slug', template_name=None, template_loader=loader,
//         extra_context=None, post_save_redirect=None, login_required=False,
//         context_processors=None, template_object_name='object',
//         form_class=None):
//     """
//     Generic object-update function.
// 
//     Templates: ``<app_label>/<model_name>_form.html``
//     Context:
//         form
//             the form for the object
//         object
//             the original object being edited
//     """
//     if extra_context is None: extra_context = {}
//     if login_required and not request.user.is_authenticated():
//         return redirect_to_login(request.path)
// 
//     model, form_class = get_model_and_form_class(model, form_class)
//     obj = lookup_object(model, object_id, slug, slug_field)
// 
//     if request.method == 'POST':
//         form = form_class(request.POST, request.FILES, instance=obj)
//         if form.is_valid():
//             obj = form.save()
//             if request.user.is_authenticated():
//                 request.user.message_set.create(message=ugettext("The %(verbose_name)s was updated successfully.") % {"verbose_name": model._meta.verbose_name})
//             return redirect(post_save_redirect, obj)
//     else:
//         form = form_class(instance=obj)
// 
//     if not template_name:
//         template_name = "%s/%s_form.html" % (model._meta.app_label, model._meta.object_name.lower())
//     t = template_loader.get_template(template_name)
//     c = RequestContext(request, {
//         'form': form,
//         template_object_name: obj,
//     }, context_processors)
//     apply_extra_context(extra_context, c)
//     response = HttpResponse(t.render(c))
//     populate_xheaders(request, response, model, getattr(obj, obj._meta.pk.attname))
//     return response
