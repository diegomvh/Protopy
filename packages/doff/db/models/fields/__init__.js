$L('doff.db', 'connection');
$L('doff.db.models.signals');
$L('doff.db.models.query_utils', 'QueryWrapper');
$L('doff.conf', 'settings');
//from django import forms
$L('doff.core.exceptions', 'ValidationError');
//from django.utils.itercompat import tee
//from django.utils import datetime_safe

var NOT_PROVIDED = Class('NOT_PROVIDED', Exception);

// The values to use for "blank" in SelectFields. Will be appended to the start of most "choices" lists.
var BLANK_CHOICE_DASH = [["", "---------"]];
var BLANK_CHOICE_NONE = [["", "None"]];

var FieldDoesNotExist = Class('FieldDoesNotExist', Exception);

var Field = Class('Field', {
    empty_strings_allowed: true,
    __init__: function() {

	var [args, kwargs] = Field.prototype.__init__.extra_arguments(arguments, {'verbose_name':null, 'name':null, 'primary_key':false,
	    'max_length':null, 'unique':false, 'blank':false, 'none':false, 'null':false,
	    'db_index':false, 'rel':null, 'default_value':NOT_PROVIDED, 'editable':true,
	    'serialize':true, 'unique_for_date':null, 'unique_for_month':null,
	    'unique_for_year':null, 'choices':[], 'help_text':'', 'db_column':null,
	    'db_tablespace':settings.DEFAULT_INDEX_TABLESPACE, 'auto_created':false});

	this.name = kwargs['name'];
	this.verbose_name = (args.length == 1)? args[0] : kwargs['verbose_name'];
	this.primary_key = kwargs['primary_key'];
	this.max_length = kwargs['max_length']
	this._unique = kwargs['unique'];
	this.blank = kwargs['blank'];
	this.none = kwargs['none'] || kwargs['null']; // :) sorry

	if (this.empty_strings_allowed && connection.features.interprets_empty_strings_as_nulls)
	    this.none = true;
	this.rel = kwargs['rel'];
	this.default_value = kwargs['default_value'];
	this.editable = kwargs['editable'];
	this.serialize = kwargs['serialize'];
	this.unique_for_date = kwargs['unique_for_date'];
	this.unique_for_month = kwargs['unique_for_month'];
	this.unique_for_year = kwargs['unique_for_year'];
	this._choices = kwargs['choices'];
	this.help_text = kwargs['help_text'];
	this.db_column = kwargs['db_column'];
	this.db_tablespace = kwargs['db_tablespace'];
	this.auto_created = kwargs['auto_created'];

	// Set db_index to True if the field has a relationship and doesn't explicitly set db_index.
	this.db_index = kwargs['db_index'];

	// Adjust the appropriate creation counter, and save our local copy.
	if (kwargs['auto_created']) {
	    this.creation_counter = Field.auto_creation_counter;
	    Field.auto_creation_counter -= 1;
	} else {
	    this.creation_counter = Field.creation_counter;
	    Field.creation_counter += 1;
	}

	this.__defineGetter__('unique', this._get_unique);
	this.__defineGetter__('choices', this._get_choices);
	this.__defineGetter__('flatchoices', this._get_flatchoices);
    },

    __cmp__: function(other){
	// This is needed because bisect does not take a comparison function.
	return this.creation_counter - other.creation_counter;
    },

    __deepcopy__: function() {
	var obj = this.copy();
	if (this.rel)
	    obj.rel = this.rel.copy();
	return obj;
    },

    copy: function () {
	return Class(this.__name__, this.prototype);
    },

    /*
     * Converts the input value into the expected Python data type, raising
     * doff.core.ValidationError if the data can't be converted.
     * Returns the converted value. Subclasses should override this.
     */
    to_javascript: function(value) {
        return value;
    },

    db_type: function() {
        var ret = connection.creation.data_types[this.get_internal_type()];
        if (!ret)
            return null;
        else
            return ret.subs(this.max_length);
    },

    _get_unique: function() {
        return this._unique || this.primary_key;
    },

    set_attributes_from_name: function(name) {
        this.name = name;
        var [attname, column] = this.get_attname_column();
        this.attname = attname;
        this.column = column;
        if (!this.verbose_name && name)
            this.verbose_name = name.replace('_', ' ');
    },

    contribute_to_class: function(cls, name) {
        this.set_attributes_from_name(name);
        cls._meta.add_field(this);
        if (bool(this.choices)) {
                //FIXME: creo ques es un add_method
            var key = 'get_%s_display'.subs(this.name);
            cls[key] = cls._get_FIELD_display.curry(this);
        }
    },

    get_attname: function() {
        return this.name;
    },

    get_attname_column: function() {
        var attname = this.get_attname();
        var column = this.db_column || attname;
        return [attname, column];
    },

    get_cache_name: function() {
        return '_%s_cache'.subs(this.name);
    },

    get_internal_type: function() {
        return this.constructor.__name__;
    },

    /*
	* Returns field's value just before saving.
	*/
    pre_save: function(model_instance, add) {
        return model_instance[this.attname];
    },

    /*
	* Returns field's value prepared for interacting with the database backend.
	* Used by the default implementations of ``get_db_prep_save``and `get_db_prep_lookup```
	*/
    get_db_prep_value: function(value) {
	return value;
    },

    /*
	* Returns field's value prepared for saving into a database.
	*/
    get_db_prep_save: function(value) {
	return this.get_db_prep_value(value);
    },

    get_db_prep_lookup: function(lookup_type, value){
	/* Returns field's value prepared for database lookup. */
	if (!isundefined(value['as_sql'])) {
	    var [sql, params] = value.as_sql();
	    return new QueryWrapper('(%s)'.subs(sql), params);
	}

	if (include(['regex', 'iregex', 'month', 'day', 'search'], lookup_type))
	    return [value];
	else if (include(['exact', 'gt', 'gte', 'lt', 'lte'], lookup_type))
	    return [this.get_db_prep_value(value)];
	else if (include(['range', 'in'], lookup_type))
	    return [this.get_db_prep_value(v) for each (v in value)];
	else if (include(['contains', 'icontains'], lookup_type))
	    return ["%%%s%%".subs(connection.ops.prep_for_like_query(value))];
	else if (lookup_type == 'iexact')
	    return [connection.ops.prep_for_iexact_query(value)];
	else if (include(['startswith', 'istartswith'], lookup_type))
	    return ["%s%%".subs(connection.ops.prep_for_like_query(value))];
	else if (include(['endswith', 'iendswith'], lookup_type))
	    return ["%%%s".subs(connection.ops.prep_for_like_query(value))];
	else if (lookup_type == 'isnull')
	    return [];
	else if (lookup_type == 'year') {
	    value = Number(value);
	    if (isNaN(value))
		throw new ValueError("The __year lookup type requires an integer argument");

	    if (this.get_internal_type() == 'DateField')
		return connection.ops.year_lookup_bounds_for_date_field(value);
	    else
		return connection.ops.year_lookup_bounds(value);
	}

	throw new TypeError("Field has invalid lookup: %s".subs(lookup_type));
    },

    /*
	* Returns a boolean of whether this field has a default value.
	*/
    has_default: function() {
	return this.default_value != NOT_PROVIDED;
    },

    /*
	* Returns the default value for this field
	*/
    get_default: function() {
	if (this.has_default()) {
	    if (isfunction(this.default_value))
		return self.default_value();
	    return this.default_value;
	}
	if (!this.empty_strings_allowed || (this.none && !connection.features.interprets_empty_strings_as_nulls))
	    return null;
	return "";
    },

    get_validator_unique_lookup_type: function() {
	return '%s__exact'.subs(this.name);
    },

    /*
	* Returns choices with a default blank choices included, for use as SelectField choices for this field.
	*/
    get_choices: function(include_blank, blank_choice) {
	include_blank = include_blank || true;
	blank_choice = blank_choice || BLANK_CHOICE_DASH;
	var first_choice = include_blank && blank_choice || [];
	if (bool(this.choices))
	    return first_choice.concat(this.choices);
	var rel_model = this.rel.to;
        //FIXME: no suele andar muy bien esto de indexar con una invocacion
	if (this.rel['get_related_field'])
	    lst = [x[this.rel.get_related_field().attname, x] for (x in rel_model._default_manager.complex_filter(this.rel.limit_choices_to))];
	else
	    lst = [[x._get_pk_val(), x] for (x in rel_model._default_manager.complex_filter(this.rel.limit_choices_to))];
	return first_choice.concat(lst);
    },

    get_choices_default: function() {
	return this.get_choices();
    },

    /*
     * Returns flattened choices with a default blank choice included.
     */
    get_flatchoices: function(include_blank, blank_choice) {
	include_blank = include_blank || true;
	blank_choice = blank_choice || BLANK_CHOICE_DASH;
	var first_choice = include_blank && blank_choice || [];
	return first_choice.concat(this.flatchoices);
    },

    _get_val_from_obj: function(object) {
	if (object)
	    return object[this.attname];
	else
	    return this.get_default();
    },

    /*
     * Returns a string value of this field from the passed obj.
     * This is used by the serialization framework.
     */
    value_to_string: function(object) {
	return new String(this._get_val_from_obj(object));
    },

    bind: function(fieldmapping, original, bound_field_class) {
	return bound_field_class(this, fieldmapping, original);
    },

    _get_choices: function() {
	if (this._choices['next']) {
	    var [choices, _choices] = tee(this._choices);
	    this._choices = _choices;
	    return choices;
	} else {
	    return this._choices;
	}
    },

    /*
	* Flattened version of choices tuple.
	*/
    _get_flatchoices: function() {
	var flat = [];
	for ([choice, value] in this.choices)
	    if (isarray(value))
		flat.concat(value);
	    else
		flat.push([choice, value])
	return flat;
    },

    save_form_data: function(instance, data) {
	instance[this.name] = data;
    },

    /* TODO: Forms
    def formfield(self, form_class=forms.CharField, **kwargs):
	"Returns a django.forms.Field instance for this database Field."
	defaults = {'required': not self.blank, 'label': capfirst(self.verbose_name), 'help_text': self.help_text}
	if self.has_default():
	    defaults['initial'] = self.get_default()
	    if callable(self.default):
		defaults['show_hidden_initial'] = True
	if self.choices:
	    # Fields with choices get special treatment.
	    include_blank = self.blank or not (self.has_default() or 'initial' in kwargs)
	    defaults['choices'] = self.get_choices(include_blank=include_blank)
	    defaults['coerce'] = self.to_javascript
	    if self.null:
		defaults['empty_value'] = None
	    form_class = forms.TypedChoiceField
	    # Many of the subclass-specific formfield arguments (min_value,
	    # max_value) don't apply for choice fields, so be sure to only pass
	    # the values that TypedChoiceField will understand.
	    for k in kwargs.keys():
		if k not in ('coerce', 'empty_value', 'choices', 'required',
				'widget', 'label', 'initial', 'help_text',
				'error_messages'):
		    del kwargs[k]
	defaults.update(kwargs)
	return form_class(**defaults)
	*/
    /*
	* Returns the value of this field in the given model instance.
	*/
    value_from_object: function(object) {
	return object[this.attname];
    }
});

