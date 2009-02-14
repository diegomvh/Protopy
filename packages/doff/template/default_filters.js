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

$P({ 'register': register });
