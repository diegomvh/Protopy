require('doff.forms.forms', 'Form');
require('doff.forms.fields', 'IntegerField', 'BooleanField');
require('doff.forms.fields', 'IntegerField', 'BooleanField');
require('doff.forms.widgets', 'Media', 'HiddenInput');
require('doff.forms.util', 'ErrorList', 'ErrorDict', 'ValidationError');

// special field names
var TOTAL_FORM_COUNT = 'TOTAL_FORMS';
var INITIAL_FORM_COUNT = 'INITIAL_FORMS';
var ORDERING_FIELD_NAME = 'ORDER';
var DELETION_FIELD_NAME = 'DELETE';

var ManagementForm = type('ManagementForm', [ Form ], {
    /*
    ``ManagementForm`` is used to keep track of how many form instances
    are displayed on the page. If adding new forms via javascript, you should
    increment the count field of this form as well.
    */
    __init__: function() {
        var arg = new Arguments(arguments);
        this.base_fields[TOTAL_FORM_COUNT] = new IntegerField({ widget: HiddenInput });
        this.base_fields[INITIAL_FORM_COUNT] = new IntegerField({ widget: HiddenInput });
        super(Form, this).__init__(arg);
    }
});

var BaseFormSet = type('BaseFormSet', [ object ], {
    get_default_prefix: function() {
        return 'form';
    }
},{
    /*
    A collection of instances of the same Form class.
    */
    __init__: function() {
        var arg = new Arguments(arguments, {'data':null, 'files':null, 'auto_id':'id_%s', 'prefix':null,
                        'initial':null, 'error_class':ErrorList});
        var kwargs = arg.kwargs;
        this.is_bound = kwargs['data'] != null || kwargs['files'] != null;
        this.prefix = kwargs['prefix'] || BaseFormSet.get_default_prefix();
        this.auto_id = kwargs['auto_id'];
        this.data = kwargs['data'];
        this.files = kwargs['files'];
        this.initial = kwargs['initial'];
        this.error_class = kwargs['error_class'];
        this._errors = null;
        this._non_form_errors = null;
        // construct the forms in the formset
        this._construct_forms();
    },

    __str__: function() {
        return this.as_table();
    },

    get management_form() {
        /*Returns the ManagementForm instance for this FormSet.*/
        if (bool(this.data) || bool(this.files)) {
            var form = new ManagementForm({data: this.data, auto_id: this.auto_id, prefix: this.prefix});
            if (!form.is_valid())
                throw new ValidationError('ManagementForm data is missing or has been tampered with');
        } else {
            var initial = {};
            initial[TOTAL_FORM_COUNT] = this.total_form_count();
            initial[INITIAL_FORM_COUNT] = this.initial_form_count();
            var form = new ManagementForm({ auto_id: this.auto_id, prefix: this.prefix, initial: initial });
        }
        return form;
    },

    total_form_count: function() {
        /*Returns the total number of forms in this FormSet.*/
        if (bool(this.data) || bool(this.files)) {
            return this.management_form.cleaned_data[TOTAL_FORM_COUNT];
        } else {
            var total_forms = this.initial_form_count() + this.extra;
            if (total_forms > this.max_num && this.max_num > 0)
                total_forms = this.max_num;
        }
        return total_forms;
    },

    initial_form_count: function() {
        /*Returns the number of forms that are required in this FormSet.*/
        if (bool(this.data) || bool(this.files)) {
            return this.management_form.cleaned_data[INITIAL_FORM_COUNT];
        } else {
            // Use the length of the inital data if it's there, 0 otherwise.
            var initial_forms = this.initial && len(this.initial) || 0;
            if (initial_forms > this.max_num && this.max_num > 0)
                initial_forms = this.max_num;
        }
        return initial_forms;
    },

    _construct_forms: function() {
        // instantiate all the forms and put them in self.forms
        this.forms = [];
        for (var i in xrange(this.total_form_count()))
            this.forms.push(this._construct_form(i));
    },

    _construct_form: function(i) {
        /*
        Instantiates and returns the i-th form instance in a formset.
        */
        var arg = new Arguments(arguments);
        var kwargs = arg.kwargs;
        var defaults = {'auto_id': this.auto_id, 'prefix': this.add_prefix(i) };
        if (bool(this.data) || bool(this.files)) {
            defaults['data'] = this.data;
            defaults['files'] = this.files;
        }
        if (bool(this.initial)) {
            var e = this.initial[i];
            if (!isundefined(e))
                defaults['initial'] = e;
        }
        // Allow extra forms to be empty.
        if (i >= this.initial_form_count())
            defaults['empty_permitted'] = true;
        extend(defaults, kwargs);
        var form = new this.form(defaults);
        this.add_fields(form, i);
        return form;
    },

    get initial_forms() {
        /*Return a list of all the initial forms in this formset.*/
        return this.forms.slice(0, this.initial_form_count());
    },

    get extra_forms() {
        /*Return a list of all the extra forms in this formset.*/
        return this.forms.slice(this.initial_form_count());
    },

    // Maybe this should just go away?
    get cleaned_data() {
        /*
        Returns a list of form.cleaned_data dicts for every form in self.forms.
        */
        if (!this.is_valid())
            throw new AttributeError("'%s' object has no attribute 'cleaned_data'".subs(this.__class__.__name__));
        return [form.cleaned_data for each (form in this.forms)];
    },

    get deleted_forms() {
        /*
        Returns a list of forms that have been marked for deletion. Raises an
        AttributeError if deletion is not allowed.
        */
        if (!this.is_valid() || !this.can_delete)
            throw new AttributeError("'%s' object has no attribute 'deleted_forms'".subs(this.__class__.__name__));
        // construct _deleted_form_indexes which is just a list of form indexes
        // that have had their deletion widget set to True
        if (!hasattr(this, '_deleted_form_indexes')) {
            this._deleted_form_indexes = [];
            for each (var i in range(0, this.total_form_count())) {
                var form = this.forms[i];
                // if this is an extra form and hasn't changed, don't consider it
                if (i >= this.initial_form_count() && !form.has_changed())
                    continue;
                if (form.cleaned_data[DELETION_FIELD_NAME])
                    this._deleted_form_indexes.push(i);
            }
        }
        return [this.forms[i] for each (i in this._deleted_form_indexes)];
    },

    get ordered_forms() {
        /*
        Returns a list of form in the order specified by the incoming data.
        Raises an AttributeError if ordering is not allowed.
        */
        if (!this.is_valid() || !this.can_order)
            throw new AttributeError("'%s' object has no attribute 'ordered_forms'".subs(this.__class__.__name__));
        // Construct _ordering, which is a list of (form_index, order_field_value)
        // tuples. After constructing this list, we'll sort it by order_field_value
        // so we have a way to get to the form indexes in the order specified
        // by the form data.
        if (!hasattr(this, '_ordering')) {
            this._ordering = [];
            for each (var i in range(0, this.total_form_count())) {
                var form = this.forms[i];
                // if this is an extra form and hasn't changed, don't consider it
                if (i >= this.initial_form_count() && !form.has_changed())
                    continue;
                // don't add data marked for deletion to self.ordered_data
                if (this.can_delete && form.cleaned_data[DELETION_FIELD_NAME])
                    continue;
                this._ordering.push([i, form.cleaned_data[ORDERING_FIELD_NAME]]);
            }
            // After we're done populating self._ordering, sort it.
            // A sort function to order things numerically ascending, but
            // None should be sorted below anything else. Allowing None as
            // a comparison value makes it so we can leave ordering fields
            // blamk.
            function compare_ordering_values(x, y) {
                if (x[1] == null)
                    return 1;
                if (y[1] == null)
                    return -1;
                return x[1] - y[1];
            }
            this._ordering.sort(compare_ordering_values);
        }
        // Return a list of form.cleaned_data dicts in the order spcified by
        // the form data.
        return [this.forms[i[0]] for each (i in this._ordering)];
    },

    non_form_errors: function() {
        /*
        Returns an ErrorList of errors that aren't associated with a particular
        form -- i.e., from formset.clean(). Returns an empty ErrorList if there
        are none.
        */
        if (this._non_form_errors != null)
            return this._non_form_errors;
        return new this.error_class();
    },
    
    get errors() {
        /*
        Returns a list of form.errors for every form in self.forms.
        */
        if (this._errors == null)
            this.full_clean();
        return this._errors;
    },

    is_valid: function() {
        /*
        Returns True if form.errors is empty for every form in self.forms.
        */
        if (!this.is_bound)
            return false;
        // We loop over every form.errors here rather than short circuiting on the
        // first failure to make sure validation gets triggered for every form.
        var forms_valid = true;
        for each (var i in range(0, this.total_form_count())) {
            var form = this.forms[i];
            if (this.can_delete) {
                // The way we lookup the value of the deletion field here takes
                // more code than we'd like, but the form's cleaned_data will
                // not exist if the form is invalid.
                var field = form.fields[DELETION_FIELD_NAME];
                var raw_value = form._raw_value(DELETION_FIELD_NAME);
                var should_delete = field.clean(raw_value);
                if (should_delete)
                    // This form is going to be deleted so any of its errors
                    // should not cause the entire formset to be invalid.
                    continue;
            }
            if (bool(this.errors[i]))
                forms_valid = false;
        }
        return forms_valid && !bool(this.non_form_errors());
    },

    full_clean: function() {
        /*
        Cleans all of self.data and populates self._errors.
        */
        this._errors = [];
        if (!this.is_bound) // Stop further processing.
            return;
        for each (var i in range(0, this.total_form_count())) {
            var form = this.forms[i];
            this._errors.push(form.errors);
        // Give self.clean() a chance to do cross-form validation.
        }
        try {
            this.clean();
        } catch (e if isinstance(e, ValidationError)) {
            this._non_form_errors = e.messages;
        }
    },

    clean: function() {
        /*
        Hook for doing any extra formset-wide cleaning after Form.clean() has
        been called on every form. Any ValidationError raised by this method
        will not be associated with a particular form; it will be accesible
        via formset.non_form_errors()
        */
    },

    add_fields: function(form, index) {
        /*A hook for adding extra fields on to each form instance.*/
        if (this.can_order) {
            // Only pre-fill the ordering field for initial forms.
            if (index < this.initial_form_count())
                form.fields[ORDERING_FIELD_NAME] = new IntegerField({label:'Order', initial: index + 1, required: false});
            else
                form.fields[ORDERING_FIELD_NAME] = new IntegerField({label:'Order', required: false});
        }
        if (this.can_delete)
            form.fields[DELETION_FIELD_NAME] = new BooleanField({label:'Delete', required: false});
    },

    add_prefix: function(index) {
        return '%s-%s'.subs(this.prefix, index);
    },

    is_multipart: function() {
        /*
        Returns True if the formset needs to be multipart-encrypted, i.e. it
        has FileInput. Otherwise, False.
        */
        return bool(this.forms) && this.forms[0].is_multipart();
    },

    get media() {
        // All the forms on a FormSet are the same, so you only need to
        // interrogate the first form for media.
        if (this.forms)
            return this.forms[0].media;
        else
            return new Media();
    },

    as_table: function() {
        /*Returns this formset rendered as HTML <tr>s -- excluding the <table></table>.*/
        // XXX: there is no semantic division between forms here, there
        // probably should be. It might make sense to render each form as a
        // table row with each field as a td.
        var forms = [form.as_table() for each (form in this.forms)].join(' ');
        return [string(this.management_form), forms].join('\n');
    }
});

function formset_factory(form) {
    /*Return a FormSet for the given form class.*/
    var arg = new Arguments(arguments, {formset: BaseFormSet, extra: 1, can_order: false, can_delete: false, max_num:0});
    var attrs = {'form': form, 'extra': arg.kwargs['extra'],
             'can_order': arg.kwargs['can_order'], 'can_delete': arg.kwargs['can_delete'],
             'max_num': arg.kwargs['max_num']};
    return type(form.__name__ + 'FormSet', [ arg.kwargs['formset'] ], attrs);
}

function all_valid(formsets) {
    /*Returns true if every formset in formsets is valid.*/
    var valid = true;
    for each (var formset in formsets)
        if (!formset.is_valid())
            valid = false;
    return valid;
}

publish({
    TOTAL_FORM_COUNT: TOTAL_FORM_COUNT,
    INITIAL_FORM_COUNT: INITIAL_FORM_COUNT,
    ORDERING_FIELD_NAME: ORDERING_FIELD_NAME,
    DELETION_FIELD_NAME: DELETION_FIELD_NAME,
    BaseFormSet: BaseFormSet,
    formset_factory: formset_factory,
    all_valid: all_valid 
});
