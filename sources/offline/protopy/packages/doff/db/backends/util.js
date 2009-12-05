var rev_typecast_boolean = function(obj, d) { return obj && '1' || '0'; };

var rev_typecast_decimal = function(d) {
    if (!d)
        return null;
    return new String(d);
};

/*
 * Shortens a string to a repeatable mangled version with the given length.
 */
var truncate_name = function(name, length) {

    if (!length || (name.length <= length))
        return name;

    //TODO: un hash del nombre
    var hash = name;

    return '%s%s'.subs(name.substr(0,length-4), hash);
};

/*
 * Formats a number into a string with the requisite number of digits and decimal places.
 */
var format_number = function(value, max_digits, decimal_places) {
    return value.toFixed(decimal_places);
};

publish({    
    rev_typecast_boolean: rev_typecast_boolean,
    rev_typecast_decimal: rev_typecast_decimal,
    truncate_name: truncate_name,
    format_number: format_number  
});