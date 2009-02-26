$D('HTML Widget classes');
$L('copy', 'copy');
$L('doff.conf', 'settings');
$L('doff.forms.util', 'flatatt');
//TODO: implementar getattr, setattr, property
/*
me quede pensadon sobre getattr, setattr y property 
no es mala idea implementarlo en protopy
porque tienen una pequeña vuelta de rosca que estaria bueno que se haga en ese lugar
para no estar jugando tanto con los algo.prototype[cacho] = function (){}
creo que soluciona tambien mi probamas con los bind, en una buena parte :)
de las funciones
porque si estas obteniendo una funcion de otro objecto ejemplo pepe = {'algo': function (){}}
getattr(pepe, 'algo');
tenes que devolver la funcion bindeada con el objeto sino el scope cambia y haces moco
luego si se la queres poer a otro objeto otro = {}
setattr(otro, 'algo', getattr(pepe, 'algo'))
tenes que rebindear la funcion con otro
se ve?
a eso sumale, que pasa si no es una funcion o que pasa si es un propery o cosas asi
*/
from itertools import chain
from django.utils.datastructures import MultiValueDict, MergeDict
from django.utils.html import escape, conditional_escape
from django.utils.translation import ugettext
from django.utils.encoding import StrAndUnicode, force_unicode
from django.utils.safestring import mark_safe
from django.utils import datetime_safe
from datetime import time

from urlparse import urljoin
//TODO: crear urlparse e itertools

var MEDIA_TYPES = ['css','js'];

