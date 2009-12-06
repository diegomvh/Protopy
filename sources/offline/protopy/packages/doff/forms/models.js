/* 'Helper functions for creating Form classes from Django models and database field objects.' */

require('doff.utils.datastructures', 'SortedDict');
require('doff.forms.util', 'ValidationError', 'ErrorList');
require('doff.forms.forms', 'BaseForm', 'get_declared_fields');
require('doff.forms.fields', 'Field', 'ChoiceField', 'IntegerField', 'EMPTY_VALUES');
require('doff.forms.widgets', 'Select', 'SelectMultiple', 'HiddenInput', 'MultipleHiddenInput', 'media_property');
require('doff.forms.formsets', 'BaseFormSet', 'formset_factory', 'DELETION_FIELD_NAME');

/*
 * Saves bound Form ``form``'s cleaned_data into model instance ``instance``.
 * If commit=True, then the changes to ``instance`` will be saved to the database. Returns ``instance``.
 */
function save_instance(form, instance) { 
    var arg = new Arguments(arguments, {'fields':null, 'fail_message':'saved', 'commit':true, 'exclude':null});
    var kwargs = arg.kwargs;
    var models = require('doff.db.models.base');
    var opts = instance._meta;
    if (bool(form.errors))
        throw new ValueError("The %s could not be %s because the data didn't validate.".subs(opts.object_name, kwargs['fail_message']));
    var cleaned_data = form.cleaned_data;
    var file_field_list = [];
    for each (var f in opts.fields) {
        if (!f.editable || isinstance(f, models.AutoField) || !(f.name in cleaned_data))
            continue;
        if (kwargs['fields'] && !include(kwargs['fields'], f.name))
            continue;
        if (kwargs['exclude'] && inlcude(kwargs['exclude'], f.name))
            continue;
        // Defer saving file-type fields until after the other fields, so a
        // callable upload_to can use the values from other fields.
        if (isinstance(f, models.FileField))
            file_field_list.push(f);
        else
            f.save_form_data(instance, cleaned_data[f.name]);
    }
    for each (var f in file_field_list)
        f.save_form_data(instance, cleaned_data[f.name]);

    // Wrap up the saving of m2m data as a function.
    function save_m2m() {
        opts = instance._meta;
        cleaned_data = form.cleaned_data;
        for each (var f in opts.many_to_many) {
            if (kwargs['fields'] && !include(kwargs['fields'], f.name))
                continue;
            if (include(cleaned_data, f.name))
                f.save_form_data(instance, cleaned_data[f.name]);
        }
    }
    if (kwargs['commit']) {
        // If we are committing, save the instance and the m2m data immediately.
        instance.save();
        save_m2m();
    } else {
        // We're not committing. Add a method to the form to allow deferred
        // saving of m2m data.
        form.save_m2m = save_m2m;
    }
    return instance;
}

//Returns the save() method for a Form.
function make_model_save(model, fields, fail_message) {
    function save(commit) {
        commit = commit || true;
        return save_instance(this, new model(), {'fields':fields, 'fail_message':fail_message, 'commit':commit});
    }
    return save;
}

//Returns the save() method for a Form.
function make_instance_save(instance, fields, fail_message) {
    function save(commit) {
        commit = commit || true;
        return save_instance(this, instance, {'fields':fields, 'fail_message':fail_message, 'commit':commit});
    }
    return save;
}

//Returns a Form class for the given list of Django database field instances.
function form_for_fields(field_list) {
    var fields = new SortedDict([[f.name, f.formfield()] for each (f in field_list) if (f.editable)]);
    return type('FormForFields', BaseForm, { 'base_fields': fields});
}


// ModelForms //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/*
 * Returns a dict containing the data in ``instance`` suitable for passing as a Form's ``initial`` keyword argument.
    ``fields`` is an optional list of field names. If provided, only the named
    fields will be included in the returned dict.
    ``exclude`` is an optional list of field names. If provided, the named
    fields will be excluded from the returned dict, even if they are listed in the ``fields`` argument.
 */
function model_to_dict(instance, fields, exclude) {
    // avoid a circular import
    require('doff.db.models.fields.related', 'ManyToManyField', 'OneToOneField');
    var opts = instance._meta;
    var data = {};
    for each (var f in opts.fields.concat(opts.many_to_many)) {
        if (!f.editable)
            continue;
        if (bool(fields) && !include(fields, f.name))
            continue;
        if (bool(exclude) && include(exclude, f.name))
            continue;
        if (isinstance(f, ManyToManyField)) {
            // If the object doesn't have a primry key yet, just use an empty
            // list for its m2m fields. Calling f.value_from_object will raise
            // an exception.
            if (!instance.pk)
                data[f.name] = [];
            else
                // MultipleChoiceWidget needs a list of pks, not object instances.
                data[f.name] = [obj.pk for each (obj in f.value_from_object(instance))];
        } else {
            data[f.name] = f.value_from_object(instance);
        }
    }
    return data;
}

