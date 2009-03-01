$D('Form classes');
$L('copy', 'deepcopy');
$L('doff.utils.datastructures', 'SortedDict');

//from django.utils.html import conditional_escape

$L('doff.forms.fields', 'Field', 'FileField');
$L('doff.forms.widgets', 'Media', 'media_property', 'TextInput', 'Textarea');
$L('doff.forms.util', 'flatatt', 'ErrorDict', 'ErrorList', 'ValidationError');

var NON_FIELD_ERRORS = '__all__';

function pretty_name(name) {
    //Converts 'first_name' to 'First name'
    name = name.capitalize();
    return name.replace('_', ' ');
}

/* 
Create a list of form field instances from the passed in 'attrs', plus any
    similar fields on the base classes (in 'bases'). This is used by both the
    Form and ModelForm metclasses.

    If 'with_base_fields' is True, all fields from the bases are used.
    Otherwise, only fields in the 'declared_fields' attribute on the bases are
    used. The distinction is useful in ModelForm subclassing.
    Also integrates any additional media definitions
*/
function get_declared_fields(bases, attrs, with_base_fields) {
    with_base_fields = with_base_fields || true;
    var fields = [[field_name, obj] for ([field_name, obj] in items(attrs)) if (isinstance(obj, Field))];
    fields.sort(function(x, y) { return cmp(x[1].creation_counter, y[1].creation_counter)});

    // If this class is subclassing another Form, add that Form's fields.
    // Note that we loop over the bases in *reverse*. This is necessary in
    // order to preserve the correct order of fields.
    if (with_base_fields)
        for each (base in bases.reverse()) {
            if (hasattr(base, 'base_fields'))
                fields = items(base.base_fields).concat(fields);
    } else {
        for each (base in bases.reverse())
            if (hasattr(base, 'declared_fields'))
                fields = items(base.declared_fields).concat(fields);
    }
    return new SortedDict(fields);
}

