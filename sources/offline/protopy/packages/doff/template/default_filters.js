require('doff.template.base', 'Variable', 'Library');
var register = new Library();

function capfirst(value) {
    /*Capitalizes the first character of the value.*/
    return (value) ?  value.capitalize() : '';
}
register.filter(capfirst);

function lower(value) {
    /*Converts a string into all lowercase.*/
    return value.toLowerCase();
}
register.filter(lower);

function join(value, arg) {
    return array(value).join(arg);
}
register.filter(join);

function slugify(value) {
    var badchars = ['á','é','í','ó','ú','ñ'];
    var goodchars = ['a','e','i','o','u','n'];
    for (var i = 0, length = badchars.length; i < length; i++)
        value = value.replace(badchars[i], goodchars[i], 'g');
    value = value.replace(/[^\w\s-]/g, '').strip().toLowerCase();
    return value.replace(/[-\s]+/g, '-');
}
register.filter(slugify);

function escape(value) {
    return value.escapeHTML();
}
register.filter(escape);

function yesno(value, arg) {
    /*
    Given a string mapping values for true, false and (optionally) None,
    returns one of those strings accoding to the value:

    ==========  ======================  ==================================
    Value       Argument                Outputs
    ==========  ======================  ==================================
    ``True``    ``"yeah,no,maybe"``     ``yeah``
    ``False``   ``"yeah,no,maybe"``     ``no``
    ``None``    ``"yeah,no,maybe"``     ``maybe``
    ``None``    ``"yeah,no"``           ``"no"`` (converts None to False
                                        if no mapping for None is given.
    ==========  ======================  ==================================
    */
    if (isundefined(arg))
        arg = 'yes,no,maybe';
    var bits = arg.split(',')
    if (len(bits) < 2)
        return value; // Invalid arg.
    var [yes, no, maybe] = bits;
    if (isundefined(maybe))
        maybe = no;
    if (isundefined(value))
        return maybe;
    if (value)
        return yes;
    return no;
}
register.filter(yesno);

function stringformat(value) {
	return value;
}
register.filter(stringformat);

publish({
    register: register,
    slugify: slugify
});