/* 
    Returns a ``SortedDict`` containing form fields for the given model.
    ``fields`` is an optional list of field names. If provided, only the named
    fields will be included in the returned fields.
    ``exclude`` is an optional list of field names. If provided, the named
    fields will be excluded from the returned fields, even if they are listed
    in the ``fields`` argument.
 */
function fields_for_model(model, fields, exclude, formfield_callback) {
    // TODO: if fields is provided, it would be nice to return fields in that order
    formfield_callback = formfield_callback || function(f) { return f.formfield(); };
    var field_list = [];
    var opts = model._meta;
    for each (var f in opts.fields.concat(opts.many_to_many)) {
        if (!f.editable)
            continue;
        if (bool(fields) && !include(fields, f.name))
            continue;
        if (bool(exclude) && include(exclude, f.name))
            continue;
        var formfield = formfield_callback(f);
        if (formfield)
            field_list.push([f.name, formfield]);
    }
    return new SortedDict(field_list);
}

var ModelFormOptions = type('ModelFormOptions', object, {
    __init__: function(options) {
        this.model = getattr(options, 'model', null);
        this.fields = getattr(options, 'fields', null);
        this.exclude = getattr(options, 'exclude', null);
    }
});

var BaseModelForm = type('BaseModelForm', BaseForm, {
    __init__: function() {
        var arg = new Arguments(arguments, {'data':null, 'files':null, 'auto_id':'id_%s', 'prefix':null, 'initial':null, 'error_class':ErrorList, 'label_suffix':':', 'empty_permitted':false, 'instance':null});
        var kwargs = arg.kwargs;
        var opts = this._meta;
        if (!kwargs['instance']) {
            // if we didn't get an instance, instantiate a new one
            this.instance = new opts.model();
            var object_data = {};
        } else {
            this.instance = kwargs['instance'];
            var object_data = model_to_dict(kwargs['instance'], opts.fields, opts.exclude);
        }
        // if initial was provided, it should override the values from instance
        if (kwargs['initial'])
            extend(object_data, initial);
        super(BaseForm, this).__init__({'data':kwargs['data'], 'files':kwargs['files'], 'auto_id':kwargs['auto_id'], 'prefix':kwargs['prefix'], 'initial':object_data, 'error_class':kwargs['error_class'], 'label_suffix':kwargs['label_suffix'], 'empty_permitted':kwargs['empty_permitted']});
    },

    clean: function() {
        this.validate_unique();
        return this.cleaned_data;
    },

    validate_unique: function() {
        require('doff.db.models.fields.base', 'FieldDoesNotExist');
        
        // Gather a list of checks to perform. We only perform unique checks 
        // for fields present and not None in cleaned_data.  Since this is a 
        // ModelForm, some fields may have been excluded; we can't perform a unique 
        // check on a form that is missing fields involved in that check.  It also does
        // not make sense to check data that didn't validate, and since NULL does not 
        // equal NULL in SQL we should not do any unique checking for NULL values.
        var unique_checks = [];
        for each (var check in this.instance._meta.unique_together) {
            var fields_on_form = [field for each (field in check) if (this.cleaned_data[field])];
            if (len(fields_on_form) == len(check))
                unique_checks.push(check)
        }
        var form_errors = [];

        // Gather a list of checks for fields declared as unique and add them to
        // the list of checks. Again, skip empty fields and any that did not validate.
        for each (var [name, field] in items(this.fields)) {
            try {
                var f = this.instance._meta.get_field_by_name(name)[0];
            } catch (e if e instanceof FieldDoesNotExist) {
                // This is an extra field that's not on the ModelForm, ignore it
                continue;
            }
            if (f.unique && this.cleaned_data[name])
                unique_checks.push([name]);
        }
        var bad_fields = new Set();
        for each (unique_check in unique_checks) {
            // Try to look up an existing object with the same values as this
            // object's values for all the unique field.

            var lookup_kwargs = {}
            for each (var field_name in unique_check)
                lookup_kwargs[field_name] = this.cleaned_data[field_name];

            var qs = this.instance.__class__._default_manager.filter(lookup_kwargs);

            // Exclude the current object from the query if we are editing an
            // instance (as opposed to creating a new one)
            if (this.instance.pk != null || this.instance.pk != undefined)
                qs = qs.exclude({'pk':this.instance.pk});

            // This cute trick with extra/values is the most efficient way to
            // tell if a particular query returns any results.
            if (qs.extra({'select':{'a': 1}}).values('a').order_by()) {
                model_name = this.instance._meta.verbose_name.capitalize();

                // A unique field
                if (len(unique_check) == 1) {
                    var field_name = unique_check[0];
                    var field_label = this.fields[field_name].label;
                    // Insert the error into the error dict, very sneaky
                    this._errors[field_name] = new ErrorList(["%(model_name)s with this %(field_label)s already exists.".subs({'model_name': model_name, 'field_label': field_label})]);
                // unique_together
                } else {
                    var field_labels = [this.fields[field_name].label for each (field_name in unique_check)];
                    field_labels = get_text_list(field_labels, 'and');
                    form_errors.push("%(model_name)s with this %(field_label)s already exists.".subs({'model_name': model_name, 'field_label': field_labels}));
                }
                // Mark these fields as needing to be removed from cleaned data
                // later.
                for each (var field_name in unique_check)
                    bad_fields.add(field_name);
            }
        }
        for each (var field_name in bad_fields)
            delete this.cleaned_data[field_name];
        if (bool(form_errors))
            // Raise the unique together errors since they are considered
            // form-wide.
            throw new ValidationError(form_errors);
    },
    
    /*
     * Saves this ``form``'s cleaned_data into model instance ``self.instance``.
     * If commit=True, then the changes to ``instance`` will be saved to the
     * database. Returns ``instance``.
     */
    save: function(commit) {
        commit = isundefined(commit)? true : commit;
        var fail_message = (!this.instance.pk)? 'created' :'changed';
        return save_instance(this, this.instance, {'fields': this._meta.fields, 'fail_message': fail_message, 'commit': commit});
    }
});

