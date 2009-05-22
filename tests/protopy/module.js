//Archivo: tests/module.js
require('event');

var h1 = $('titulo');

function set_texto(txt) {
    h1.update(txt);
}

function get_texto() {
    return h1.innerHTML;
}

event.connect($('titulo'), 'click', function(event) {
    alert('El texto es: ' + event.target.innerHTML);
});

publish({
    set_texto: set_texto,
    get_texto: get_texto
});