// This is the main implementation of all the Form logic. Note that this
// class is different than Form. See the comments by the Form class for more
// information. Any improvements to the form API should be made to *this*
// class, not to the Form class.
var BaseForm = type('BaseForm', {
    __init__: function() {
        arguments = new Arguments(arguments, {'data':null, 'files':null, 'auto_id':'id_%s', 'prefix':null, 'initial':null, 'error_class':ErrorList, 'label_suffix':':', 'empty_permitted':false});
        var kwargs = arguments.kwargs;
        this.is_bound = bool(kwargs['data'] || kwargs['files']);
        this.data = kwargs['data'] || {};
        this.files = kwargs['files'] || {};
        this.auto_id = kwargs['auto_id'];
        this.prefix = kwargs['prefix'];
        this.initial = kwargs['initial'] || {};
        this.error_class = kwargs['error_class'];
        this.label_suffix = kwargs['label_suffix'];
        this.empty_permitted = kwargs['empty_permitted'];
        this._errors = null; // Stores the errors after clean() has been called.
        this._changed_data = null;

        // The base_fields class attribute is the *class-wide* definition of
        // fields. Because a particular *instance* of the class might want to
        // alter self.fields, we create self.fields here by copying base_fields.
        // Instances should always modify self.fields; they should not modify
        // self.base_fields.
        this.fields = deepcopy(this.base_fields);
    },

    __str__: function() {
        return this.as_table();
    },

    __iter__: function() {
        for each ([name, field] in items(this.fields))
            yield new BoundField(this, field, name);
    },

    //Returns a BoundField with the given name."
    __getitem__: function(name) {
        var field = this.fields[name];
        if (field == undefined)
            throw new KeyError('Key %r not found in Form'.subs(name));
        return new BoundField(this, field, name);
    },

    get: function(name) {
        return this.__getitem__(name);
    },
    
    //Returns an ErrorDict for the data provided for the form"
    get errors() {
        if (!this._errors)
            this.full_clean();
        return this._errors;
    },

    /* 
    Returns True if the form has no errors. Otherwise, False. If errors are
    being ignored, returns False.
    */
    is_valid: function() {
        return this.is_bound && !bool(this.errors);
    },

    /* 
     * Returns the field name with a prefix appended, if this Form has a prefix set.
     * Subclasses may wish to override.
     */
    add_prefix: function(field_name) {
        return this.prefix && ('%s-%s'.subs(this.prefix, field_name)) || field_name;
    },

    /* Add a 'initial' prefix for checking dynamic initial values */
    add_initial_prefix: function(field_name) {
        return 'initial-%s'.subs(this.add_prefix(field_name));
    },

    //Helper function for outputting HTML. Used by as_table(), as_ul(), as_p()."
    _html_output: function(normal_row, error_row, row_ender, help_text_html, errors_on_separate_row) {
        var top_errors = this.non_field_errors(); // Errors that should be displayed above all fields.
        var output = [];
        var hidden_fields = [];
        for ([name, field] in items(this.fields)) {
            var bf = new BoundField(this, field, name);
            var bf_errors = this.error_class([conditional_escape(error) for each (error in bf.errors)]); // Escape and cache in local variable.
            if (bf.is_hidden) {
                if (bool(bf_errors))
                    top_errors = top_errors.concat(['(Hidden field %s) %s'.subs(name, e) for each (e in bf_errors)]);
                hidden_fields.push(str(bf));
            } else {
                if (errors_on_separate_row && bf_errors)
                    output.push(error_row.subs(bf_errors));
                if (bf.label) {
                    var label = conditional_escape(bf.label);
                    // Only add the suffix if the label does not end in
                    // punctuation.
                    if (this.label_suffix)
                        if (!include(':?.!', label.slice(-1)))
                            label += this.label_suffix;
                    label = bf.label_tag(label) || '';
                } else {
                    var label = '';
                }
                if (field.help_text)
                    var help_text = help_text_html.subs(field.help_text);
                else
                    var help_text = '';
                output.push(normal_row.subs({'errors': bf_errors, 'label': label, 'field': str(bf), 'help_text': help_text}));
            }
        }
        if (bool(top_errors))
            output.splice(0, 0, error_row.subs(top_errors));
        if (bool(hidden_fields)) { // Insert any hidden fields in the last row.
            var str_hidden = hidden_fields.join('');
            if (bool(output)) {
                var last_row = output.slice(-1);
                // Chop off the trailing row_ender (e.g. '</td></tr>') and
                // insert the hidden fields.
                if (!last_row.endswith(row_ender)) {
                    // This can happen in the as_p() case (and possibly others
                    // that users write): if there are only top errors, we may
                    // not be able to conscript the last row for our purposes,
                    // so insert a new, empty row.
                    last_row = normal_row.subs({'errors': '', 'label': '', 'field': '', 'help_text': ''});
                    output.push(last_row);
                }
                output.slice(-1) = last_row.slice(0, -len(row_ender)).concat(str_hidden).concat(row_ender);
            } else {
                // If there aren't any rows in the output, just append the
                // hidden fields.
                output.push(str_hidden);
            }
        }
        return output.join('\n');
    },

    //Returns this form rendered as HTML <tr>s -- excluding the <table></table>."
    as_table: function() {
        return this._html_output('<tr><th>%(label)s</th><td>%(errors)s%(field)s%(help_text)s</td></tr>', '<tr><td colspan="2">%s</td></tr>', '</td></tr>', '<br />%s', false);
    },

    //Returns this form rendered as HTML <li>s -- excluding the <ul></ul>."
    as_ul: function() {
        return this._html_output('<li>%(errors)s%(label)s %(field)s%(help_text)s</li>', '<li>%s</li>', '</li>', ' %s', false);
    },

    //Returns this form rendered as HTML <p>s."
    as_p: function() {
        return this._html_output('<p>%(label)s %(field)s%(help_text)s</p>', '%s', '</p>', ' %s', true);
    },

    /* 
     * Returns an ErrorList of errors that aren't associated with a particular
     * field -- i.e., from Form.clean(). Returns an empty ErrorList if there are none.
     */
    non_field_errors: function() {
        return this.errors.get(NON_FIELD_ERRORS, this.error_class());
    },

    /* Cleans all of self.data and populates self._errors and self.cleaned_data. */
    full_clean: function() {
        this._errors = new ErrorDict();
        if (!this.is_bound) // Stop further processing.
            return;
        this.cleaned_data = {};
        // If the form is permitted to be empty, and none of the form data has
        // changed from the initial data, short circuit any validation.
        if (this.empty_permitted && !this.has_changed())
            return;
        for each ([name, field] in items(this.fields)) {
            // value_from_datadict() gets the data from the data dictionaries.
            // Each widget type knows how to retrieve its own data, because some
            // widgets split data over several HTML fields.
            var value = field.widget.value_from_datadict(this.data, this.files, this.add_prefix(name));
            try {
                if (isinstance(field, FileField)) {
                    var initial = this.initial.get(name, field.initial);
                    value = field.clean(value, initial);
                } else {
                    value = field.clean(value);
                }
                this.cleaned_data[name] = value;
                if (hasattr(this, 'clean_%s'.subs(name))) {
                    value = getattr(this, 'clean_%s'.subs(name))();
                    this.cleaned_data[name] = value;
                }
            } catch (e if e instanceof ValidationError) {
                this._errors.set(name, e.messages)
                if (name in this.cleaned_data)
                    delete this.cleaned_data[name];
            }
        }
        try {
            this.cleaned_data = this.clean();
        } catch (e if e instanceof ValidationError) {
            this._errors.set(NON_FIELD_ERRORS, e.messages);
        }
        if (bool(this._errors))
            delattr(this, 'cleaned_data');
    },
    /* 
    Hook for doing any extra form-wide cleaning after Field.clean() been
        called on every field. Any ValidationError raised by this method will
        not be associated with a particular field; it will have a special-case
        association with the field named '__all__'.
     */
    clean: function() {
        return this.cleaned_data;
    },

    /* Returns True if data differs from initial. */
    has_changed: function() {
        return bool(this.changed_data);
    },

    get changed_data() {
        if (!this._changed_data) {
            this._changed_data = [];
            // XXX: For now we're asking the individual widgets whether or not the
            // data has changed. It would probably be more efficient to hash the
            // initial data, store it in a hidden field, and compare a hash of the
            // submitted data, but we'd need a way to easily get the string value
            // for a given field. Right now, that logic is embedded in the render method of each widget.
            for each ([name, field] in items(this.fields)) {
                var prefixed_name = this.add_prefix(name);
                var data_value = field.widget.value_from_datadict(this.data, this.files, prefixed_name);
                if (!field.show_hidden_initial) {
                    var initial_value = this.initial.get(name, field.initial);
                } else {
                    var initial_prefixed_name = this.add_initial_prefix(name);
                    var hidden_widget = field.hidden_widget();
                    var initial_value = hidden_widget.value_from_datadict(this.data, this.files, initial_prefixed_name);
                }
                if (field.widget._has_changed(initial_value, data_value))
                    this._changed_data.append(name);
            }
        }
        return this._changed_data;
    },
    
    /* Provide a description of all media required to render the widgets on this form */
    get media() {
        var media = new Media();
        for each (var field in values(this.fields))
            media = media.__add__(field.widget.media);
        return media;
    },

    /* 
     * Returns True if the form needs to be multipart-encrypted, i.e. it has FileInput. Otherwise, False.
     */
    is_multipart: function() {
        for each (field in values(this.fields))
            if (field.widget.needs_multipart_form)
                return true;
        return false;
    }
});