var ModelForm = type('ModelForm', BaseModelForm, {
    //Static
    __new__: function(name, bases, attrs) {
        var formfield_callback = attrs['formfield_callback'] || function(f) { return f.formfield(); };
        try {
            var parents = [b for each (b in bases) if (issubclass(b, ModelForm))];
        } catch (e) {
            // We are defining ModelForm itself.
            var parents = null;
        }
        var declared_fields = get_declared_fields(bases, attrs, false);
        var new_class = super(ModelForm, this).__new__(name, bases, attrs);
        if (!bool(parents))
            return new_class;

        if (!('media' in attrs))
            new_class.prototype.__defineGetter__('media', media_property(new_class));
        var opts = new_class.prototype._meta = new ModelFormOptions(getattr(new_class.prototype, 'Meta', null));
        if (opts.model) {
            // If a model is defined, extract form fields from it.
            var fields = fields_for_model(opts.model, opts.fields, opts.exclude, formfield_callback);
            // Override default model fields with any custom declared ones
            // (plus, include all the other declared fields).
            fields.update(declared_fields);
        } else {
            var fields = declared_fields;
        }
        new_class.prototype.declared_fields = declared_fields;
        new_class.prototype.base_fields = fields;
        return new_class;
    }
}, {});

function modelform_factory(model) {
    // Create the inner Meta class. FIXME: ideally, we should be able to
    // construct a ModelForm without creating and passing in a temporary
    // inner class.

    var arg = new Arguments(arguments, {form: ModelForm, fields: null, exclude: null,
            formfield_callback: function(f) { return f.formfield(); }});
    var kwargs = arg.kwargs;
    // Build up a list of attributes that the Meta object will have.
    var attrs = {'model': model};
    if (kwargs['fields'] != null)
        attrs['fields'] = kwargs['fields'];
    if (kwargs['exclude'] != null)
        attrs['exclude'] = kwargs['exclude'];

    // If parent form class already has an inner Meta, the Meta we're
    // creating needs to inherit from the parent's inner meta.
    var Meta = extend(kwargs['form'].Meta || {}, attrs);

    // Give this new form class a reasonable name.
    var class_name = model.__name__ + 'Form';

    // Class attributes for the new form class.
    var form_class_attrs = {
        'Meta': Meta,
        'formfield_callback': kwargs['formfield_callback']
    }

    return type(class_name, [ kwargs['form'] ], form_class_attrs);
}

// ModelFormSets ##############################################################