var Media = type('Media', {
    __init__: function(media) {
        arguments = new Arguments(arguments);
        if (media)
            media_attrs = media;
        else
            media_attrs = arguments.kwargs

        this._css = {};
        this._js = [];

        for each (var name in MEDIA_TYPES)
            getattr(this, 'add_' + name)(media_attrs[name] || null);
    },

    __str__: function() {
        return this.render();
    },

    render: function() {
        var result = []
        for each (var name in MEDIA_TYPES) {
            result = result.concat(getattr(this, 'render_' + name)());
        }
        return result.join('\n');
    },

    render_js: function() {
        return ['<script type="text/javascript" src="%s"></script>'.subs(this.absolute_path(path) for each (path in this._js)];
    },

    render_css: function() {
        // To keep rendering order consistent, we can't just iterate over items().
        // We need to sort the keys, and iterate over the sorted list.
        var media = keys(this._css);
        media.sort();
        return  [
                    ['<link href="%s" type="text/css" media="%s" rel="stylesheet" />'.subs(this.absolute_path(path), medium) for each (path in this._css[medium])]
                for each (medium in media)];
    },

    absolute_path: function(path) {
        //TODO: cambiar en protopy los starts_withs por los pythonicos
        if (path.startswith('http://') || path.startswith('https://') || path.startswith('/'))
            return path;
        return urljoin(settings.MEDIA_URL, path);
    },

    get: function(name) {
        //Returns a Media object that only contains media of the given type
        if (include(MEDIA_TYPES, name))
            return new Media(this['_' + name]);
        throw new KeyError('Unknown media type "%s"'.subs(name));
    },

    add_js: function(data) {
        if (bool(data))
            this._js = this._js.concat([path for each (path in data) if (!include(this._js, path))]);
    },

    add_css: function(data) {
        if (bool(data))
            //TODO: implementar iterms como builtin
            for each ([medium, paths] in items(data)) {
                this._css[medium] = this._css[medium] || [];
                this._css[medium] = this._css[medium].concat([path for each (path in paths) if (!include(this._css[medium], path))]);
            }
    },

    __add__(other)
        var combined = new Media();
        for each (name in MEDIA_TYPES) {
            getattr(combined, 'add_' + name)(getattr(this, '_' + name, null));
            getattr(combined, 'add_' + name)(getattr(other, '_' + name, null));
        }
        return combined;
});

function media_property(cls) {
    function _media()
        // Get the media property of the superclass, if it exists
        if hasattr(super(cls, this), 'media')
            base = super(cls, this).media
        else
            base = new Media();

        // Get the media definition for this class
        var definition = getattr(cls, 'Media', null);
        if (definition) {
            var extend = getattr(definition, 'extend', true);
            if (extend) {
                if (extend == true)
                    m = base;
                else
                    m = new Media();
                    for each (medium in extend)
                        m = m.__add__(base[medium]);
                return m.__add__(new Media(definition));
            } else {
                return new Media(definition);
            }
        } else {
            return base;
        }
    return property(_media);
}

var Widget = type('Widget', {
    //Static
    '__new__': function __new__(name, bases, attrs) {
        var new_class = super(object, cls).__new__(name, bases, attrs);
        if (!('media' in attrs))
            new_class.media = media_property(new_class);
        return new_class;
    },
    /* 
     * Returns the HTML ID attribute of this Widget for use by a <label>,
     * given the ID of the field. Returns None if no ID is available.
     * This hook is necessary because some widgets have multiple HTML
     * elements and, thus, multiple IDs. In that case, this method should
     * return an ID value that corresponds to the first ID in the widget's tags.
     */
    id_for_label: function(id_) {
        return id_;
    }
}, {
    is_hidden: false,          // Determines whether this corresponds to an <input type="hidden">.
    needs_multipart_form: false // Determines does this widget need multipart-encrypted form

    def __init__(self, attrs=None):
        if attrs is not None:
            self.attrs = attrs.copy()
        else:
            self.attrs = {}

    def __deepcopy__(self, memo):
        obj = copy.copy(self)
        obj.attrs = self.attrs.copy()
        memo[id(self)] = obj
        return obj

    def render(self, name, value, attrs=None):
        """
        Returns this Widget rendered as HTML, as a Unicode string.

        The 'value' given is not guaranteed to be valid input, so subclass
        implementations should program defensively.
        """
        raise NotImplementedError

    def build_attrs(self, extra_attrs=None, **kwargs):
        "Helper function for building an attribute dictionary."
        attrs = new Dict(self.attrs, **kwargs)
        if extra_attrs:
            attrs.update(extra_attrs)
        return attrs

    def value_from_datadict(self, data, files, name):
        """
        Given a dictionary of data and this widget's name, returns the value
        of this widget. Returns None if it's not provided.
        """
        return data.get(name, None)

    def _has_changed(self, initial, data):
        """
        Return True if data differs from initial.
        """
        # For purposes of seeing whether something has changed, None is
        # the same as an empty string, if the data or inital value we get
        # is None, replace it w/ u''.
        if data is None:
            data_value = u''
        else:
            data_value = data
        if initial is None:
            initial_value = u''
        else:
            initial_value = initial
        if force_unicode(initial_value) != force_unicode(data_value):
            return True
        return False
});

/* 
 * Base class for all <input> widgets (except type='checkbox' and
 * type='radio', which are special).
 */
var Input = type('Input', Widget, {
    input_type: null, // Subclasses must define this.

    render: function(name, value, attrs) {
        if (!value) value = '';
        var final_attrs = this.build_attrs(attrs, {'type': this.input_type, 'name':name});
        if (value != '')
            // Only add the 'value' attribute if a value is non-empty.
            final_attrs['value'] = value;
        return '<input%s />'.subs(flatatt(final_attrs));
    }
});

var TextInput = type('TextInput', Input, {
    input_type: 'text'
});

var PasswordInput = type('PasswordInput', Input, {
    input_type: 'password',

    __init__: function(attrs, render_value) {
        render_value = render_value || true;
        super(Input, this).__init__(attrs);
        this.render_value = render_value;
    },

    render: function(name, value, attrs) {
        if (!this.render_value) value = null;
        return super(Input, this).render(name, value, attrs);
    }
});

var HiddenInput = type('HiddenInput', Input, {
    input_type:'hidden',
    is_hidden: true
});

/* 
 * A widget that handles <input type="hidden"> for fields that have a list of values.
 */
var MultipleHiddenInput = type('MultipleHiddenInput', HiddenInput, {
    __init__: function(attrs, choices) {
        super(HiddenInput, this).__init__(attrs);
        // choices can be any iterable
        this.choices = choices;
    },

    render: function(name, value, attrs, choices) {
        if (!value) value = [];
        var final_attrs = this.build_attrs(attrs, {'type':this.input_type, 'name':name});
        return ['<input%s />'.subs(flatatt(extend({}, {'value':v}, final_attrs))) for each (v in value)].join('\n');
    },

    value_from_datadict: function(data, files, name) {
        if isinstance(data, [MultiValueDict, MergeDict])
            return data.getlist(name);
        return data.get(name, null);
    }
});

var FileInput = type('FileInput', Input, {
    input_type: 'file',
    needs_multipart_form: true,

    render: function(name, value, attrs) {
        return super(Input, this).render(name, null, attrs)
    },

    value_from_datadict: function(data, files, name) {
        //File widgets take data from FILES, not POST
        return files.get(name, null);
    },

    _has_changed: function(initial, data) {
        if (!data)
            return false;
        return true;
    }
});

var Textarea = type('Textarea', Widget, {
    __init__: function(attrs) {
        // The 'rows' and 'cols' attributes are required for HTML correctness.
        this.attrs = {'cols': '40', 'rows': '10'};
        extend(this.attrs, attrs || {});
    },

    render: function(name, value, attrs) {
        if (!value) value = '';
        var final_attrs = this.build_attrs(attrs, {'name':name});
        return '<textarea%s>%s</textarea>'.subs(flatatt(final_attrs), conditional_escape(value));
    }
});

var DateTimeInput = type('DateTimeInput', Input, {
    input_type: 'text',
    format: '%Y-%m-%d %H:%M:%S',     // '2006-10-25 14:30:59'

    __init__: function(attrs, format) {
        super(Input, this).__init__(attrs);
        if (format)
            this.format = format;
    },

    render: function(name, value, attrs) {
        if (!value) value = ''
        else if (hasattr(value, 'strftime')) {
            value = datetime_safe.new_datetime(value);
            value = value.strftime(this.format);
        }
        return super(Input, this).render(name, value, attrs);
});

var TimeInput = type('TimeInput', Input, {
    input_type: 'text',

    render: function(name, value, attrs) {
        if (!value) value = '';
        else if (isinstance(value, time))
            value = value.replace(microsecond=0);
        return super(Input, this).render(name, value, attrs);
    }
});

var CheckboxInput = type('CheckboxInput', Widget, {
    __init__: function(attrs, check_test) {
        super(Widget, this).__init__(attrs)
        // check_test is a callable that takes a value and returns True
        // if the checkbox should be checked for that value.
        this.check_test = check_test || bool;
    },

    render: function(name, value, attrs) {
        var final_attrs = this.build_attrs(attrs, {'type':'checkbox', 'name':name});
        try {
            result = this.check_test(value);
        } catch (e) { // Silently catch exceptions
            result = false;
        }
        if (result) final_attrs['checked'] = 'checked';
        if (!include(['', true, false, null], value))
            // Only add the 'value' attribute if a value is non-empty.
            final_attrs['value'] = value;
        return '<input%s />'.subs(flatatt(final_attrs));
    },

    value_from_datadict: function(data, files, name) {
        if (!include(data, name))
            // A missing value means False because HTML form submission does not
            // send results for unselected checkboxes.
            return false;
        return super(Widget, this).value_from_datadict(data, files, name);
    },

    _has_changed: function(initial, data) {
        // Sometimes data or initial could be None or u'' which should be the
        // same thing as False.
        return bool(initial) != bool(data);
    }
});

var Select = type('Select', Widget, {
    __init__: function(attrs, choices) {
        super(Widget, this).__init__(attrs);
        // choices can be any iterable, but we may need to render this widget
        // multiple times. Thus, collapse it into a list so it can be consumed
        // more than once.
        this.choices = array(choices);
    },

    render: function(name, value, attrs, choices) {
        if (!value) value = '';
        var final_attrs = this.build_attrs(attrs, {'name':name});
        var output = ['<select%s>'.subs(flatatt(final_attrs))];
        var options = this.render_options(choices, [value]);
        if (bool(options))
            output.push(options);
        output.push('</select>');
        return output.join('\n');
    },

    render_options: function(choices, selected_choices) {
        function render_option(option_value, option_label) {
            var selected_html = include(selected_choices, option_value) && ' selected="selected"' || ''
            return '<option value="%s"%s>%s</option>'.subs(escape(option_value), selected_html, conditional_escape(option_label));
        }
        // Normalize to strings.
        var selected_choices = new Set([v for (v in selected_choices)]);
        var output = [];
        for ([option_value, option_label] in chain(this.choices, choices)) {
            if (isinstance(option_label, Array)) {
                output.push('<optgroup label="%s">'.subs(escape(option_value)));
                for each (var option in option_label)
                    output.push(render_option(option[0], option[1]));
                output.append('</optgroup>');
            } else {
                output.push(render_option(option_value, option_label));
        }
        return output.join('\n');
    }
});
/* 
 * A Select Widget intended to be used with NullBooleanField.
 */
var NullBooleanSelect = type('NullBooleanSelect', Select, {
    __init__: function(attrs) {
        var choices = [['1', ugettext('Unknown')], ['2', ugettext('Yes')], ['3', ugettext('No')]];
        super(Select, this).__init__(attrs, choices);
    },

    render: function(name, value, attrs, choices) {
        value = {true: '2', false: '3', '2': '2', '3': '3'}[value] || '1'; 
        return super(Select, this).render(name, value, attrs, choices);
    },

    value_from_datadict: function(data, files, name) {
        var value = data.get(name, null);
        return {'2': true, '3': false, true: true, false: false}[value] || null;
    },

    _has_changed: function(initial, data) {
        // Sometimes data or initial could be None or u'' which should be the
        // same thing as False.
        return bool(initial) != bool(data);
    }
});

var SelectMultiple = type('SelectMultiple', Select, {
    render: function(name, value, attrs, choices) {
        if (!value) value = [];
        var final_attrs = this.build_attrs(attrs, {'name':name});
        var output = ['<select multiple="multiple"%s>'.subs(flatatt(final_attrs)];
        var options = this.render_options(choices, value);
        if (bool(options))
            output.push(options);
        output.push('</select>');
        return output.join('\n');
    },

    value_from_datadict: function(data, files, name) {
        if isinstance(data, [MultiValueDict, MergeDict]):
            return data.getlist(name);
        return data.get(name, null);
    },

    _has_changed: function(initial, data) {
        if (!initial)
            initial = [];
        if (!data)
            data = [];
        if (len(initial) != len(data))
            return true;
        for each ([value1, value2] in zip(initial, data))
            if (value1 != value2)
                return true;
        return false;
    }
});

/* 
 * An object used by RadioFieldRenderer that represents a single <input type='radio'>.
 */
var RadioInput = type('RadioInput', {
    __init__: function(name, value, attrs, choice, index) {
        this.name = name;
        this.value = value;
        this.attrs = attrs;
        this.choice_value = choice[0];
        this.choice_label = choice[1];
        this.index = index;
    },

    __str__: function() {
        var label_for = ''
        if ('id' in this.attrs)
            var label_for = ' for="%s_%s"'.subs(this.attrs['id'], this.index);
        var choice_label = conditional_escape(thsi.choice_label);
        return '<label%s>%s %s</label>'.subs(label_for, this.tag(), choice_label);
    },

    is_checked: function() {
        return this.value == this.choice_value;
    },

    tag: function() {
        if ('id' in this.attrs)
            this.attrs['id'] = '%s_%s'.subs(this.attrs['id'], this.index);
        var final_attrs = extend({}, this.attrs, {'type':'radio', 'name':this.name, 'value':this.choice_value});
        if (this.is_checked())
            final_attrs['checked'] = 'checked';
        return '<input%s />'.subs(flatatt(final_attrs));
    }
});
/*
 * An object used by RadioSelect to enable customization of radio widgets.
 */
var RadioFieldRenderer = type('RadioFieldRenderer', {
    __init__: function(name, value, attrs, choices) {
        this.name = name;
        this.value = value;
        this.attrs = attrs;
        this.choices = choices;
    },

    __iter__: function() {
        for ([i, choice] in Iterator(this.choices))
            yield new RadioInput(this.name, this.value, copy(this.attrs), choice, i);
    },

    __getitem__: function(this, idx) {
        var choice = this.choices[idx] // Let the IndexError propogate
        return new RadioInput(this.name, this.value, copy(this.attrs), choice, idx);
    },

    __str__:function() {
        return this.render();
    },

    render: function() {
        //Outputs a <ul> for this set of radio fields.
        return '<ul>\n%s\n</ul>'.subs(['<li>%s</li>'.subs(w) for (w in this)].join('\n'));
    }
});

var RadioSelect = type('RadioSelect', Select, {
    //Static
    id_for_label: function(id_) {
        // RadioSelect is represented by multiple <input type="radio"> fields,
        // each of which has a distinct ID. The IDs are made distinct by a "_X"
        // suffix, where X is the zero-based index of the radio field. Thus,
        // the label for a RadioSelect should reference the first one ('_0').
        if (id_)
            id_ += '_0';
        return id_;
    }
}, {
    renderer: RadioFieldRenderer,

    __init__: function() {
        // Override the default renderer if we were passed one.
        arguments = new Arguments(arguments);
        var renderer = arguments.kwargs['renderer'] || null;
        delete arguments.kwargs['renderer'];
        if (renderer)
            this.renderer = renderer;
        super(Select, this).__init__(arguments);
    },

    get_renderer: function(name, value, attrs, choices) {
        //Returns an instance of the renderer.
        if (!value) value = '';
        var str_value = str(value); // Normalize to string.
        var final_attrs = this.build_attrs(attrs);
        var choices = array(chain(this.choices, choices))
        return this.renderer(name, str_value, final_attrs, choices);
    },

    render: function(name, value, attrs, choices) {
        return this.get_renderer(name, value, attrs, choices).render();
    }
});

var CheckboxSelectMultiple = type('CheckboxSelectMultiple', SelectMultiple, {
    //Static
    id_for_label: function(id_) {
        // See the comment for RadioSelect.id_for_label()
        if (id_)
            id_ += '_0';
        return id_;
    }
},{
    render: function(name, value, attrs, choices) {
        if (!value) value = [];
        var has_id = attrs && 'id' in attrs;
        var final_attrs = this.build_attrs(attrs, {'name':name});
        var output = ['<ul>'];
        // Normalize to strings
        var str_values = new Set([v for (v in value)]);
        for ([i, [option_value, option_label]] in Iterator(chain(this.choices, choices))) {
            // If an ID attribute was given, add a numeric index as a suffix,
            // so that the checkboxes don't all have the same ID attribute.
            if (has_id) {
                extend(final_attrs, {'id':'%s_%s'.subs(attrs['id'], i)});
                label_for = ' for="%s"'.subs(final_attrs['id']);
            } else {
                label_for = '';
            }

            var cb = new CheckboxInput(final_attrs, function (value) { return include(str_values, value)} );
            
            rendered_cb = cb.render(name, option_value)
            option_label = conditional_escape(option_label);
            output.push('<li><label%s>%s %s</label></li>'.subs(label_for, rendered_cb, option_label))
        }
        output.push('</ul>');
        return output.join('\n');
    }
});

/*
    A widget that is composed of multiple widgets.

    Its render() method is different than other widgets', because it has to
    figure out how to split a single value for display in multiple widgets.
    The ``value`` argument can be one of two things:

        * A list.
        * A normal value (e.g., a string) that has been "compressed" from
          a list of values.

    In the second case -- i.e., if the value is NOT a list -- render() will
    first "decompress" the value into a list before rendering it. It does so by
    calling the decompress() method, which MultiWidget subclasses must
    implement. This method takes a single "compressed" value and returns a
    list.

    When render() does its HTML rendering, each value in the list is rendered
    with the corresponding widget -- the first value is rendered in the first
    widget, the second value is rendered in the second widget, etc.

    Subclasses may implement format_output(), which takes the list of rendered
    widgets and returns a string of HTML that formats them any way you'd like.

    You'll probably want to use this class with MultiValueField.
*/

var MultiWidget = type('MultiWidget', Widget, {
    //Static 
    id_for_label: function(id_) {
        // See the comment for RadioSelect.id_for_label()
        if (id_)
            id_ += '_0';
        return id_;
    }
},{
    __init__: function(widgets, attrs) {
        this.widgets = [isinstance(w, type) && w() || w for each (w in widgets)];
        super(Widget, this).__init__(attrs);
    },

    render: function(name, value, attrs) {
        // value is a list of values, each corresponding to a widget in self.widgets.
        if (!isinstance(value, Array))
            value = this.decompress(value);
        var output = [];
        var final_attrs = this.build_attrs(attrs);
        var id_ = final_attrs['id'] || null;
        for ([i, widget] in Iterator(this.widgets)) {
            try {
                widget_value = value[i];
            } catch (e) {
                widget_value = null;
            }
            if (id_)
                extend(final_attrs, {'id':'%s_%s'.subs(id_, i)});
            output.push(widget.render(name + '_%s'.subs(i), widget_value, final_attrs));
        }
        return this.format_output(output);
    },

    value_from_datadict: function(data, files, name) {
        return [widget.value_from_datadict(data, files, name + '_%s'.subs(i)) for ([i, widget] in Iterator(this.widgets))];
    },

    _has_changed: function(initial, data) {
        if (!initial)
            initial = ['' for (x in range(0, len(data)))];
        else
            if (!isinstance(initial, Array))
                initial = this.decompress(initial);
        for ([widget, initial, data] in zip(this.widgets, initial, data))
            if (widget._has_changed(initial, data))
                return true;
        return false;
    },

    /*
        Given a list of rendered widgets (as strings), returns a Unicode string
        representing the HTML for the whole lot.

        This hook allows you to format the HTML design of the widgets, if needed.
     */
    format_output: function(rendered_widgets) {
        return rendered_widgets.join('');
    },

    /* 
        Returns a list of decompressed values for the given compressed value.
        The given value can be assumed to be valid, but not necessarily
        non-empty.
     */
    decompress: function(value) {
        throw new NotImplementedError('Subclasses must implement this method.');
    },

    get media() {
        //Media for a multiwidget is the combination of all media of the subwidgets"
        media = new Media()
        for (w in this.widgets)
            media = media.__add__(w.media);
        return media;
    }
});

/*
 * A Widget that splits datetime input into two <input type="text"> boxes.
 */
var SplitDateTimeWidget = type('SplitDateTimeWidget', MultiWidget, {
    __init__: function(attrs) {
        var widgets = [new TextInput(attrs), new TextInput(attrs)];
        super(MultiWidget, this).__init__(widgets, attrs);
    },

    decompress: function(value) {
        if (value)
            return [value.date(), value.time().replace(microsecond=0)];
        return [null, null];
    }
});
/*
 * A Widget that splits datetime input into two <input type="hidden"> inputs.
 */ 
var SplitHiddenDateTimeWidget = type('SplitHiddenDateTimeWidget', SplitDateTimeWidget, {
    '__init__': function __init__(attrs){
        var widgets = [new HiddenInput({'attrs':attrs}), new HiddenInput({'attrs':attrs})];
        super(SplitDateTimeWidget, this).__init__(widgets, attrs);
    }
});

$P({    'Media': Media,
        'MediaDefiningClass': MediaDefiningClass,
        'Widget': Widget,
        'TextInput': TextInput,
        'PasswordInput': PasswordInput,
        'HiddenInput': HiddenInput,
        'MultipleHiddenInput': MultipleHiddenInput,
        'FileInput': FileInput,
        'DateTimeInput': DateTimeInput,
        'TimeInput': TimeInput,
        'Textarea': Textarea,
        'CheckboxInput': CheckboxInput,
        'Select': Select,
        'NullBooleanSelect': NullBooleanSelect,
        'SelectMultiple': SelectMultiple,
        'RadioSelect': RadioSelect,
        'CheckboxSelectMultiple': CheckboxSelectMultiple,
        'MultiWidget': MultiWidget,
        'SplitDateTimeWidget': SplitDateTimeWidget
});