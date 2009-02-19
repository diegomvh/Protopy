$D('doff.forms.fields\n\
Field classes.');

$L('copy');
/*import os
import re
import time
import urlparse
try:
    from cStringIO import StringIO
except ImportError:
    from StringIO import StringIO

// Python 2.3 fallbacks
try:
    from decimal import Decimal, DecimalException
except ImportError:
    from django.utils._decimal import Decimal, DecimalException
try:
    set
except NameError:
    from sets import Set as set

import django.core.exceptions
from django.utils.translation import ugettext_lazy as _
from django.utils.encoding import smart_unicode, smart_str

from util import ErrorList, ValidationError
from widgets import TextInput, PasswordInput, HiddenInput, MultipleHiddenInput, FileInput, CheckboxInput, Select, NullBooleanSelect, SelectMultiple, DateTimeInput, TimeInput, SplitDateTimeWidget, SplitHiddenDateTimeWidget
from django.core.files.uploadedfile import SimpleUploadedFile as UploadedFile
*/
// These values, if given to to_javascript(), will trigger the this.required check.
var EMPTY_VALUES = [null, ''];


var Field = Class('Field', {
    //Static
    creation_counter: 0
    },{
    //Prototype
    widget: TextInput, // Default widget to use when rendering this type of Field.
    hidden_widget: HiddenInput, // Default widget to use when rendering this as "hidden".
    default_error_messages: {   'required': 'This field is required.',
                                'invalid': 'Enter a valid value.' },

    __init__: function() {

        var [args, kwargs] = Field.prototype.__init__.extra_arguments(arguments, {'required':true, 'widget':null, 'label':null, 'initial':null, 'help_text':'', 'error_messages':null, 'show_hidden_initial':false});

        this.required = kwargs['required'];
        this.label = ['label'];
        this.initial = kwargs['initial'];
        this.show_hidden_initial = kwargs['show_hidden_initial'];
        this.help_text = kwargs['help_text'];
        var widget = kwargs['widget'] || this.widget;
        if (isclass(widget))
            widget = new widget();

        // Hook into this.widget_attrs() for any Field-specific HTML attributes.
        var extra_attrs = this.widget_attrs(widget);
        if (bool(extra_attrs))
            widget.attrs.update(extra_attrs);

        this.widget = widget;

        // Increase the creation counter, && save our local copy.
        this.creation_counter = Field.creation_counter;
        Field.creation_counter += 1;
        //FIXME: los mensajes estan en un objeto
        function set_class_error_messages(messages, klass) {
            set_class_error_messages(messages, klass.superclass);
            messages.update(klass['default_error_messages'] || {});
        }
        var messages = {};
        set_class_error_messages(messages, this.__class__);
        messages.update(error_messages || {})
        this.error_messages = messages;
    },

    /*
     * Validates the given value && returns its "cleaned" value as an appropriate Python object.
     * Raises ValidationError for any errors.
     */
    clean: function(value) {
        if (this.required && include(EMPTY_VALUES, value))
            throw new ValidationError(this.error_messages['required']);
        return value;
    },

    /*
     * Given a Widget instance (*not* a Widget class), returns a dictionary of
     * any HTML attributes that should be added to the Widget, based on this Field.
     */
    widget_attrs: function(widget) {
        return {};
    },

    __deepcopy__: function() {
        var result = copy.copy(this);
        result.widget = copy.deepcopy(this.widget);
        return result;
    }
});

var CharField = Class('CharField', Field, {
    default_error_messages: {   'max_length': 'Ensure this value has at most %s characters (it has %s).',
                                'min_length': 'Ensure this value has at least %s characters (it has %s).' },

    __init__: function($super) {
        var [args, kwargs] = CharField.prototype.__init__.extra_arguments(arguments, {'max_length':null, 'min_length':null});
        this.max_length = kwargs['max_length'];
        this.min_length = kwargs['min_length'];
        args.push(kwargs);
        $super.apply(this, args);
    },

    /*
     * Validates max_length && min_length. Returns a Unicode object.
     */
    clean: function($super, value) {
        $super(value);
        if (include(EMPTY_VALUES, value))
            return '';
        var value_length = len(value)
        if (this.max_length != null && value_length > this.max_length)
            throw new ValidationError(this.error_messages['max_length'].subs(this.max_length, value_length));
        if (this.min_length != null && value_length < this.min_length)
            throw new ValidationError(this.error_messages['min_length'].subs(this.min_length, value_length));
        return value;
    },

    widget_attrs: function(widget) {
        if (this.max_length != null && isinstance(widget, [TextInput, PasswordInput]))
            // The HTML attribute is maxlength, not max_length.
            return {'maxlength': str(this.max_length)};
    }
});