var BaseModelFormSet = type('BaseModelFormSet' , [ BaseFormSet ], {
    /*
    A ``FormSet`` for editing a queryset and/or adding new objects to it.
    */
    model: null,

    __init__: function() {
        var arg = new Arguments(arguments, {'data':null, 'files':null, 'auto_id':'id_%s', 'prefix':null,
                        'queryset':null});
        var kwargs = arg.kwargs;
        this.queryset = kwargs['queryset'];
        var defaults = {'data': kwargs['data'], 'files': kwargs['files'], 'auto_id': kwargs['auto_id'], 'prefix': kwargs['prefix']};
        extend(defaults, kwargs);
        super(BaseFormSet, this).__init__(defaults);
    },

    initial_form_count: function() {
        /*Returns the number of forms that are required in this FormSet.*/
        if (!(bool(this.data) || bool(this.files)))
            return len(this.get_queryset());
        return super(BaseFormSet, this).initial_form_count();
    },

    _existing_object: function(pk) {
        if (!hasattr(this, '_object_dict'))
            this._object_dict = new Dict([[o.pk, o] for (o in this.get_queryset())]);
        return this._object_dict.get(pk);
    },

    _construct_form: function(i) {
        var arg = new Arguments(arguments);
        var kwargs = arg.kwargs;
        if (this.is_bound && i < this.initial_form_count()) {
            var pk_key = "%s-%s".subs(this.add_prefix(i), this.model._meta.pk.name);
            var pk = this.data[pk_key];
            var pk_field = this.model._meta.pk;
            pk = pk_field.get_db_prep_lookup('exact', pk);
            if (isinstance(pk, Array))
                pk = pk[0];
            kwargs['instance'] = this._existing_object(pk);
        }
        if (i < this.initial_form_count() && !kwargs['instance'])
            kwargs['instance'] = this.get_queryset().get(i);
        return super(BaseFormSet, this)._construct_form( i, kwargs);
    },

    get_queryset: function() {
        if (!hasattr(this, '_queryset')) {
            if (this.queryset != null)
                var qs = this.queryset;
            else
                var qs = this.model._default_manager.get_query_set();

            // If the queryset isn't already ordered we need to add an
            // artificial ordering here to make sure that all formsets
            // constructed from this queryset have the same form order.
            if (!qs.ordered)
                qs = qs.order_by(this.model._meta.pk.name);

            if (this.max_num > 0)
                this._queryset = qs.slice(0, this.max_num);
            else
                this._queryset = qs;
        }
        return this._queryset;
    },

    save_new: function(form, commit) {
        /*Saves and returns a new model instance for the given form.*/
        commit = isundefined(commit)? true : commit;
        return form.save(commit);
    },

    save_existing: function(form, instance, commit) {
        /*Saves and returns an existing model instance for the given form.*/
        commit = isundefined(commit)? true : commit;
        return form.save(commit);
    },

    save: function(commit) {
        /*Saves model instances for every form, adding and changing instances
        as necessary, and returns the list of instances.
        */
        commit = isundefined(commit)? true : commit;
        if (!commit) {
            this.saved_forms = [];
            function save_m2m() {
                for each (var form in this.saved_forms)
                    form.save_m2m();
            }
            this.save_m2m = save_m2m;
        }
        return this.save_existing_objects(commit).concat(this.save_new_objects(commit));
    },

    clean: function() {
        this.validate_unique();
    },

    validate_unique: function() {
        // Iterate over the forms so that we can find one with potentially valid
        // data from which to extract the error checks
        if (!bool(this.forms)) return;
        var form = null;
        for each (form in this.forms)
            if (hasattr(form, 'cleaned_data'))
                break;
        var [ unique_checks, date_checks ] = form._get_unique_checks(); //TODO: el form for model
        var errors = [];
        // Do each of the unique checks (unique and unique_together)
        for each (var unique_check in unique_checks) {
            var seen_data = new Set();
            for each (form in this.forms) {
                // if the form doesn't have cleaned_data then we ignore it,
                // it's already invalid
                if (!hasattr(form, "cleaned_data"))
                    continue;
                // get each of the fields for which we have data on this form
                if (bool([f for each (f in unique_check) if (f in form.cleaned_data && form.cleaned_data[f] != null)])) {
                    // get the data itself
                    var row_data = [form.cleaned_data[field] for each (field in unique_check)];
                    // if we've aready seen it then we have a uniqueness failure
                    if (include(seen_data, row_data)) {
                        // poke error messages into the right places and mark the form as invalid
                        errors.push(this.get_unique_error_message(unique_check));
                        form._errors[NON_FIELD_ERRORS] = this.get_form_error();
                        delete form.cleaned_data;
                        break;
                    }
                    // mark the data as seen
                    seen_data.add(row_data);
                }
            }
        }
        // iterate over each of the date checks now
        for each (var date_check in date_checks) {
            var seen_data = new Set();
            var [lookup, field, unique_for] = date_check;
            for each (var form in this.forms) {
                // if the form doesn't have cleaned_data then we ignore it,
                // it's already invalid
                if (!hasattr(this, 'cleaned_data'))
                    continue;
                // see if we have data for both fields
                if (form.cleaned_data && form.cleaned_data[field] != null &&
                    form.cleaned_data[unique_for] != null) {
                    // if it's a date lookup we need to get the data for all the fields
                    if (lookup == 'date') {
                        var date = form.cleaned_data[unique_for];
                        var date_data = [ date.year, date.month, date.day ];
                    // otherwise it's just the attribute on the date/datetime
                    // object
                    } else {
                        date_data = [getattr(form.cleaned_data[unique_for], lookup), ];
                    }
                    var data = [ form.cleaned_data[field], ].concat(date_data);
                    // if we've aready seen it then we have a uniqueness failure
                    if (include(seen_data, data)) {
                        // poke error messages into the right places and mark the form as invalid
                        errors.push(this.get_date_error_message(date_check));
                        form._errors[NON_FIELD_ERRORS] = this.get_form_error();
                        delete form.cleaned_data;
                        break;
                    }
                    seen_data.add(data);
                }
            }
        }
        if (bool(errors))
            throw new ValidationError(errors);
    },

    get_unique_error_message: function(unique_check) {
        if (len(unique_check) == 1) {
            return "Please correct the duplicate data for %(field)s.".subs({"field": unique_check[0]});
        } else {
            return "Please correct the duplicate data for %(field)s, which must be unique.".subs({ "field": unique_check.join(" and ") });
        }
    },

    get_date_error_message: function(date_check) {
        return "Please correct the duplicate data for %(field_name)s " +
            "which must be unique for the %(lookup)s in %(date_field)s.".subs({
            'field_name': date_check[1],
            'date_field': date_check[2],
            'lookup': date_check[0],});
    },

    get_form_error: function() {
        return "Please correct the duplicate values below.";
    },

    save_existing_objects: function(commit) {
        commit = isundefined(commit)? true : commit;
        this.changed_objects = [];
        this.deleted_objects = [];
        if (!bool(this.get_queryset()))
            return [];

        var saved_instances = [];
        for each (var form in this.initial_forms) {
            var pk_name = this._pk_field.name;
            var raw_pk_value = this._raw_value(pk_name);

            // clean() for different types of PK fields can sometimes return
            // the model instance, and sometimes the PK. Handle either.
            var pk_value = form.fields[pk_name].clean(raw_pk_value);
            pk_value = getattr(pk_value, 'pk', pk_value);

            var obj = this._existing_object(pk_value);
            if (this.can_delete) {
                var raw_delete_value = form._raw_value(DELETION_FIELD_NAME);
                var should_delete = form.fields[DELETION_FIELD_NAME].clean(raw_delete_value);
                if (should_delete) {
                    this.deleted_objects.push(obj);
                    obj.delete();
                    continue;
                }
            }
            if (form.has_changed()) {
                this.changed_objects.push([ obj, form.changed_data ]);
                saved_instances.push(this.save_existing(form, obj, commit));
                if (!commit)
                    this.saved_forms.push(form);
            }
        }
        return saved_instances;
    },

    save_new_objects: function(commit) {
        commit = isundefined(commit)? true : commit;
        this.new_objects = [];
        for each (var form in this.extra_forms) {
            if (!form.has_changed())
                continue;
            // If someone has marked an add form for deletion, don't save the object.
            if (this.can_delete) {
                var raw_delete_value = form._raw_value(DELETION_FIELD_NAME);
                var should_delete = form.fields[DELETION_FIELD_NAME].clean(raw_delete_value);
                if (should_delete)
                    continue;
            }
            this.new_objects.push(this.save_new(form, commit));
            if (!commit)
                this.saved_forms.push(form);
        }
        return this.new_objects;
    },

    add_fields: function(form, index) {
        /*Add a hidden field for the object's primary key.*/
        require('doff.db.models.base', 'AutoField', 'OneToOneField', 'ForeignKey');
        this._pk_field = pk = this.model._meta.pk;
        // If a pk isn't editable, then it won't be on the form, so we need to
        // add it here so we can tell which object is which when we get the
        // data back. Generally, pk.editable should be false, but for some
        // reason, auto_created pk fields and AutoField's editable attribute is
        // True, so check for that as well.
        function pk_is_not_editable(pk) {
            return ((!pk.editable) || (pk.auto_created || isinstance(pk, AutoField))
                || (pk.rel && pk.rel.parent_link && pk_is_not_editable(pk.rel.to._meta.pk)));
        }
        if (pk_is_not_editable(pk) || !(pk.name in form.fields.keys())) {
            if (form.is_bound) {
                var pk_value = form.instance.pk;
            } else {
                try {
                    var pk_value = this.get_queryset().get(index).pk;
                } catch(e) {
                    var pk_value = null;
                }
            }
            if (isinstance(pk, OneToOneField) || isinstance(pk, ForeignKey))
                var qs = pk.rel.to._default_manager.get_query_set();
            else
                var qs = this.model._default_manager.get_query_set();
            form.fields[this._pk_field.name] = new ModelChoiceField({ queryset: qs, initial: pk_value, required:false, widget:HiddenInput});
        }
        super(BaseFormSet, this).add_fields(form, index);
    }
});

