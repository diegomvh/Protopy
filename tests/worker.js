// Worker 
var wp = google.gears.workerPool;
var timer = google.gears.factory.create('beta.timer');
// We know that "main" thread has id = 0
var mainThread = 0;
var timer_id = null;

function handler (a, b, message){
    wp.sendMessage('Recibi a= a' + this, mainThread);
}
// Create a handler for WP
wp.onmessage = handler;



function timeout(){
    var a=1, b=2;
    [a,b] = [b,a];
    
    // Probamos que tenemos js 1.7 en el workerPool
    // var x = [1, 2, 3].map(function (e) {return e * 3});
    wp.sendMessage('Ejecuto JS 1.7: ' + [a,b], mainThread);

}

var timer_id = timer.setInterval(timeout, 3000);
wp.sendMessage('Timer iniciado con '+ timer_id, 0);