var IntegerField = Class('IntegerField', Field, {
    default_error_messages: {   'invalid': 'Enter a whole number.',
                                'max_value': 'Ensure this value is less than || equal to %s.',
                                'min_value': 'Ensure this value is greater than || equal to %s.' },

    __init__: function __init__($super) {
        var [args, kwargs] = IntegerField.prototype.__init__.extra_arguments(arguments, {'max_value':null, 'min_value':null});
        this.max_value = kwargs['max_value'];
        this.min_value = kwargs['min_value'];
        args.push(kwargs);
        $super.apply(this, args);
    },

    /*
     * Validates that int() can be called on the input. Returns the result of int(). Returns None for empty values.
     */
    clean: function($super, value) {
        $super(value);
        if (include(EMPTY_VALUES, value))
            return null;
        try {
            value = int(str(value));
        } catch (e if e instanceof ValueError || e instanceof TypeError) {
            throw new ValidationError(this.error_messages['invalid']);
        }
        if (this.max_value != null && value > this.max_value)
            throw new ValidationError(this.error_messages['max_value'].subs(this.max_value));
        if (this.min_value != null && value < this.min_value)
            throw new ValidationError(this.error_messages['min_value'].subs(this.min_value));
        return value;
    }
});

var FloatField = Class('FloatField', Field, {
    default_error_messages: {   'invalid': 'Enter a number.',
                                'max_value': 'Ensure this value is less than || equal to %s.',
                                'min_value': 'Ensure this value is greater than || equal to %s.' },

    __init__: function ($super) {
        var [args, kwargs] = FloatField.prototype.__init__.extra_arguments(arguments, {'max_value':null, 'min_value':null});
        this.max_value = kwargs['max_value'];
        this.min_value = kwargs['min_value'];
        args.push(kwargs);
        $super.apply(this, args);
    },

    /*
     * Validates that float() can be called on the input. Returns a float. Returns None for empty values.
     */
    clean: function clean($super, value) {
        $super(value);
        if (!this.required && include(EMPTY_VALUES, value))
            return null;
        try {
            value = float(value);
        } catch (e if e instanceof ValueError || e instanceof TypeError) {
            throw new ValidationError(this.error_messages['invalid']);
        }
        if (this.max_value != null && value > this.max_value)
            throw new ValidationError(this.error_messages['max_value'].subs(this.max_value));
        if (this.min_value != null && value < this.min_value)
            throw new ValidationError(this.error_messages['min_value'].subs(this.min_value));
        return value;
    }
});