function modelformset_factory(model) {
    /*
    Returns a FormSet class for the given Django model class.
    */
    var arg = new Arguments(arguments, {form: ModelForm, fields: null, exclude: null,
            formfield_callback: function(f) { return f.formfield(); }, max_num: 0,
            formset: BaseModelFormSet, extra: 1, can_delete: false, can_order: false,});

    var form = modelform_factory(model, arg.kwargs);
    var FormSet = formset_factory(form, arg.kwargs);
    FormSet.prototype.model = model;
    return FormSet;
}

// InlineFormSets //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var BaseInlineFormSet = type('BaseInlineFormSet', [ BaseModelFormSet ], {
    get_default_prefix: function() {
        //FIXME: tiene pinta de que no puede ser de clase porque no estan esos atributos en la clase
        require('doff.db.models.fields.related', 'RelatedObject');
        return new RelatedObject(this.fk.rel.to, this.model, this.fk).get_accessor_name();
    }
},{
    /*A formset for child objects related to a parent.*/
    __init__: function() {
        var arg = new Arguments(arguments, {
                data:null, files:null, 
                instance:null, prefix:null,
                save_as_new:false });
        var kwargs = arg.kwargs;
        require('doff.db.models.fields.related', 'RelatedObject');
        if (kwargs['instance'] == null)
            this.instance = new this.model();
        else
            this.instance = kwargs['instance'];
        this.save_as_new = kwargs['save_as_new'];
        // is there a better way to get the object descriptor?
        this.rel_name = new RelatedObject(this.fk.rel.to, this.model, this.fk).get_accessor_name();
        if (this.fk.rel.field_name == this.fk.rel.to._meta.pk.name)
            var backlink_value = this.instance;
        else
            var backlink_value = getattr(this.instance, this.fk.rel.field_name);
        var f = {};
        f[this.fk.name] = backlink_value;
        kwargs['queryset'] = this.model._default_manager.filter(f);
        super(BaseModelFormSet, this).__init__(kwargs);
    },

    initial_form_count: function() {
        if (this.save_as_new)
            return 0;
        return super(BaseModelFormSet, this).initial_form_count();
    },

    total_form_count: function() {
        if (this.save_as_new)
            return super(BaseModelFormSet, this).initial_form_count();
        return super(BaseModelFormSet, this).total_form_count();
    },

    _construct_form: function(i) {
        var arg = new Arguments(arguments);
        var kwargs = arg.kwargs;
        var form = super(BaseModelFormSet, this)._construct_form(i, kwargs);
        if (this.save_as_new) {
            // Remove the primary key from the form's data, we are only
            // creating new instances
            form.data[form.add_prefix(this._pk_field.name)] = null;

            // Remove the foreign key from the form's data
            form.data[form.add_prefix(this.fk.name)] = null;
        }
        return form;
    },

    save_new: function(form, commit) {
        // Use commit=False so we can assign the parent key afterwards, then
        // save the object.
        commit = isundefined(commit)? true : commit;
        var obj = form.save(false);
        var pk_value = getattr(this.instance, this.fk.rel.field_name);
        setattr(obj, this.fk.get_attname(), getattr(pk_value, 'pk', pk_value));
        if (commit)
            obj.save();
        // form.save_m2m() can be called via the formset later on if commit=False
        if (commit && hasattr(form, 'save_m2m'))
            form.save_m2m();
        return obj;
    },

    add_fields: function(form, index) {
        super(BaseModelFormSet, this).add_fields(form, index);
        if (this._pk_field == this.fk) {
            form.fields[this._pk_field.name] = new InlineForeignKeyField(this.instance, { pk_field: true });
        } else {
            // The foreign key field might not be on the form, so we poke at the
            // Model field to get the label, since we need that for error messages.
            var kwargs = { 'label': getattr(form.fields.get(this.fk.name), 'label', this.fk.verbose_name)};
            if (this.fk.rel.field_name != this.fk.rel.to._meta.pk.name)
                kwargs['to_field'] = this.fk.rel.field_name;
            form.fields[this.fk.name] = new InlineForeignKeyField(this.instance, kwargs);
        }
    },

    get_unique_error_message: function(unique_check) {
        unique_check = [field for each (field in unique_check) if (field != this.fk.name)];
        return super(BaseModelFormSet, this).get_unique_error_message(unique_check);
    }
});

