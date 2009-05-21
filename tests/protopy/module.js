require('timer');

var texto = "Este es un modulo modificando la barra de estado.";
var posicion = 0;

//funcion para mover el texto de la barra de estado
function mueve_texto(){
    if (posicion < texto.length)
	posicion ++;
    else
	posicion = 1;
    var string = texto.substring(posicion) + texto.substring(0, posicion);
    window.status = string;
    setTimeout('mueve_texto()',50);
}

function start() {
    mueve_texto();
}

function stop() {
    setTimeout(mueve_texto,50);
}

publish({ 
    start:start,
    stop:stop
})