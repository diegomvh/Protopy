/* 
 * Convert a dictionary of attributes to a single string.
 * The returned string will contain a leading space followed by key="value",
 * XML-style pairs.  It is assumed that the keys do not need to be XML-escaped.
 * If the passed dictionary is empty, then return an empty string.
 */

function flatatt(attrs) {
    return [' %s="%s"'.subs(k, v) for each ([k, v] in zip(keys(attrs), values(attrs)))].join('');
}

/*
 * A collection of errors that knows how to display itself in various formats.
 * The dictionary keys are the field names, and the values are the errors.
 */
var ErrorDict = type('ErrorDict', [ Dict ], {
    __str__: function() {
        return this.as_ul();
    },

    as_ul: function() {
        if (!bool(this)) return '';
        return '<ul class="errorlist">%s</ul>'.subs(['<li>%s%s</li>'.subs(k, v) for each ([k, v] in this.items())].join(''));
    },

    as_text: function() {
        if (!bool(this)) return '';
        return ['* %s\n%s'.subs(k, ['  * %s'.subs(i) for (i in v)].join('\n')) for each ([k, v] in this.items())].join('\n');
    }
});

/*
 * A collection of errors that knows how to display itself in various formats.
 */
var ErrorList = type('ErrorList', [ object ], {
    __init__: function(errors) {
        this.errors = errors || [];
    },

    __str__: function() {
        return this.as_ul();
    },

    __nonzero__: function() {
        return bool(this.errors);
    },
    
    __iter__: function() {
        for each (var e in this.errors)
            yield e;
    },

    push: function(error) {
        this.errors.push(error);
    },

    pop: function() {
        return this.errors.pop();
    },

    concat: function(errors) {
        return this.errors.concat(errors);
    },

    as_ul: function() {
        if (!bool(this)) return '';
        return '<ul class="errorlist">%s</ul>'.subs(['<li>%s</li>'.subs(e) for each (e in this.errors)].join(''));
    },

    as_text: function() {
        if (!bool(this)) return '';
        return ['* %s'.subs(e) for each (e in this.errors)].join('\n');
    },
    
    __repr__: function() {
        return repr([e for each (e in this.errors)]);
    }
});
/*
 * ValidationError can be passed any object that can be printed (usually a string) or a list of objects.
 */
var ValidationError = type('ValidationError', [ Exception ], {
    __init__: function(message) {
        if (isinstance(message, Array))
            this.messages = new ErrorList(message);
        else
            this.messages = new ErrorList([message]);
    },
    
    __str__: function() {
        return repr(this.messages);
    }
});

publish({
    flatatt: flatatt,
    ErrorDict: ErrorDict,
    ErrorList: ErrorList,
    ValidationError: ValidationError
})