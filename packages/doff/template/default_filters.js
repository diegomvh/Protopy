$L('doff.template', 'Variable', 'Library');
var register = new Library();

function capitalize(value){ return value.capitalize(); };
register.filter(capitalize);

function join(value, arg) {
    var data = value;
    if (isarray(value))
        data = value.join(arg);
    return data;
}
register.filter(join);

function slugify(value) {
    var badchars = ['á','é','í','ó','ú','ñ'];
    var goodchars = ['a','e','i','o','u','n'];
    value = value.replace(/[^\w\s-]/g, '').strip().toLowerCase();
    for (var i = 0, length = badchars.length; i < length; i++)
        value = value.replace(badchars[i], goodchars[i], 'g');
    return value.replace(/[-\s]+/g, '-');
}
register.filter(slugify);

// For the library
$P({ 'register': register });

// For the rest
$P({ 'slugify': slugify });