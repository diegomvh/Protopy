function date(year, month, day) {
    if (!year || !month || !day) throw new TypeError('Function takes exactly 3 arguments');
    this.year = year;
    this.month = month;
    this.day = day;
}
extend(date.prototype, {
    
});

function time(hour, minute, second, microsecond, tzinfo) {
    if (!hour) throw new TypeError('Function takes exactly 1 argument');
    this.hour = hour;
    this.minute = minute;
    this.second = second;
    this.microsecond = microsecond;
    this.tzinfo = tzinfo;
}
extend(time.prototype, {

});

function datetime(year, month, day, hour, minute, second, microsecond,tzinfo) {
    this.date = new date(year, month, day);
    this.time = new time(hour, minute, second, microsecond, tzinfo);
}
extend(datetime.prototype, {

});

function timedelta(days) {
    this.days = days;
}
extend(timedelta.prototype, {

});

$P({'date':date, 'time':time, 'datetime':datetime, 'timedelta':timedelta});

/*
 Resumen

Objeto del Núcleo

Permite trabajar con fechas y horas.
Se Crea Con

El constructor Date:

new Date()
new Date(milisegundos)
new Date(cadenaFecha)
new Date(año_num, mes_num, dia_num
        [, hor_num, min_num, seg_num, mils_num])

Parámetros

milisegundos
    Valor entero que representa el número de milisegundos desde las 00:00:00 UTC del 1 de enero de 1970.

cadenaFecha
    Valor de tipo cadena que representa una fecha. La cadena debería estar en un formato reconocido por el método parse.

año_num, mes_num, dia_num
    Valores enteros con las representaciones de las partes de una fecha. Como valor entero, el mes se representa de 0 a 11, con 0=enero and 11=diciembre.

hor_num, min_num, seg_num, mils_num
    Valores enteros que representan las partes de una hora completa.

Descripción

Si no proporciona argumentos, el constructor crea un objeto Date con la hora y fecha de hoy según la hora local. Si proporciona algunos argumentos sí y otros no, los argumentos vacíos se establecen a 0. Si proporciona algunso argumentos, debe proporcionar al menos el año, mes y día. Puede omitir las horas, minutos, segundos y milisegundos.

La fecha se mide en milisegundos desde la media noche exacta del 01 de enero de 1970 en formato UTC. Un día contiene 86.400.000 milisegundos. El rango del objeto Date va desde -100,000,000 días hasta 100,000,000 días respecto del 01 de enero de 1970 UTC.

El objeto Date proporciona un comportamiento uniforme entre plataformas.

El objeto Date soporta métodos UTC (universales), además de métodos horarios locales. UTC, también conocido como Greenwich Mean Time (GMT), se refiere a la hora según el Estádar Horario Mundial (World Time Standard). La hora local es la hora establecida por el ordenador donde se ejecuta JavaScript.

Por compatibilidad con los cálculos del nuevo milenio (en otras palabras, para tener en cuenta el efecto 2000), debería especificar siempre el año completo; por ejemplo, utilice 1998, y no 98. Para ayudarle a especificar el año completo, JavaScript incluye los métodos getFullYear, setFullYear, getUTCFullYear, y setUTCFullYear.

El siguiente ejemplo devuelve el tiempo transcurrido entre horaA y horaB en milisegundos.

horaA = new Date();
// Sentencias que realizan alguna acción.
horaB = new Date();
diferenciaHoras = horaB - horaA;

Propiedades

    * constructor: Especifica la función que crea un prototipo del objeto.
    * prototype: Permite añadir propiedades a un objeto Date.

Métodos Estáticos

    * now: Devuelve el valor numérico correspondiente a la hora actual.
    * parse: Transforma una cadena que representa una fecha, y devuelve el número de milisegundos desde el 1 de enero de 1970, hora local 00:00:00.
    * UTC: Acepta los mismos parámetros que la forma más larga del constructor, y devuelve el número de milisegundos en un objeto Date desde el 1 de enero de 1970, hora universal 00:00:00.

Métodos

    * getDate: Devuelve el día del mes de la fecha especificada según la hora local.
    * getDay: Devuelve el día de la semana de la fecha especificada según la hora local.
    * getFullYear: Devuelve el año de la fecha especificada según la hora local.
    * getHours: Devuelve la hora de la fecha especificada según la hora local.
    * getMilliseconds: Devuelve los milisegundos de la fecha especificada según la hora local.
    * getMinutes: Devuelve los minutos de la fecha especificada según la hora local.
    * getMonth: Devuelve el mes de la fecha especificada según la hora local.
    * getSeconds: Devuelve los segundos de la fecha especificada según la hora local.
    * getTime: Devuelve el valor numérico correspondiente a la hora especificada según la hora universal.
    * getTimezoneOffset: Devuelve la diferencia horaria en minutos para la zona geográfica actual.
    * getUTCDate: Devuelve el día del mes de la fecha especificada según la hora universal.
    * getUTCDay: Devuelve el día de la semana de la fecha especificada según la hora universal.
    * getUTCFullYear: Devuelve el día el año de la fecha especificada según la hora universal.
    * getUTCHours: Devuelve las horas de la fecha especificada según la hora universal.
    * getUTCMilliseconds: Devuelve los milisegundos de la fecha especificada según la hora universal.
    * getUTCMinutes: Devuelve los minutos de la fecha especificada según la hora universal.
    * getUTCMonth: Devuelve el mes de la fecha especificada según la hora universal.
    * getUTCSeconds: Devuelve los segundos de la fecha especificada según la hora universal.
    * getYear Desaprobado  : Devuelve el año de la fecha especificada según la hora local. Use getFullYear a cambio.
    * setDate: Establece el día del mes de la fecha especificada según la hora local.
    * setFullYear: Establece el año completo de la fecha especificada según la hora local.
    * setHours: Establece las horas de la fecha especificada según la hora local.
    * setMilliseconds: Establece los milisegundos de la fecha especificada según la hora local.
    * setMinutes: Establece los minutos de la fecha especificada según la hora local.
    * setMonth: Establece el mes de la fecha especificada según la hora local.
    * setSeconds: Establece los segundos de la fecha especificada según la hora local.
    * setTime: Establece el valor del objeto Date según la hora local.
    * setUTCDate: Establece el día del mes de la fecha especificada según la hora universal.
    * setUTCFullYear: Establece el año completo de la fecha especificada según la hora universal.
    * setUTCHours: Establece la hora de la fecha especificada según la hora universal.
    * setUTCMilliseconds: Establece los milisegundos de la fecha especificada según la hora universal..
    * setUTCMinutes: Establece los minutos de la fecha especificada según la hora universal..
    * setUTCMonth: Establece el mes de la fecha especificada según la hora universal.
    * setUTCSeconds: Establece los segundos de la fecha especificada según la hora universal..
    * setYear Desaprobado  : Establece el año de la fecha especificada según la hora local. Use setFullYear a cambio.
    * toGMTString Desaprobado : Convierte una fecha en una cadena, usando las convenciones de Internet GMT. Utilice toUTCString a cambio.
    * toLocaleString: Convierte una fecha en una cadena, usando las reglas de la localización actual. Sobreescribe el método Object.toLocaleString.
    * toLocaleDateString: Devuelve la porción fecha (sin la hora) de una fecha como una cadena, usando las reglas de la localización actual.
    * toLocaleTimeString: Devuelve la porción hora (sin la fecha) de una fecha como una cadena, siguiendo las reglas de la localización actual.
    * toSource: Devuelve un literal que representa al objeto Date especificado; puede usar este valor para crear un nuevo objeto. Sobreescribe el método Object.toSource.
    * toString: Devuelve una cadena representando el objeto Date especificado. Sobreescribe el método Object.toString.
    * toUTCString: Convierte una fecha en una cadena, usando las reglas horarias universales.
    * valueOf: Devuelve el valor primitivo de un objeto Date. Sobreescribe el método Object.valueOf.

Además, este objeto hereda los métodos watch y unwatch de Object.
Ejemplos
Ejemplo: Diversas maneras de asignar fechas

Los ejemplos siguientes muestran diversos modos de asignar fechas:

hoy = new Date();
cumpleanos = new Date("December 17, 1995 03:24:00");
cumpleanos = new Date(1995,11,17);
cumpleanos = new Date(1995,11,17,3,24,0);

Ejemplo: Calcular el tiempo transcurrido

Los siguientes ejemplos muestran como determinar el tiempo transcurrido entre dos fechas:

// usando métodos estáticos
var inicio = Date.now();
// el evento cuyo tiempo ha transcurrido aquí:
hacerAlgoPorAlgunTiempo();
var fin = Date.now();
var transcurso = fin - inicio; // tiempo en milisegundos

// si tiene objetos Date
var inicio = new Date();
// el evento cuyo tiempo ha transcurrido aquí:
hacerAlgoPorAlgunTiempo();
var fin = new Date();
var transcurso = fin.getTime() - inicio.getTime(); // tiempo en milisegundos



*/