Field.creation_counter = 0;
Field.auto_creation_counter = -1;

var AutoField = Class('AutoField', Field, {
    empty_strings_allowed: false,
    __init__: function($super) {
	var [args, kwargs] = AutoField.prototype.__init__.extra_arguments(arguments);
	assert (!isundefined(kwargs['primary_key']), "%ss must have primary_key = true.".subs(this.constructor.__name__));
	kwargs['blank'] = true;
	args.push(kwargs);
	$super.apply(this, args);
    },

    to_javascript: function(value) {
	if (!value)
	    return value;
	var n = Number(value);
	if (isNaN(n))
	    throw new ValidationError("This value must be an integer.");
    },

    get_db_prep_value: function(value) {
	if (!value)
	    return null;
	return Number(value) || null;
    },

    contribute_to_class: function($super, cls, name) {
	assert (!cls._meta.has_auto_field, "A model can't have more than one AutoField.");
	$super(cls, name);
	cls._meta.has_auto_field = true;
	cls._meta.auto_field = this;
    }
    /* TODO: forms
    def formfield(self, **kwargs):
	return None
	*/
});

var BooleanField = Class('BooleanField', Field, {
    __init__: function($super) {
	var [args, kwargs] = BooleanField.prototype.__init__.extra_arguments(arguments);
	kwargs['blank'] = true;
	if (isundefined(kwargs['default_value']) && isundefined(kwargs['none']));
	    kwargs['default_value'] = false;
	args.push(kwargs);
	$super.apply(this, args);
    },

    to_javascript: function(value) {
	if (value == false || value == true) return value;
	if (include(['t', 'true', '1'], value)) return true;
	if (include(['f', 'false', '0'], value)) return false;
	throw new ValidationError("This value must be either True or False.");
    },

    get_db_prep_lookup: function($super, lookup_type, value) {
	// Special-case handling for filters coming from a web request (e.g. the
	// admin interface). Only works for scalar values (not lists). If you're
	// passing in a list, you might as well make things the right type when
	// constructing the list.
	if (include(['1', '0'], value));
	    value = bool(Number(value));
	return $super(lookup_type, value);
    },

    get_db_prep_value: function(value) {
	if (!value)
	    return null;
	return bool(value);
    }
    /* TODO: forms
    def formfield(self, **kwargs):
	defaults = {'form_class': forms.BooleanField}
	defaults.update(kwargs)
	return super(BooleanField, self).formfield(**defaults)
	*/
});