function _get_foreign_key(parent_model, model, fk_name, can_fail) {
    /*
    Finds and returns the ForeignKey from model to parent if there is one
    (returns None if can_fail is True and no such field exists). If fk_name is
    provided, assume it is the name of the ForeignKey field. Unles can_fail is
    True, an exception is raised if there is no ForeignKey from model to
    parent_model.
    */
    // avoid circular import
    require('doff.db.models.base', 'ForeignKey');
    fk_name = fk_name || null;
    can_fail = can_fail || false;
    var opts = model._meta;
    if (fk_name) {
        var fks_to_parent = [f for each (f in opts.fields) if (f.name == fk_name)];
        if (len(fks_to_parent) == 1) {
            var fk = fks_to_parent[0];
            if (!isinstance(fk, ForeignKey) || (fk.rel.to != parent_model &&
                     !include(parent_model._meta.get_parent_list(), fk.rel.to)))
                throw new Exception("fk_name '%s' is not a ForeignKey to %s".subs(fk_name, parent_model));
        } else if (len(fks_to_parent) == 0)
            throw new Exception("%s has no field named '%s'".subs(model, fk_name));
    } else {
        // Try to discover what the ForeignKey from model to parent_model is
        var fks_to_parent = [
            f for each (f in opts.fields)
            if (isinstance(f, ForeignKey)
            && (f.rel.to == parent_model || include(parent_model._meta.get_parent_list(), f.rel.to)))
        ]
        if (len(fks_to_parent) == 1) {
            var fk = fks_to_parent[0];
        } else if (len(fks_to_parent) == 0) {
            if (can_fail)
                return;
            throw new Exception("%s has no ForeignKey to %s".subs(model, parent_model));
        } else {
            throw new Exception("%s has more than 1 ForeignKey to %s".subs(model, parent_model));
        }
    }
    return fk;
}