//A collection of Fields, plus their associated data."
// This is a separate class from BaseForm in order to abstract the way
// self.fields is specified. This class (Form) is the one that does the
// fancy metaclass stuff purely for the semantic sugar -- it allows one
// to define a form using declarative syntax.
// BaseForm itself has no way of designating self.fields.
var Form = type('Form', BaseForm, {
    //Static
    __new__: function(name, bases, attrs) {
        attrs['base_fields'] = get_declared_fields(bases, attrs);
        new_class = super(BaseForm, this).__new__(name, bases, attrs);
        if (!('media' in attrs))
            new_class.prototype.__defineGetter__('media', media_property(new_class));
        return new_class;
    }
}, {});

//A Field plus data
var BoundField = type('BoundField', {
    __init__: function(form, field, name) {
        this.form = form;
        this.field = field;
        this.name = name;
        this.html_name = form.add_prefix(name);
        this.html_initial_name = form.add_initial_prefix(name);
        if (this.field.label == null)
            this.label = pretty_name(name)
        else
            this.label = this.field.label;
        this.help_text = field.help_text || '';
    },

    //Renders this field as an HTML widget."""
    __str__: function() {
        if (this.field.show_hidden_initial)
            return this.as_widget() + this.as_hidden(null, {'only_initial':true});
        return this.as_widget();
    },

    /* Returns an ErrorList for this field. Returns an empty ErrorList if there are none. */
    get errors() {
        return this.form.errors.get(this.name, this.form.error_class());
    },

    /* 
     * Renders the field by rendering the passed widget, adding any HTML
     * attributes passed as attrs.  If no widget is specified, then the
     * field's default widget will be used.
     */
    as_widget: function(widget, attrs, only_initial) {
        if (!widget)
            widget = this.field.widget;
        attrs = attrs || {};
        var auto_id = this.auto_id;
        if (auto_id && !('id' in attrs) && !('id' in widget.attrs))
            attrs['id'] = auto_id;
        if (!this.form.is_bound) {
            var data = this.form.initial.get(this.name, this.field.initial);
            if (callable(data))
                data = data();
        } else {
            data = this.data;
        }
        if (!only_initial)
            name = this.html_name;
        else
            name = this.html_initial_name;
        return widget.render(name, data, attrs);
    },
    
    //Returns a string of HTML for representing this as an <input type="text">.
    as_text: function(attrs){
        arguments = new Arguments(arguments);
        return this.as_widget(new TextInput(), attrs, arguments.kwargs['only_initial']);
    },

    //Returns a string of HTML for representing this as a <textarea>."
    as_textarea: function(attrs) {
        arguments = new Arguments(arguments);
        return this.as_widget(new Textarea(), attrs, arguments.kwargs['only_initial']);
    },

    //Returns a string of HTML for representing this as an <input type="hidden">.
    as_hidden: function(attrs) {
        arguments = new Arguments(arguments);
        return this.as_widget(this.field.hidden_widget(), attrs, arguments.kwargs['only_initial']);
    },

    //Returns the data for this BoundField, or None if it wasn't given.
    get data() {
        return this.field.widget.value_from_datadict(thsi.form.data, this.form.files, this.html_name);
    },

    /* 
     Wraps the given contents in a <label>, if the field has an ID attribute.
        Does not HTML-escape the contents. If contents aren't given, uses the
        field's HTML-escaped label.

        If attrs are given, they're used as HTML attributes on the <label> tag.
    */
    label_tag: function(contents, attrs) {
        contents = contents || conditional_escape(this.label);
        var widget = this.field.widget;
        var id_ = widget.attrs['id'] || this.auto_id;
        if (id_) {
            attrs = attrs && flatatt(attrs) || '';
            contents = '<label for="%s"%s>%s</label>'.subs(widget.id_for_label(id_), attrs, str(contents));
        }
        return contents;
    },

    //Returns True if this BoundField's widget is hidden."
    get _is_hidden() {
        return this.field.widget.is_hidden;
    },

    /* 
     * Calculates and returns the ID attribute for this BoundField, if the
     * associated Form has specified auto_id. Returns an empty string otherwise.
     */
    get auto_id() {
        var auto_id = this.form.auto_id;
        if (auto_id && include(auto_id, '%s'))
            return auto_id.subs(this.html_name)
        else if (auto_id)
            return this.html_name;
        return '';
    }
});

$P({    'BaseForm': BaseForm, 
        'Form': Form });