var CharField = Class('CharField', Field, {
	__init__: function($super) {
	var [args, kwargs] = CharField.prototype.__init__.extra_arguments(arguments);
	kwargs['max_length'] = kwargs['max_length'] || 100;
	args.push(kwargs);
	$super.apply(this, args);
    },

    to_javascript: function(value) {
	if (isstring(value))
	    return value;
	if (!value)
	    if (this.none)
		return value;
	    else
		throw new ValidationError("This field cannot be null.");
	return value;
    }
    /*
    def formfield(self, **kwargs):
	defaults = {'max_length': self.max_length}
	defaults.update(kwargs)
	return super(CharField, self).formfield(**defaults)
	*/
});

var ansi_date_re = /^\d{4}-\d{1,2}-\d{1,2}$/;
var ansi_time_re = /^(0[1-9]|1\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

var DateField = Class('DateField', Field, {
    empty_strings_allowed: false,
    __init__: function($super) {
	var [args, kwargs] = DateField.prototype.__init__.extra_arguments(arguments, {'verbose_name':null, 'name':null, 'auto_now':false, 'auto_now_add':false});
	this.auto_now = kwargs['auto_now'];
	this.auto_now_add = kwargs['auto_now_add'];
	//auto_now_add/auto_now should be done as a default or a pre_save.
	if (this.auto_now || this.auto_now_add) {
	    kwargs['editable'] = false;
	    kwargs['blank'] = true;
	}
	args.push(kwargs);
	$super.apply(this, args);
    },

    to_javascript: function(value) {
	if (value == null)
	    return value;
	if (value instanceof Date)
	    return value;

	if (ansi_date_re.search(value) != 0)
	    throw new ValidationError('Enter a valid date in YYYY-MM-DD format.');
	// Now that we have the date string in YYYY-MM-DD format, check to make
	// sure it's a valid date.
	// We could use time.strptime here and catch errors, but datetime.date
	// produces much friendlier error messages.
	map(function(simbol) { return this[simbol]; }, mod);
	var [year, month, day] = value.split('-').map(function(simbol) {return Number(simbol)});

	return new Date(year, month, day);
    },

    pre_save: function($super, model_instance, add) {
	if (this.auto_now || (this.auto_now_add && add)) {
	    value = new Date();
	    model_instance[this.attname] = value;
	    return value;
	} else
	    return $super(model_instance, add);
    },

    contribute_to_class: function($super, cls, name) {
	//TODO: ver si los contribute_to_class tambien hay que mandarlos a la instancia osea en prototype
	$super(cls, name);
	if (!this.none) {
	    var key = 'get_next_by_%s'.subs(this.name);
	    cls.prototype[key] = cls.prototype._get_next_or_previous_by_FIELD.curry(this, true);
	    key = 'get_previous_by_%s'.subs(this.name);
	    cls.prototype[key] = cls.prototype._get_next_or_previous_by_FIELD.curry(this, false);
	}
    },

    get_db_prep_lookup: function($super, lookup_type, value) {
	// For "__month" and "__day" lookups, convert the value to a string so
	// the database backend always sees a consistent type.
	if (include(['month', 'day'], lookup_type))
	    return [new String(value)];
	return $super(lookup_type, value);
    },

    get_db_prep_value: function(value) {
	// Casts dates into the format expected by the backend
	return connection.ops.value_to_db_date(this.to_javascript(value));
    },

    value_to_string: function(obj) {
	var val = this._get_val_from_obj(obj);
	if (val == null || isundefined(val)) {
	    var data = '';
	} else {
	    //TODO: pasar la fecha a cadena
	    var data = datetime_safe.new_date(val).strftime("%Y-%m-%d")
	}
	return data;
    }
/*
    def formfield(self, **kwargs):
	defaults = {'form_class': forms.DateField}
	defaults.update(kwargs)
	return super(DateField, self).formfield(**defaults)
	*/
});

var DateTimeField = Class('DateTimeField', DateField, {

    to_javascript: function(value) {
	if (!value)
	    return value;
	if (value instanceof Date)
	    return value;

	/* TODO: Parsear la cadena para levantar la fecha y hora
	new Date("month day, year hours:minutes:seconds")

	# split usecs, because they are not recognized by strptime.
	if '.' in value:
	    try:
		value, usecs = value.split('.')
		usecs = int(usecs)
	    except ValueError:
		raise ValidationError(
		    _('Enter a valid date/time in YYYY-MM-DD HH:MM[:ss[.uuuuuu]] format.'))
	else:
	    usecs = 0
	kwargs = {'microsecond': usecs}
	try: # Seconds are optional, so try converting seconds first.
	    return datetime.datetime(*time.strptime(value, '%Y-%m-%d %H:%M:%S')[:6],
					**kwargs)

	except ValueError:
	    try: # Try without seconds.
		return datetime.datetime(*time.strptime(value, '%Y-%m-%d %H:%M')[:5],
					    **kwargs)
	    except ValueError: # Try without hour/minutes/seconds.
		try:
		    return datetime.datetime(*time.strptime(value, '%Y-%m-%d')[:3],
						**kwargs)
		except ValueError:
		    raise ValidationError(
			_('Enter a valid date/time in YYYY-MM-DD HH:MM[:ss[.uuuuuu]] format.'))
	*/
    },

    get_db_prep_value: function(value) {
	// Casts dates into the format expected by the backend
	return connection.ops.value_to_db_datetime(this.to_javascript(value));
    },

    value_to_string: function(obj) {
	var val = this._get_val_from_obj(obj);
	if (!val) {
	    data = '';
	} else {
	    //TODO: pasar hora a cadena o string :P
	    d = datetime_safe.new_datetime(val)
	    data = d.strftime('%Y-%m-%d %H:%M:%S')
	}
	return data;
    }
/*
    def formfield(self, **kwargs):
	defaults = {'form_class': forms.DateTimeField}
	defaults.update(kwargs)
	return super(DateTimeField, self).formfield(**defaults)
    */
});

var DecimalField = Class('DecimalField', Field, {
    empty_strings_allowed: false,
    __init__: function($super) {
	var [args, kwargs] = DecimalField.prototype.__init__.extra_arguments(arguments, {'verbose_name':null, 'name':null, 'max_digits':null, 'decimal_places':null});
	this.max_digits = kwargs['max_digits'];
	this.decimal_places = kwargs['decimal_places'];
	args.push(kwargs);
	$super.apply(this, args);
    },

    to_javascript: function(value) {
	if (!value)
	    return value;
	//TODO ver que pasa con los decimal
	return decimal.Decimal(value);
    },

    _format: function(value) {
	if (isstrgin(value) || !value)
	    return value;
	else
	    return this.format_number(value);
    },

    /*
	* Formats a number into a string with the requisite number of digits and decimal places.
	*/
    format_number: function(value) {
	var util = $L('doff.db.backends.util');
	return util.format_number(value, this.max_digits, this.decimal_places);
    },

    get_db_prep_value: function(value) {
	return connection.ops.value_to_db_decimal(this.to_javascript(value), this.max_digits, this.decimal_places);
    }
    /*
    def formfield(self, **kwargs):
	defaults = {
	    'max_digits': self.max_digits,
	    'decimal_places': self.decimal_places,
	    'form_class': forms.DecimalField,
	}
	defaults.update(kwargs)
	return super(DecimalField, self).formfield(**defaults)
    */
});

var EmailField = Class('EmailField', CharField, {
    __init__: function($super) {
	var [args, kwargs] = EmailField.prototype.__init__.extra_arguments(arguments);
	kwargs['max_length'] = kwargs['max_length'] || 75;
	args.push(kwargs);
	$super.apply(this, args);
    }
/*
    def formfield(self, **kwargs):
	defaults = {'form_class': forms.EmailField}
	defaults.update(kwargs)
	return super(EmailField, self).formfield(**defaults)
*/
});

var FilePathField = Class('FilePathField', Field, {
    __init__: function($super) {
	var [args, kwargs] = FilePathField.prototype.__init__.extra_arguments(arguments, {'verbose_name':null, 'name':null, 'path':'', 'match':null, 'recursive':false});
	this.path = kwargs['path'];
	this.match = kwargs['match'];
	this.recursive = kwargs['recursive'];
	kwargs['max_length'] = kwargs['max_length'] || 100;
	args.push(kwargs);
	$super.apply(this, args);
    }
/*
    def formfield(self, **kwargs):
	defaults = {
	    'path': self.path,
	    'match': self.match,
	    'recursive': self.recursive,
	    'form_class': forms.FilePathField,
	}
	defaults.update(kwargs)
	return super(FilePathField, self).formfield(**defaults)
    */
});

var FloatField = Class('FloatField', Field, {
    empty_strings_allowed: false,

    get_db_prep_value: function(value) {
	if (!value)
	    return null;
	return Number(value);
    }

/*
    def formfield(self, **kwargs):
	defaults = {'form_class': forms.FloatField}
	defaults.update(kwargs)
	return super(FloatField, self).formfield(**defaults)
*/
});

var IntegerField = Class('IntegerField', Field, {
    empty_strings_allowed: false,
    get_db_prep_value: function(value) {
	if (!value)
	    return null;
	return Number(value);
    },

    to_javascript: function(value) {
	if (!value)
	    return value;
	var n = Number(value);
	if (isNaN(n)) {
	    throw new ValidationError("This value must be an integer.");
	}
	return n;
    }
/*
    def formfield(self, **kwargs):
	defaults = {'form_class': forms.IntegerField}
	defaults.update(kwargs)
	return super(IntegerField, self).formfield(**defaults)
*/
});

var IPAddressField = Class('IPAddressField', Field, {
    empty_strings_allowed: false,
    __init__: function($super) {
	var [args, kwargs] = IPAddressField.prototype.__init__.extra_arguments(arguments);
	kwargs['max_length'] = 15;
	args.push(kwargs);
	$super.apply(this, args);
    }

/*
    def formfield(self, **kwargs):
	defaults = {'form_class': forms.IPAddressField}
	defaults.update(kwargs)
	return super(IPAddressField, self).formfield(**defaults)
*/
});

var NullBooleanField = Class('NullBooleanField', Field, {
    empty_strings_allowed: false,
    __init__: function($super) {
	var [args, kwargs] = NullBooleanField.prototype.__init__.extra_arguments(arguments);
	kwargs['none'] = true;
	args.push(kwargs);
	$super.apply(this, args);
    },

    to_javascript: function(value) {
	if (value == false || value == true || value == null) return value;
	if ('null' == value) return null;
	if (include(['t', 'true', '1'], value)) return true;
	if (include(['f', 'false', '0'], value)) return false;
	throw new ValidationError("This value must be either null, true or false.");
    },

    get_db_prep_lookup: function($super,lookup_type, value) {
	// Special-case handling for filters coming from a web request (e.g. the
	// admin interface). Only works for scalar values (not lists). If you're
	// passing in a list, you might as well make things the right type when
	// constructing the list.
	if (include(['1', '0'], value))
	    value = bool(Number(value));
	return $super(lookup_type, value);
    },

    get_db_prep_value: function(value) {
	if (value == null)
	    return null;
	return bool(value);
    }
/*
    def formfield(self, **kwargs):
	defaults = {
	    'form_class': forms.NullBooleanField,
	    'required': not self.blank,
	    'label': capfirst(self.verbose_name),
	    'help_text': self.help_text}
	defaults.update(kwargs)
	return super(NullBooleanField, self).formfield(**defaults)
*/
});

var PositiveIntegerField = Class('PositiveIntegerField', IntegerField, {
/*
    def formfield(self, **kwargs):
	defaults = {'min_value': 0}
	defaults.update(kwargs)
	return super(PositiveIntegerField, self).formfield(**defaults)
*/
});

var PositiveSmallIntegerField = Class('PositiveSmallIntegerField', IntegerField, {

/*
    def formfield(self, **kwargs):
	defaults = {'min_value': 0}
	defaults.update(kwargs)
	return super(PositiveSmallIntegerField, self).formfield(**defaults)
*/
});

var SlugField = Class('SlugField', CharField, {
    __init__: function($super) {
	var [args, kwargs] = SlugField.prototype.__init__.extra_arguments(arguments);
	kwargs['max_length'] = kwargs['max_length'] || 50;
	// Set db_index=True unless it's been set manually.
	if (isundefined(kwargs['db_index']))
	    kwargs['db_index'] = true;
	args.push(kwargs);
	$super.apply(this, args);
    }

    /*
    def formfield(self, **kwargs):
	defaults = {'form_class': forms.SlugField}
	defaults.update(kwargs)
	return super(SlugField, self).formfield(**defaults)
	*/
});

var SmallIntegerField = Class('SmallIntegerField', IntegerField, {});

var TextField = Class('TextField', Field, {
    /*
    def formfield(self, **kwargs):
	defaults = {'widget': forms.Textarea}
	defaults.update(kwargs)
	return super(TextField, self).formfield(**defaults)
    */
});
var TimeField = Class('TimeField', Field, {
    empty_strings_allowed: false,
    __init__: function($super) {
	var [args, kwargs] = TimeField.prototype.__init__.extra_arguments(arguments, {verbose_name:null, name:null, auto_now:false, auto_now_add:false});
	this.auto_now = kwargs['auto_now'];
	this.auto_now_add = kwargs['auto_now_add'];
	if (this.auto_now || this.auto_now_add)
	    kwargs['editable'] = false;
	args.push(kwargs);
	$super.apply(this, args);
    },

    to_javascript: function(value) {
	if (!value)
	    return null
	if (value instanceof Date)
	    return value;

	    /* TODO validar la fecha
	# Attempt to parse a datetime:
	value = smart_str(value)
	# split usecs, because they are not recognized by strptime.
	if '.' in value:
	    try:
		value, usecs = value.split('.')
		usecs = int(usecs)
	    except ValueError:
		raise ValidationError(
		    _('Enter a valid time in HH:MM[:ss[.uuuuuu]] format.'))
	else:
	    usecs = 0
	kwargs = {'microsecond': usecs}

	try: # Seconds are optional, so try converting seconds first.
	    return datetime.time(*time.strptime(value, '%H:%M:%S')[3:6],
				    **kwargs)
	except ValueError:
	    try: # Try without seconds.
		return datetime.time(*time.strptime(value, '%H:%M')[3:5],
					    **kwargs)
	    except ValueError:
		raise ValidationError(
		    _('Enter a valid time in HH:MM[:ss[.uuuuuu]] format.'))
	*/
    },

    pre_save: function($super, model_instance, add) {
	if (this.auto_now || (this.auto_now_add && add)) {
	    value = new Date();
	    model_instance[this.attname] = value;
	    return value;
	}
	else
	    return $super(model_instance, add);
    },

    get_db_prep_value: function(value) {
	// Casts times into the format expected by the backend
	return connection.ops.value_to_db_time(this.to_javascript(value));
    },

    value_to_string: function(obj) {
	var val = this._get_val_from_obj(obj);
	if (!val)
	    var data = '';
	else
	    //TODO pasar a time
	    var data = val.strftime("%H:%M:%S")
	return data;
    }
/*
    def formfield(self, **kwargs):
	defaults = {'form_class': forms.TimeField}
	defaults.update(kwargs)
	return super(TimeField, self).formfield(**defaults)
*/
});

var URLField = Class('URLField', CharField, {
    __init__: function($super) {
	var [args, kwargs] = URLField.prototype.__init__.extra_arguments(arguments, {'verbose_name':null, 'name':null, 'verify_exists':true});
	kwargs['max_length'] = kwargs['max_length'] || 200;
	this.verify_exists = kwargs['verify_exists'];
	args.push(kwargs);
	$super.apply(this, args);
    }
    /*
    def formfield(self, **kwargs):
	defaults = {'form_class': forms.URLField, 'verify_exists': self.verify_exists}
	defaults.update(kwargs)
	return super(URLField, self).formfield(**defaults)
	*/
});

var XMLField = Class('XMLField', TextField, {
    __init__: function($super) {
	var [args, kwargs] = XMLField.prototype.__init__.extra_arguments(arguments, {'verbose_name':null, 'name':null, 'schema_path':null});
	this.schema_path = kwargs['schema_path'];
	args.push(kwargs);
	$super.apply(this, args);
    }
});


$P({ 'FieldDoesNotExist': FieldDoesNotExist, 
     'Field': Field,
    'AutoField': AutoField,
    'BooleanField': BooleanField,
    'CharField': CharField,
    'DateField': DateField,
    'DateTimeField': DateTimeField,
    'DecimalField': DecimalField,
    'EmailField': EmailField,
    'FilePathField': FilePathField,
    'FloatField': FloatField,
    'IntegerField': IntegerField,
    'IPAddressField': IPAddressField,
    'NullBooleanField': NullBooleanField,
    'PositiveIntegerField': PositiveIntegerField,
    'PositiveSmallIntegerField': PositiveSmallIntegerField,
    'SlugField': SlugField,
    'SmallIntegerField': SmallIntegerField,
    'TextField': TextField,
    'TimeField': TimeField,
    'URLField': URLField,
    'XMLField': XMLField });
    