var DecimalField = Class('DecimalField', Field, {
    default_error_messages: {   'invalid': 'Enter a number.',
                                'max_value': 'Ensure this value is less than || equal to %s.',
                                'min_value': 'Ensure this value is greater than || equal to %s.',
                                'max_digits': 'Ensure that there are no more than %s digits in total.',
                                'max_decimal_places': 'Ensure that there are no more than %s decimal places.',
                                'max_whole_digits': 'Ensure that there are no more than %s digits before the decimal point.' },

    __init__: function($super) {
        var [args, kwargs] = DecimalField.prototype.__init__.extra_arguments(arguments, {'max_value':null, 'min_value':null, 'max_digits': null, 'decimal_places': null});
        this.max_value = kwargs['max_value'];
        this.min_value = kwargs['min_value'];
        this.max_digits = kwargs['max_digits'];
        this.decimal_places = kwargs['decimal_places'];
        args.push(kwargs);
        $super.apply(this, args);
    },

    /*
     * Validates that the input is a decimal number. Returns a Decimal instance. Returns None for empty values. Ensures that there are no more
     * than max_digits in the number, && no more than decimal_places digits after the decimal point.
     */
    clean: function($super, value) {
        $super(value);
        if (!this.required && include(EMPTY_VALUES, value))
            return null;
        value = value.strip(' ');
        try {
            value = new Decimal(value);
            //TODO: Decimal!
        } catch (e if e instanceof DecimalException) {
            throw new ValidationError(this.error_messages['invalid']);
        }
        var [sign, digittuple, exponent] = value.to_array();
        var decimals = Math.abs(exponent);
        // digittuple doesn't include any leading zeros.
        var digits = len(digittuple);
        if (decimals > digits)
            // We have leading zeros up to || past the decimal point.  Count
            // everything past the decimal point as a digit.  We do not count
            // 0 before the decimal point as a digit since that would mean
            // we would not allow max_digits = decimal_places.
            digits = decimals;
        var whole_digits = digits - decimals;

        if (this.max_value != null && value > this.max_value)
            throw new ValidationError(this.error_messages['max_value'].subs(this.max_value));
        if (this.min_value != null && value < this.min_value)
            throw new ValidationError(this.error_messages['min_value'].subs(this.min_value));
        if (this.max_digits != null && digits > this.max_digits)
            throw new ValidationError(this.error_messages['max_digits'].subs(this.max_digits));
        if (this.decimal_places != null && decimals > this.decimal_places)
            throw new ValidationError(this.error_messages['max_decimal_places'].subs(this.decimal_places));
        if (this.max_digits != null && this.decimal_places != null && whole_digits > (this.max_digits - this.decimal_places))
            throw new ValidationError(this.error_messages['max_whole_digits'].subs((this.max_digits - this.decimal_places)));
        return value;
    }
});

var DEFAULT_DATE_INPUT_FORMATS = [
    '%Y-%m-%d', '%m/%d/%Y', '%m/%d/%y', // '2006-10-25', '10/25/2006', '10/25/06'
    '%b %d %Y', '%b %d, %Y',            // 'Oct 25 2006', 'Oct 25, 2006'
    '%d %b %Y', '%d %b, %Y',            // '25 Oct 2006', '25 Oct, 2006'
    '%B %d %Y', '%B %d, %Y',            // 'October 25 2006', 'October 25, 2006'
    '%d %B %Y', '%d %B, %Y'             // '25 October 2006', '25 October, 2006'
]

var DateField = Class('DateField', Field, {
    default_error_messages: {   'invalid': 'Enter a valid date.' },

    __init__: function($super) {
        var [args, kwargs] = DateField.prototype.__init__.extra_arguments(arguments, {'input_formats':null});
        args.push(kwargs);
        $super.apply(this, args);
        this.input_formats = kwargs['input_formats'] || DEFAULT_DATE_INPUT_FORMATS;
    },

    /*
     * Validates that the input can be converted to a date. Returns a Javascript datetime.date object.
     */
    clean: function clean($super, value) {
        $super(value);
        if (include(EMPTY_VALUES, value))
            return null;
        if (value instanceof datetime.datetime)
            return value.date();
        if (value instanceof datetime.date)
            return value;
        for each (var format in this.input_formats) {
            try {
                return new datetime.date.apply(time.strptime(value, format).slice(0,3));
            } catch (e if e instanceof ValueError) { continue; }
        }
        throw new ValidationError(this.error_messages['invalid']);
    }
});

var DEFAULT_TIME_INPUT_FORMATS = [
    '%H:%M:%S',     // '14:30:59'
    '%H:%M'        // '14:30'
]

