$D('Helper functions for creating Form classes from Django models and database field objects.');

$L('doff.utils.datastructures', 'SortedDict');
$L('doff.forms.util', 'ValidationError', 'ErrorList');
$L('doff.forms.forms', 'BaseForm', 'get_declared_fields');
$L('doff.forms.fields', 'Field', 'ChoiceField', 'IntegerField', 'EMPTY_VALUES');
$L('doff.forms.widgets', 'Select', 'SelectMultiple', 'HiddenInput', 'MultipleHiddenInput');
$L('doff.forms.widgets', 'media_property');


/*
from django.utils.encoding import smart_unicode, force_unicode

from django.utils.text import get_text_list, capfirst

from formsets import BaseFormSet, formset_factory, DELETION_FIELD_NAME
*/
/*
 * Saves bound Form ``form``'s cleaned_data into model instance ``instance``.
 * If commit=True, then the changes to ``instance`` will be saved to the database. Returns ``instance``.
 */
function save_instance(form, instance) { 
    arguments = new Arguments(arguments, {'fields':null, 'fail_message':'saved', 'commit':true, 'exclude':null});
    $L('doff.db.models');
    var opts = instance._meta;
    if (bool(form.errors))
        throw new ValueError("The %s could not be %s because the data didn't validate.".subs(opts.object_name, fail_message));
    var cleaned_data = form.cleaned_data;
    var file_field_list = [];
    for each (f in opts.fields) {
        if (!f.editable || isinstance(f, models.AutoField) || !(f.name in cleaned_data))
            continue;
        if (fields && !include(fields, f.name))
            continue;
        if (exclude && inlcude(exclude, f.name))
            continue;
        // Defer saving file-type fields until after the other fields, so a
        // callable upload_to can use the values from other fields.
        if (isinstance(f, models.FileField))
            file_field_list.push(f);
        else
            f.save_form_data(instance, cleaned_data[f.name]);
    }
    for each (f in file_field_list)
        f.save_form_data(instance, cleaned_data[f.name]);

    // Wrap up the saving of m2m data as a function.
    function save_m2m() {
        opts = instance._meta;
        cleaned_data = form.cleaned_data;
        for each (f in opts.many_to_many) {
            if (fields && !include(fields, f.name))
                continue;
            if (include(cleaned_data, f.name))
                f.save_form_data(instance, cleaned_data[f.name]);
        }
    }
    if (commit) {
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
    return type('FormForFields', [BaseForm], { 'base_fields': fields});
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
    $L('doff.db.models.fields.related', 'ManyToManyField', 'OneToOneField');
    var opts = instance._meta;
    var data = {};
    for each (f in opts.fields.concat(opts.many_to_many)) {
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
    for each (f in opts.fields.concat(opts.many_to_many)) {
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

var ModelFormOptions = type('ModelFormOptions', {
    __init__: function(options) {
        this.model = getattr(options, 'model', null);
        this.fields = getattr(options, 'fields', null);
        this.exclude = getattr(options, 'exclude', null);
    }
});

var BaseModelForm = type('BaseModelForm', BaseForm, {
    __init__: function() {
        arguments = new Arguments(arguments, {'data':null, 'files':null, 'auto_id':'id_%s', 'prefix':null, 'initial':null, 'error_class':ErrorList, 'label_suffix':':', 'empty_permitted':false, 'instance':null});
        var kwargs = arguments.kwargs;
        var opts = this._meta;
        if (!kwargs['instance']) {
            // if we didn't get an instance, instantiate a new one
            this.instance = new opts.model();
            var object_data = {};
        } else {
            this.instance = instance;
            var object_data = model_to_dict(instance, opts.fields, opts.exclude);
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
        $L('doff.db.models.fields', 'FieldDoesNotExist');
        
        // Gather a list of checks to perform. We only perform unique checks 
        // for fields present and not None in cleaned_data.  Since this is a 
        // ModelForm, some fields may have been excluded; we can't perform a unique 
        // check on a form that is missing fields involved in that check.  It also does
        // not make sense to check data that didn't validate, and since NULL does not 
        // equal NULL in SQL we should not do any unique checking for NULL values.
        var unique_checks = [];
        for each (check in this.instance._meta.unique_together) {
            fields_on_form = [field for each (field in check) if (this.cleaned_data[field])];
            if (len(fields_on_form) == len(check))
                unique_checks.push(check)
        }
        var form_errors = [];

        // Gather a list of checks for fields declared as unique and add them to
        // the list of checks. Again, skip empty fields and any that did not validate.
        for each ([name, field] in items(this.fields)) {
            try {
                f = this.instance._meta.get_field_by_name(name)[0];
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
            for each (field_name in unique_check)
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
                    field_name = unique_check[0];
                    field_label = this.fields[field_name].label;
                    // Insert the error into the error dict, very sneaky
                    this._errors[field_name] = new ErrorList(["%(model_name)s with this %(field_label)s already exists.".subs({'model_name': model_name, 'field_label': field_label})]);
                // unique_together
                } else {
                    field_labels = [this.fields[field_name].label for each (field_name in unique_check)];
                    field_labels = get_text_list(field_labels, 'and');
                    form_errors.push("%(model_name)s with this %(field_label)s already exists.".subs({'model_name': model_name, 'field_label': field_labels}));
                }
                // Mark these fields as needing to be removed from cleaned data
                // later.
                for each (field_name in unique_check)
                    bad_fields.add(field_name);
            }
        }
        for each (field_name in bad_fields)
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
        commit = commit || true;
        var fail_message = (!this.instance.pk)? 'created' :'changed';
        return save_instance(this, this.instance, {'fields': this._meta.fields, 'fail_message': fail_message, 'commit': commit});
    }
});

var ModelForm = type('ModelForm', BaseModelForm, {
    //Static
    __new__: function(name, bases, attrs) {
        var formfield_callback = attrs['formfield_callback'] || function(f) { return f.formfield(); };
        try {
            parents = [b for each (b in bases) if (issubclass(b, ModelForm))];
        } catch (e) {
            // We are defining ModelForm itself.
            parents = null;
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
/*
function modelform_factory(model, form=ModelForm, fields=None, exclude=None,
                       formfield_callback=lambda f: f.formfield()):
    // HACK: we should be able to construct a ModelForm without creating
    // and passing in a temporary inner class
    class Meta:
        pass
    setattr(Meta, 'model', model)
    setattr(Meta, 'fields', fields)
    setattr(Meta, 'exclude', exclude)
    class_name = model.__name__ + 'Form'
    return ModelFormMetaclass(class_name, (form,), {'Meta': Meta,
                              'formfield_callback': formfield_callback})

/*
// ModelFormSets ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class BaseModelFormSet(BaseFormSet):
    """
    A ``FormSet`` for editing a queryset and/or adding new objects to it.
    """
    model = None

    def __init__(self, data=None, files=None, auto_id='id_%s', prefix=None,
                 queryset=None, **kwargs):
        self.queryset = queryset
        defaults = {'data': data, 'files': files, 'auto_id': auto_id, 'prefix': prefix}
        defaults['initial'] = [model_to_dict(obj) for obj in self.get_queryset()]
        defaults.update(kwargs)
        super(BaseModelFormSet, self).__init__(**defaults)

    def _construct_form(self, i, **kwargs):
        if i < self._initial_form_count:
            kwargs['instance'] = self.get_queryset()[i]
        return super(BaseModelFormSet, self)._construct_form(i, **kwargs)

    def get_queryset(self):
        if not hasattr(self, '_queryset'):
            if self.queryset is not None:
                qs = self.queryset
            else:
                qs = self.model._default_manager.get_query_set()
            if self.max_num > 0:
                self._queryset = qs[:self.max_num]
            else:
                self._queryset = qs
        return self._queryset

    def save_new(self, form, commit=True):
        """Saves and returns a new model instance for the given form."""
        return save_instance(form, self.model(), exclude=[self._pk_field.name], commit=commit)

    def save_existing(self, form, instance, commit=True):
        """Saves and returns an existing model instance for the given form."""
        return save_instance(form, instance, exclude=[self._pk_field.name], commit=commit)

    def save(self, commit=True):
        """Saves model instances for every form, adding and changing instances
        as necessary, and returns the list of instances.
        """
        if not commit:
            self.saved_forms = []
            def save_m2m():
                for form in self.saved_forms:
                    form.save_m2m()
            self.save_m2m = save_m2m
        return self.save_existing_objects(commit) + self.save_new_objects(commit)

    def save_existing_objects(self, commit=True):
        self.changed_objects = []
        self.deleted_objects = []
        if not self.get_queryset():
            return []

        // Put the objects from self.get_queryset into a dict so they are easy to lookup by pk
        existing_objects = {}
        for obj in self.get_queryset():
            existing_objects[obj.pk] = obj
        saved_instances = []
        for form in self.initial_forms:
            obj = existing_objects[form.cleaned_data[self._pk_field.name]]
            if self.can_delete and form.cleaned_data[DELETION_FIELD_NAME]:
                self.deleted_objects.append(obj)
                obj.delete()
            else:
                if form.changed_data:
                    self.changed_objects.append((obj, form.changed_data))
                    saved_instances.append(self.save_existing(form, obj, commit=commit))
                    if not commit:
                        self.saved_forms.append(form)
        return saved_instances

    def save_new_objects(self, commit=True):
        self.new_objects = []
        for form in self.extra_forms:
            if not form.has_changed():
                continue
            // If someone has marked an add form for deletion, don't save the
            // object.
            if self.can_delete and form.cleaned_data[DELETION_FIELD_NAME]:
                continue
            self.new_objects.append(self.save_new(form, commit=commit))
            if not commit:
                self.saved_forms.append(form)
        return self.new_objects

    def add_fields(self, form, index):
        """Add a hidden field for the object's primary key."""
        from django.db.models import AutoField
        self._pk_field = pk = self.model._meta.pk
        if pk.auto_created or isinstance(pk, AutoField):
            form.fields[self._pk_field.name] = IntegerField(required=False, widget=HiddenInput)
        super(BaseModelFormSet, self).add_fields(form, index)

def modelformset_factory(model, form=ModelForm, formfield_callback=lambda f: f.formfield(),
                         formset=BaseModelFormSet,
                         extra=1, can_delete=False, can_order=False,
                         max_num=0, fields=None, exclude=None):
    """
    Returns a FormSet class for the given Django model class.
    """
    form = modelform_factory(model, form=form, fields=fields, exclude=exclude,
                             formfield_callback=formfield_callback)
    FormSet = formset_factory(form, formset, extra=extra, max_num=max_num,
                              can_order=can_order, can_delete=can_delete)
    FormSet.model = model
    return FormSet


// InlineFormSets //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class BaseInlineFormSet(BaseModelFormSet):
    """A formset for child objects related to a parent."""
    def __init__(self, data=None, files=None, instance=None,
                 save_as_new=False, prefix=None):
        from django.db.models.fields.related import RelatedObject
        if instance is None:
            self.instance = self.model()
        else:
            self.instance = instance
        self.save_as_new = save_as_new
        // is there a better way to get the object descriptor?
        self.rel_name = RelatedObject(self.fk.rel.to, self.model, self.fk).get_accessor_name()
        qs = self.model._default_manager.filter(**{self.fk.name: self.instance})
        super(BaseInlineFormSet, self).__init__(data, files, prefix=prefix or self.rel_name,
                                                queryset=qs)

    def _construct_forms(self):
        if self.save_as_new:
            self._total_form_count = self._initial_form_count
            self._initial_form_count = 0
        super(BaseInlineFormSet, self)._construct_forms()

    def _construct_form(self, i, **kwargs):
        form = super(BaseInlineFormSet, self)._construct_form(i, **kwargs)
        if self.save_as_new:
            // Remove the primary key from the form's data, we are only
            // creating new instances
            form.data[form.add_prefix(self._pk_field.name)] = None
        return form
    
    def save_new(self, form, commit=True):
        kwargs = {self.fk.get_attname(): self.instance.pk}
        new_obj = self.model(**kwargs)
        return save_instance(form, new_obj, exclude=[self._pk_field.name], commit=commit)

    def add_fields(self, form, index):
        super(BaseInlineFormSet, self).add_fields(form, index)
        if self._pk_field == self.fk:
            form.fields[self._pk_field.name] = InlineForeignKeyField(self.instance, pk_field=True)
        else:
            form.fields[self.fk.name] = InlineForeignKeyField(self.instance, label=form.fields[self.fk.name].label)

def _get_foreign_key(parent_model, model, fk_name=None):
    """
    Finds and returns the ForeignKey from model to parent if there is one.
    If fk_name is provided, assume it is the name of the ForeignKey field.
    """
    // avoid circular import
    from django.db.models import ForeignKey
    opts = model._meta
    if fk_name:
        fks_to_parent = [f for f in opts.fields if f.name == fk_name]
        if len(fks_to_parent) == 1:
            fk = fks_to_parent[0]
            if not isinstance(fk, ForeignKey) or \
                    (fk.rel.to != parent_model and
                     fk.rel.to not in parent_model._meta.get_parent_list()):
                raise Exception("fk_name '%s' is not a ForeignKey to %s" % (fk_name, parent_model))
        elif len(fks_to_parent) == 0:
            raise Exception("%s has no field named '%s'" % (model, fk_name))
    else:
        // Try to discover what the ForeignKey from model to parent_model is
        fks_to_parent = [
            f for f in opts.fields
            if isinstance(f, ForeignKey)
            and (f.rel.to == parent_model
                or f.rel.to in parent_model._meta.get_parent_list())
        ]
        if len(fks_to_parent) == 1:
            fk = fks_to_parent[0]
        elif len(fks_to_parent) == 0:
            raise Exception("%s has no ForeignKey to %s" % (model, parent_model))
        else:
            raise Exception("%s has more than 1 ForeignKey to %s" % (model, parent_model))
    return fk


def inlineformset_factory(parent_model, model, form=ModelForm,
                          formset=BaseInlineFormSet, fk_name=None,
                          fields=None, exclude=None,
                          extra=3, can_order=False, can_delete=True, max_num=0,
                          formfield_callback=lambda f: f.formfield()):
    """
    Returns an ``InlineFormSet`` for the given kwargs.

    You must provide ``fk_name`` if ``model`` has more than one ``ForeignKey``
    to ``parent_model``.
    """
    fk = _get_foreign_key(parent_model, model, fk_name=fk_name)
    // enforce a max_num=1 when the foreign key to the parent model is unique.
    if fk.unique:
        max_num = 1
    if fields is not None:
        fields = list(fields)
        fields.append(fk.name)
    else:
        // get all the fields for this model that will be generated.
        fields = fields_for_model(model, fields, exclude, formfield_callback).keys()
        fields.append(fk.name)
    kwargs = {
        'form': form,
        'formfield_callback': formfield_callback,
        'formset': formset,
        'extra': extra,
        'can_delete': can_delete,
        'can_order': can_order,
        'fields': fields,
        'exclude': exclude,
        'max_num': max_num,
    }
    FormSet = modelformset_factory(model, **kwargs)
    FormSet.fk = fk
    return FormSet


// Fields //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class InlineForeignKeyHiddenInput(HiddenInput):
    def _has_changed(self, initial, data):
        return False

class InlineForeignKeyField(Field):
    """
    A basic integer field that deals with validating the given value to a
    given parent instance in an inline.
    """
    default_error_messages = {
        'invalid_choice': _(u'The inline foreign key did not match the parent instance primary key.'),
    }
    
    def __init__(self, parent_instance, *args, **kwargs):
        self.parent_instance = parent_instance
        self.pk_field = kwargs.pop("pk_field", False)
        if self.parent_instance is not None:
            kwargs["initial"] = self.parent_instance.pk
        kwargs["required"] = False
        kwargs["widget"] = InlineForeignKeyHiddenInput
        super(InlineForeignKeyField, self).__init__(*args, **kwargs)
    
    def clean(self, value):
        if value in EMPTY_VALUES:
            if self.pk_field:
                return None
            // if there is no value act as we did before.
            return self.parent_instance
        // ensure the we compare the values as equal types.
        if force_unicode(value) != force_unicode(self.parent_instance.pk):
            raise ValidationError(self.error_messages['invalid_choice'])
        if self.pk_field:
            return self.parent_instance.pk
        return self.parent_instance

class ModelChoiceIterator(object):
    def __init__(self, field):
        self.field = field
        self.queryset = field.queryset

    def __iter__(self):
        if self.field.empty_label is not None:
            yield (u"", self.field.empty_label)
        if self.field.cache_choices:
            if self.field.choice_cache is None:
                self.field.choice_cache = [
                    self.choice(obj) for obj in self.queryset.all()
                ]
            for choice in self.field.choice_cache:
                yield choice
        else:
            for obj in self.queryset.all():
                yield self.choice(obj)

    def choice(self, obj):
        if self.field.to_field_name:
            // FIXME: The try..except shouldn't be necessary here. But this is
            // going in just before 1.0, so I want to be careful. Will check it
            // out later.
            try:
                key = getattr(obj, self.field.to_field_name).pk
            except AttributeError:
                key = getattr(obj, self.field.to_field_name)
        else:
            key = obj.pk
        return (key, self.field.label_from_instance(obj))


class ModelChoiceField(ChoiceField):
    """A ChoiceField whose choices are a model QuerySet."""
    // This class is a subclass of ChoiceField for purity, but it doesn't
    // actually use any of ChoiceField's implementation.
    default_error_messages = {
        'invalid_choice': _(u'Select a valid choice. That choice is not one of'
                            u' the available choices.'),
    }

    def __init__(self, queryset, empty_label=u"---------", cache_choices=False,
                 required=True, widget=None, label=None, initial=None,
                 help_text=None, to_field_name=None, *args, **kwargs):
        self.empty_label = empty_label
        self.cache_choices = cache_choices

        // Call Field instead of ChoiceField __init__() because we don't need
        // ChoiceField.__init__().
        Field.__init__(self, required, widget, label, initial, help_text,
                       *args, **kwargs)
        self.queryset = queryset
        self.choice_cache = None
        self.to_field_name = to_field_name

    def _get_queryset(self):
        return self._queryset

    def _set_queryset(self, queryset):
        self._queryset = queryset
        self.widget.choices = self.choices

    queryset = property(_get_queryset, _set_queryset)

    // this method will be used to create object labels by the QuerySetIterator.
    // Override it to customize the label.
    def label_from_instance(self, obj):
        """
        This method is used to convert objects into strings; it's used to
        generate the labels for the choices presented by this object. Subclasses
        can override this method to customize the display of the choices.
        """
        return smart_unicode(obj)

    def _get_choices(self):
        // If self._choices is set, then somebody must have manually set
        // the property self.choices. In this case, just return self._choices.
        if hasattr(self, '_choices'):
            return self._choices

        // Otherwise, execute the QuerySet in self.queryset to determine the
        // choices dynamically. Return a fresh QuerySetIterator that has not been
        // consumed. Note that we're instantiating a new QuerySetIterator *each*
        // time _get_choices() is called (and, thus, each time self.choices is
        // accessed) so that we can ensure the QuerySet has not been consumed. This
        // construct might look complicated but it allows for lazy evaluation of
        // the queryset.
        return ModelChoiceIterator(self)

    choices = property(_get_choices, ChoiceField._set_choices)

    def clean(self, value):
        Field.clean(self, value)
        if value in EMPTY_VALUES:
            return None
        try:
            key = self.to_field_name or 'pk'
            value = self.queryset.get(**{key: value})
        except self.queryset.model.DoesNotExist:
            raise ValidationError(self.error_messages['invalid_choice'])
        return value

class ModelMultipleChoiceField(ModelChoiceField):
    """A MultipleChoiceField whose choices are a model QuerySet."""
    widget = SelectMultiple
    hidden_widget = MultipleHiddenInput
    default_error_messages = {
        'list': _(u'Enter a list of values.'),
        'invalid_choice': _(u'Select a valid choice. %s is not one of the'
                            u' available choices.'),
    }

    def __init__(self, queryset, cache_choices=False, required=True,
                 widget=None, label=None, initial=None,
                 help_text=None, *args, **kwargs):
        super(ModelMultipleChoiceField, self).__init__(queryset, None,
            cache_choices, required, widget, label, initial, help_text,
            *args, **kwargs)

    def clean(self, value):
        if self.required and not value:
            raise ValidationError(self.error_messages['required'])
        elif not self.required and not value:
            return []
        if not isinstance(value, (list, tuple)):
            raise ValidationError(self.error_messages['list'])
        final_values = []
        for val in value:
            try:
                obj = self.queryset.get(pk=val)
            except self.queryset.model.DoesNotExist:
                raise ValidationError(self.error_messages['invalid_choice'] % val)
            else:
                final_values.append(obj)
        return final_values
*/
$P( {   'ModelForm': ModelForm,
        'BaseModelForm': BaseModelForm,
        'model_to_dict': model_to_dict,
        'fields_for_model': fields_for_model,
        'save_instance': save_instance,
        'form_for_fields': form_for_fields
        /*
        'ModelChoiceField': ModelChoiceField,
        'ModelMultipleChoiceField': ModelMultipleChoiceField */ });