function inlineformset_factory(parent_model, model) {
    /*
    Returns an ``InlineFormSet`` for the given kwargs.

    You must provide ``fk_name`` if ``model`` has more than one ``ForeignKey``
    to ``parent_model``.
    */
    var arg = new Arguments(arguments, {form: ModelForm, fields: null, exclude: null, fk_name: null,
            formfield_callback: function(f) { return f.formfield(); }, max_num: 0,
            formset: BaseInlineFormSet, extra: 3, can_delete: true, can_order: false,});
    var kwargs = arg.kwargs;
    var fk = _get_foreign_key(parent_model, model, kwargs['fk_name']);
    // enforce a max_num=1 when the foreign key to the parent model is unique.
    if (fk.unique)
        max_num = 1;
    var kwargs = {
        'form': kwargs['form'],
        'formfield_callback': kwargs['formfield_callback'],
        'formset': kwargs['formset'],
        'extra': kwargs['extra'],
        'can_delete': kwargs['can_delete'],
        'can_order': kwargs['can_order'],
        'fields': kwargs['fields'],
        'exclude': kwargs['exclude'],
        'max_num': kwargs['max_num'],
    }
    var FormSet = modelformset_factory(model, kwargs);
    FormSet.prototype.fk = fk;
    return FormSet;
}

// Fields //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var InlineForeignKeyHiddenInput = type('InlineForeignKeyHiddenInput', HiddenInput, {
    _has_changed: function(initial, data) {
        return false;
    }
});

/* 
 * A basic integer field that deals with validating the given value to a given parent instance in an inline.
 */
var InlineForeignKeyField = type('InlineForeignKeyField', Field, {
    default_error_messages: {
        'invalid_choice': 'The inline foreign key did not match the parent instance primary key.' 
    },

    __init__: function(parent_instance) {
        var arg = new Arguments(arguments);
        this.parent_instance = parent_instance;
        this.pk_field = arg.kwargs['pk_field'] || false;
        delete arg.kwargs['pk_field'];
        if (this.parent_instance)
            arg.kwargs['initial'] = this.parent_instance.pk;
        arg.kwargs['required'] = false;
        arg.kwargs['widget'] = InlineForeignKeyHiddenInput;
        super(Field, this).__init__(arg);
    },

    clean: function(value) {
        if (include(EMPTY_VALUES, value)) {
            if (this.pk_field)
                return null;
            // if there is no value act as we did before.
            return this.parent_instance;
        }
        // ensure the we compare the values as equal types.
        if (value != this.parent_instance.pk)
            throw new ValidationError(this.error_messages['invalid_choice']);
        if (this.pk_field)
            return this.parent_instance.pk;
        return this.parent_instance;
    }
});

var ModelChoiceIterator = type('ModelChoiceIterator', [ object ], {
    __init__: function(field) {
        this.field = field;
        this.queryset = field.queryset;
    },

    __iter__: function() {
        if (this.field.empty_label)
            yield ["", this.field.empty_label];
        if (this.field.cache_choices) {
            if (!this.field.choice_cache)
                this.field.choice_cache = [ this.choice(obj) for (obj in this.queryset.all()) ];
            for each (var choice in this.field.choice_cache)
                yield choice;
        } else {
            for each (var obj in this.queryset.all())
                yield this.choice(obj);
        }
    },

    choice: function(obj) {
        if (this.field.to_field_name)
            var key = obj.serializable_value(this.field.to_field_name);
        else
            var key = obj.pk;
        return [ key, this.field.label_from_instance(obj)];
    }
});