var TimeField = Class('TimeField', Field, {
    widget: TimeInput,
    default_error_messages: {   'invalid': 'Enter a valid time.' },

    __init__: function($super) {
        var [args, kwargs] = TimeField.prototype.__init__.extra_arguments(arguments, {'input_formats':null});
        args.push(kwargs);
        $super.apply(this, args);
        this.input_formats = kwargs['input_formats'] || DEFAULT_TIME_INPUT_FORMATS;
    },

    /*
     * Validates that the input can be converted to a time. Returns a Javascript datetime.time object.
     */
    clean: function($super, value) {
        $super(value);
        if (include(EMPTY_VALUES, value))
            return null;
        if (value instanceof datetime.time) 
            return value;
        for each (var format in this.input_formats) {
            try {
                return datetime.time(time.strptime(value, format).slice(3,6));
            } catch (e if e instanceof ValueError) { continue; }
        }
        throw new ValidationError(this.error_messages['invalid']);
});

var DEFAULT_DATETIME_INPUT_FORMATS = [
    '%Y-%m-%d %H:%M:%S',     // '2006-10-25 14:30:59'
    '%Y-%m-%d %H:%M',        // '2006-10-25 14:30'
    '%Y-%m-%d',              // '2006-10-25'
    '%m/%d/%Y %H:%M:%S',     // '10/25/2006 14:30:59'
    '%m/%d/%Y %H:%M',        // '10/25/2006 14:30'
    '%m/%d/%Y',              // '10/25/2006'
    '%m/%d/%y %H:%M:%S',     // '10/25/06 14:30:59'
    '%m/%d/%y %H:%M',        // '10/25/06 14:30'
    '%m/%d/%y',              // '10/25/06'
]

var DateTimeField = Class('DateTimeField', Field, {
    widget: DateTimeInput,
    default_error_messages: {   'invalid': 'Enter a valid date/time.' },

    __init__: function($super) {
        var [args, kwargs] = DateTimeField.prototype.__init__.extra_arguments(arguments, {'input_formats':null});
        args.push(kwargs);
        $super.apply(this, args);
        this.input_formats = kwargs['input_formats'] || DEFAULT_TIME_INPUT_FORMATS;
    },

    /*
     * Validates that the input can be converted to a datetime. Returns a Javascript datetime.datetime object.
     */
    clean: function($supqe, value) {
        $super(value);
        if (include(EMPTY_VALUES, value))
            return null;
        if (value instanceof datetime.datetime)
            return value;
        if (value instanceof datetime.date)
            return datetime.datetime(value.year, value.month, value.day);
        if (isarray(value)) {
            // Input comes from a SplitDateTimeWidget, for example. So, it's two
            // components: date && time.
            if (len(value) != 2)
                throw new ValidationError(this.error_messages['invalid']);
            value = '%s %s'.subs(value);
        }
        for each (var format in this.input_formats) {
            try {
                return datetime.datetime(time.strptime(value, format).slice(0, 6));
            } catch (e if e instanceof ValueError) { continue };
        }
        throw new ValidationError(this.error_messages['invalid']);
    }
});

var RegexField = Class('RegexField', CharField, {
    __init__: function($super, regex) {
        // error_message is just kept for backwards compatibility:
        var [args, kwargs] = RegexField.prototype.__init__.extra_arguments(arguments, {'max_length':null, 'min_length':null, 'error_message':null});
        if (kwargs['error_message']) {
            var error_messages = kwargs['error_messages'] || {};
            error_messages['invalid'] = error_message;
            kwargs['error_messages'] = error_messages;
        }
        args.push(kwargs);
        $super.apply(this, args);
        if (isstring(regex))
            regex = new RegExp(regex);
        this.regex = regex;
    },

    /*
     * Validates that the input matches the regular expression. Returns a Unicode object.
     */
    clean: function($super, value) {
        value = $super(value);
        if (value == '')
            return value;
        if (value.search(this.regex) == -1)
            throw new ValidationError(this.error_messages['invalid']);
        return value;
    }
});

var email_re = new RegExp("(^[-!//$%&'*+/=?^_`{}|~0-9A-Z]+(\.[-!//$%&'*+/=?^_`{}|~0-9A-Z]+)*|^\"([\001-\010\013\014\016-\037!//-\[\]-\177]|\\[\001-011\013\014\016-\177])*\")@(?:[A-Z0-9-]+\.)+[A-Z]{2,6}$", 'i');

var EmailField = Class('EmailField', RegexField, {
    default_error_messages: {   'invalid': 'Enter a valid e-mail address.' },

    __init__: function($super) {
        var [args, kwargs] = EmailField.prototype.__init__.extra_arguments(arguments, {'max_length':null, 'min_length': null});
        args.push(kwargs);
        $super.apply(this, [emali_re].concat(args));
    }
});

/*try:
    from django.conf import settings
    URL_VALIDATOR_USER_AGENT = settings.URL_VALIDATOR_USER_AGENT
except ImportError:
    // It's OK if Django settings aren't configured.
    URL_VALIDATOR_USER_AGENT = 'Django (http://www.djangoproject.com/)'
*/
var FileField = Class('FileField', Field, {
    widget: FileInput,
    default_error_messages: {   'invalid': 'No file was submitted. Check the encoding type on the form.',
                                'missing': 'No file was submitted.',
                                'empty': 'The submitted file is empty.' },

    __init__: function __init__( *args, **kwargs) {
        super(FileField, self).__init__(*args, **kwargs)

    clean: function clean( data, initial=None) {
        super(FileField, self).clean(initial || data)
        if (not this.required && data in EMPTY_VALUES) {
            return None
        elif (not data && initial) {
            return initial

        // UploadedFile objects should have name && size attributes.
        try:
            file_name = data.name
            file_size = data.size
        except AttributeError:
            throw new ValidationError(this.error_messages['invalid'])

        if (not file_name) {
            throw new ValidationError(this.error_messages['invalid'])
        if (not file_size) {
            throw new ValidationError(this.error_messages['empty'])

        return data
});

var ImageField = Class('ImageField', FileField, {
    default_error_messages: { 'invalid_image': 'Upload a valid image. The file you uploaded was either not an image || a corrupted image.' },

    clean: function clean( data, initial=None) {
        """
        Checks that the file-upload field data contains a valid image (GIF, JPG,
        PNG, possibly others -- whatever the Python Imaging Library supports).
        """
        f = super(ImageField, self).clean(data, initial)
        if (f is None) {
            return None
        elif (not data && initial) {
            return initial
        from PIL import Image

        // We need to get a file object for PIL. We might have a path || we might
        // have to read the data into memory.
        if hasattr(data, 'temporary_file_path') {
            file = data.temporary_file_path()
        else:
            if hasattr(data, 'read') {
                file = StringIO(data.read())
            else:
                file = StringIO(data['content'])

        try:
            // load() is the only method that can spot a truncated JPEG,
            //  but it cannot be called sanely after verify()
            trial_image = Image.open(file)
            trial_image.load()

            // Since we're about to use the file again we have to reset the
            // file object if possible.
            if hasattr(file, 'reset') {
                file.reset()

            // verify() is the only method that can spot a corrupt PNG,
            //  but it must be called immediately after the constructor
            trial_image = Image.open(file)
            trial_image.verify()
        except ImportError:
            // Under PyPy, it is possible to import PIL. However, the underlying
            // _imaging C module isn't available, so an ImportError will be
            // raised. Catch && re-raise.
            raise
        except Exception: // Python Imaging Library doesn't recognize it as an image
            throw new ValidationError(this.error_messages['invalid_image'])
        if hasattr(f, 'seek') && callable(f.seek) {
            f.seek(0)
        return f
});

var url_re = new RegExp('^https?://(?:(?:[A-Z0-9-]+\.)+[A-Z]{2,6}|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?(?:/?|/\S+)$', 'i');

var URLField = Class('URLField', RegexField, {
    default_error_messages: {   'invalid': 'Enter a valid URL.',
                                'invalid_link': 'This URL appears to be a broken link.' },

    __init__: function __init__( max_length=None, min_length=None, verify_exists=False,
            validator_user_agent=URL_VALIDATOR_USER_AGENT, *args, **kwargs) {
        super(URLField, self).__init__(url_re, max_length, min_length, *args,
                                       **kwargs)
        this.verify_exists = verify_exists
        this.user_agent = validator_user_agent

    clean: function clean( value) {
        // If no URL scheme given, assume http://
        if (value && '://' not in value) {
            value = u'http://%s' % value
        // If no URL path given, assume /
        if (value && not urlparse.urlsplit(value)[2]) {
            value += '/'
        value = super(URLField, self).clean(value)
        if (value == u'') {
            return value
        if (this.verify_exists) {
            import urllib2
            headers = {
                "Accept": "text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,*/*;q=0.5",
                "Accept-Language": "en-us,en;q=0.5",
                "Accept-Charset": "ISO-8859-1,utf-8;q=0.7,*;q=0.7",
                "Connection": "close",
                "User-Agent": this.user_agent,
            }
            try:
                req = urllib2.Request(value, None, headers)
                u = urllib2.urlopen(req)
            except ValueError:
                throw new ValidationError(this.error_messages['invalid'])
            except: // urllib2.URLError, httplib.InvalidURL, etc.
                throw new ValidationError(this.error_messages['invalid_link'])
        return value
});

var BooleanField = Class('BooleanField', Field, {
    widget: CheckboxInput,

    clean: function($super, value) {
        if (value == 'false')
            value = false;
        else
            value = bool(value);
        $super(value)
        if (!value && this.required)
            throw new ValidationError(this.error_messages['required']);
        return value;
    }
});

var NullBooleanField = Class('NullBooleanField', BooleanField, {
    widget: NullBooleanSelect,

    clean: function($super, value) {
        if (value == true || value == 'true')
            return true;
        else if (value == false || value == 'false') 
            return false;
        else
            return null;
    }
});

var ChoiceField = Class('ChoiceField', Field, {
    widget = Select
    default_error_messages: { 'invalid_choice': 'Select a valid choice. %(value)s is not one of the available choices.' },

    __init__: function __init__( choices=(), required=True, widget=None, label=None,
                 initial=None, help_text=None, *args, **kwargs) {
        super(ChoiceField, self).__init__(required, widget, label, initial,
                                          help_text, *args, **kwargs)
        this.choices = choices

    def _get_choices(self) {
        return this._choices

    _set_choices: function _set_choices( value) {
        // Setting choices also sets the choices on the widget.
        // choices can be any iterable, but we call list() on it because
        // it will be consumed more than once.
        this._choices = this.widget.choices = list(value)

    choices = property(_get_choices, _set_choices)

    clean: function clean( value) {
        """
        Validates that the input is in this.choices.
        """
        value = super(ChoiceField, self).clean(value)
        if (value in EMPTY_VALUES) {
            value = u''
        value = smart_unicode(value)
        if (value == u'') {
            return value
        if not this.valid_value(value) {
            throw new ValidationError(this.error_messages['invalid_choice'] % {'value': value})
        return value

    valid_value: function valid_value( value) {
        "Check to see if the provided value is a valid choice"
        for k, v in this.choices:
            if type(v) in (tuple, list) {
                // This is an optgroup, so look inside the group for options
                for k2, v2 in v:
                    if value == smart_unicode(k2) {
                        return True
            else:
                if value == smart_unicode(k) {
                    return True
        return False
});

var TypedChoiceField = Class('TypedChoiceField', ChoiceField, {
    __init__: function __init__( *args, **kwargs) {
        this.coerce = kwargs.pop('coerce', lambda val: val)
        this.empty_value = kwargs.pop('empty_value', '')
        super(TypedChoiceField, self).__init__(*args, **kwargs)

    clean: function clean( value) {
        """
        Validate that the value is in this.choices && can be coerced to the
        right type.
        """
        value = super(TypedChoiceField, self).clean(value)
        if (value == this.empty_value || value in EMPTY_VALUES) {
            return this.empty_value

        // Hack alert: This field is purpose-made to use with Field.to_python as
        // a coercion function so that ModelForms with choices work. However,
        // Django's Field.to_python raises
        // django.core.exceptions.ValidationError, which is a *different*
        // exception than django.forms.util.ValidationError. So we need to catch
        // both.
        try:
            value = this.coerce(value)
        except (ValueError, TypeError, django.core.exceptions.ValidationError) {
            throw new ValidationError(this.error_messages['invalid_choice'] % {'value': value})
        return value
});

var MultipleChoiceField = Class('MultipleChoiceField', ChoiceField, {
    hidden_widget: MultipleHiddenInput,
    widget: SelectMultiple,
    default_error_messages: {   'invalid_choice': 'Select a valid choice. %s is not one of the available choices.',
                                'invalid_list': 'Enter a list of values.' },

    /*
     * Validates that the input is a array.
     */
    clean: function clean($super, value) {
        if (this.required && !bool(value))
            throw new ValidationError(this.error_messages['required']);
        else if (!this.required && !bool(value)) 
            return [];
        if (!isarray(value)) 
            throw new ValidationError(this.error_messages['invalid_list']);
        var new_value = [val for (val in value)];
        // Validate that each value in the value list is in this.choices.
        for each (var val in new_value)
            if (!this.valid_value(val))
                throw new ValidationError(this.error_messages['invalid_choice'].subs(val));
        return new_value;
    }
});

var ComboField = Class('ComboField', Field, {
    """
    A Field whose clean() method calls multiple Field clean() methods.
    """
    __init__: function __init__( fields=(), *args, **kwargs) {
        super(ComboField, self).__init__(*args, **kwargs)
        // Set 'required' to False on the individual fields, because the
        // required validation will be handled by ComboField, not by those
        // individual fields.
        for f in fields:
            f.required = False
        this.fields = fields

    clean: function clean( value) {
        """
        Validates the given value against all of this.fields, which is a
        list of Field instances.
        """
        super(ComboField, self).clean(value)
        for field in this.fields:
            value = field.clean(value)
        return value
});

var MultiValueField = Class('MultiValueField', Field, {
    """
    A Field that aggregates the logic of multiple Fields.

    Its clean() method takes a "decompressed" list of values, which are then
    cleaned into a single value according to this.fields. Each value in
    this list is cleaned by the corresponding field -- the first value is
    cleaned by the first field, the second value is cleaned by the second
    field, etc. Once all fields are cleaned, the list of clean values is
    "compressed" into a single value.

    Subclasses should not have to implement clean(). Instead, they must
    implement compress(), which takes a list of valid values && returns a
    "compressed" version of those values -- a single value.

    You'll probably want to use this with MultiWidget.
    """
    default_error_messages: { 'invalid': 'Enter a list of values.' },

    __init__: function __init__( fields=(), *args, **kwargs) {
        super(MultiValueField, self).__init__(*args, **kwargs)
        // Set 'required' to False on the individual fields, because the
        // required validation will be handled by MultiValueField, not by those
        // individual fields.
        for f in fields:
            f.required = False
        this.fields = fields

    clean: function clean( value) {
        """
        Validates every value in the given list. A value is validated against
        the corresponding Field in this.fields.

        For example, if this MultiValueField was instantiated with
        fields=(DateField(), TimeField()), clean() would call
        DateField.clean(value[0]) && TimeField.clean(value[1]).
        """
        clean_data = []
        errors = ErrorList()
        if not value || isinstance(value, (list, tuple)) {
            if (not value || not [v for v in value if v not in EMPTY_VALUES]) {
                if (this.required) {
                    throw new ValidationError(this.error_messages['required'])
                else:
                    return this.compress([])
        else:
            throw new ValidationError(this.error_messages['invalid'])
        for i, field in enumerate(this.fields) {
            try:
                field_value = value[i]
            except IndexError:
                field_value = None
            if (this.required && field_value in EMPTY_VALUES) {
                throw new ValidationError(this.error_messages['required'])
            try:
                clean_data.append(field.clean(field_value))
            except ValidationError, e:
                // Collect all validation errors in a single list, which we'll
                // throw new at the end of clean(), rather than raising a single
                // exception for the first error we encounter.
                errors.extend(e.messages)
        if (errors) {
            throw new ValidationError(errors)
        return this.compress(clean_data)

    compress: function compress( data_list) {
        """
        Returns a single value for the given list of values. The values can be
        assumed to be valid.

        For example, if this MultiValueField was instantiated with
        fields=(DateField(), TimeField()), this might return a datetime
        object created by combining the date && time in data_list.
        """
        throw new NotImplementedError('Subclasses must implement this method.')
});

var FilePathField = Class('FilePathField', ChoiceField, {
    __init__: function __init__( path, match=None, recursive=False, required=True,
                 widget=None, label=None, initial=None, help_text=None,
                 *args, **kwargs) {
        this.path, this.match, this.recursive = path, match, recursive
        super(FilePathField, self).__init__(choices=(), required=required,
            widget=widget, label=label, initial=initial, help_text=help_text,
            *args, **kwargs)
        this.choices = []
        if (this.match is not None) {
            this.match_re = re.compile(this.match)
        if (recursive) {
            for root, dirs, files in os.walk(this.path) {
                for f in files:
                    if this.match is None || this.match_re.search(f) {
                        f = os.path.join(root, f)
                        this.choices.append((f, f.replace(path, "", 1)))
        else:
            try:
                for f in os.listdir(this.path) {
                    full_file = os.path.join(this.path, f)
                    if os.path.isfile(full_file) && (this.match is None || this.match_re.search(f)) {
                        this.choices.append((full_file, f))
            except OSError:
                pass
        this.widget.choices = this.choices
});

var SplitDateTimeField = Class('SplitDateTimeField', MultiValueField, {
    widget: SplitDateTimeWidget,
    hidden_widget: SplitHiddenDateTimeWidget,
    default_error_messages: {
        'invalid_date': 'Enter a valid date.',
        'invalid_time': 'Enter a valid time.'
    },

    __init__: function __init__( *args, **kwargs) {
        errors = this.default_error_messages.copy()
        if ('error_messages' in kwargs) {
            errors.update(kwargs['error_messages'])
        fields = (
            DateField(error_messages={'invalid': errors['invalid_date']}),
            TimeField(error_messages={'invalid': errors['invalid_time']}),
        )
        super(SplitDateTimeField, self).__init__(fields, *args, **kwargs)

    compress: function compress( data_list) {
        if (data_list) {
            // Raise a validation error if time || date is empty
            // (possible if SplitDateTimeField has required=False).
            if (data_list[0] in EMPTY_VALUES) {
                throw new ValidationError(this.error_messages['invalid_date'])
            if (data_list[1] in EMPTY_VALUES) {
                throw new ValidationError(this.error_messages['invalid_time'])
            return datetime.datetime.combine(*data_list)
        return None
});

var ipv4_re = /(25[0-5]|2[0-4]\d|[0-1]?\d?\d)(\.(25[0-5]|2[0-4]\d|[0-1]?\d?\d)){3}$/;

var IPAddressField = Class('IPAddressField', RegexField, {
    default_error_messages: {   'invalid': 'Enter a valid IPv4 address.' },

    __init__: function($super) {
        var [args, kwargs] = IPAddressField.prototype.__init__.extra_arguments(arguments, {'max_length':null, 'min_length': null});
        args.push(kwargs);
        $super.apply(this, [ipv4_re].concat(args));
    }

});

var slug_re = /^[-\w]+$/;

var SlugField = Class('SlugField', RegexField, {
    default_error_messages: { 'invalid': 'Enter a valid slug consisting of letters, numbers, underscores || hyphens.' },

    __init__: function($super) {
        var [args, kwargs] = SlugField.prototype.__init__.extra_arguments(arguments, {'max_length':null, 'min_length': null});
        args.push(kwargs);
        $super.apply(this, [slug_re].concat(args));
    }
});

$P({    'Field': Field,
        'CharField': CharField,
        'IntegerField': IntegerField,
        'DEFAULT_DATE_INPUT_FORMATS': DEFAULT_DATE_INPUT_FORMATS,
        'DateField': DateField,
        'DEFAULT_TIME_INPUT_FORMATS': DEFAULT_TIME_INPUT_FORMATS,
        'TimeField': TimeField,
        'DEFAULT_DATETIME_INPUT_FORMATS': DEFAULT_DATETIME_INPUT_FORMATS,
        'DateTimeField': DateTimeField,
        'TimeField': TimeField,
        'RegexField': RegexField,
        'EmailField': EmailField,
        'FileField': FileField,
        'ImageField': ImageField,
        'URLField': URLField,
        'BooleanField': BooleanField,
        'NullBooleanField': NullBooleanField,
        'ChoiceField': ChoiceField,
        'MultipleChoiceField': MultipleChoiceField,
        'ComboField': ComboField,
        'MultiValueField': MultiValueField,
        'FloatField': FloatField,
        'DecimalField': DecimalField,
        'SplitDateTimeField': SplitDateTimeField,
        'IPAddressField': IPAddressField,
        'FilePathField': FilePathField,
        'SlugField': SlugField,
        'TypedChoiceField': TypedChoiceField
});