// A ChoiceField whose choices are a model QuerySet.
var ModelChoiceField = type('ModelChoiceField', ChoiceField, {
    // This class is a subclass of ChoiceField for purity, but it doesn't
    // actually use any of ChoiceField's implementation.
    default_error_messages: { 
        'invalid_choice': 'Select a valid choice. That choice is not one of the available choices.' 
    },

    __init__: function() {
        var arg = new Arguments(arguments, {	
            'queryset': null, 'empty_label': "---------", 'cache_choices': false, 'required': true,
            'widget': null, 'label': null, 'initial': null, 'help_text': null, 'to_field_name': null 
        });
        var kwargs = arg.kwargs;
        assert(kwargs['queryset'] != null, 'Falta queryset');
        this.empty_label = kwargs['empty_label'];
        this.cache_choices = kwargs['cache_choices'];

        // Call Field instead of ChoiceField __init__() because we don't need
        // ChoiceField.__init__().
        super(Field, this).__init__(arg);
        this.queryset = kwargs['queryset'];
        this.choice_cache = null;
        this.to_field_name = kwargs['to_field_name'];
    },

    get queryset() {
        return this._queryset;
    },

    set queryset(queryset) {
        this._queryset = queryset;
        this.widget.choices = this.choices;
    },

    // this method will be used to create object labels by the QuerySetIterator.
    // Override it to customize the label.
    label_from_instance: function(obj) {
        return obj;
    },

    get choices() {
        // If self._choices is set, then somebody must have manually set
        // the property self.choices. In this case, just return self._choices.
        if (hasattr(this, '_choices'))
            return this._choices;

        // Otherwise, execute the QuerySet in self.queryset to determine the
        // choices dynamically. Return a fresh QuerySetIterator that has not been
        // consumed. Note that we're instantiating a new QuerySetIterator *each*
        // time _get_choices() is called (and, thus, each time self.choices is
        // accessed) so that we can ensure the QuerySet has not been consumed. This
        // construct might look complicated but it allows for lazy evaluation of
        // the queryset.
        return new ModelChoiceIterator(this);
    },

    set choices(value) {
        this._choices = this.widget.choices = array(value);
    },

    clean: function(value) {
        super(Field, this).clean(value);
        if (include(EMPTY_VALUES, value))
            return null;
        try {
        	var data = {};
            var key = this.to_field_name || 'pk';
            data[key] = value;
            var value = this.queryset.get(data);
        } catch (e if isinstance(e, this.queryset.model.DoesNotExist)) {
            throw new ValidationError(this.error_messages['invalid_choice']);
        }
	return value;
    }
});

//A MultipleChoiceField whose choices are a model QuerySet.
var ModelMultipleChoiceField = type('ModelMultipleChoiceField', ModelChoiceField, {
    widget: SelectMultiple,
    hidden_widget: MultipleHiddenInput,
    default_error_messages: {
        'list': 'Enter a list of values.',
        'invalid_choice': 'Select a valid choice. %s is not one of the available choices.' 
    },

    __init__: function() {
        var arg = new Arguments(arguments, {'queryset': null, 'cache_choices': false, 'required': true, 'widget': null, 'label': null, 'initial': null, 'help_text': null });
        var kwargs = arg.kwargs;
        assert(kwargs['queryset'] != null, 'Falta queryset');
        super(ModelChoiceField, this).__init__(arg);
    },

    clean: function(value) {
        if (this.required && !value)
            throw new ValidationError(this.error_messages['required']);
        else if (!this.required && !value)
            return [];
        if (!isinstance(value, Array))
            throw new ValidationError(this.error_messages['list']);
        var final_values = [];
        for each (var val in value) {
            try {
                var obj = this.queryset.get({'pk': val});
                final_values.push(obj);
            } catch (e if isinstance(e, this.queryset.model.DoesNotExist)) {
                throw new ValidationError(this.error_messages['invalid_choice'].subs(val));
            }
        }
        return final_values;
    }
});

publish({   
    ModelForm: ModelForm,
    BaseModelForm: BaseModelForm,
    model_to_dict: model_to_dict,
    fields_for_model: fields_for_model,
    save_instance: save_instance,
    inlineformset_factory: inlineformset_factory,
    form_for_fields: form_for_fields,
    ModelChoiceField: ModelChoiceField,
    ModelMultipleChoiceField: ModelMultipleChoiceField 
});