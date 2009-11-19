require('datetime', 'datetime');

String.prototype.__json__ = function() { 
    return this.inspect(true); 
}

String.prototype.isJSON = function(){
    var testStr = this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
    return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(testStr);
}

Number.prototype.__json__ = function() { 
    return isFinite(this) ? this.toString() : 'null'; 
}

var date = {CLASSHINTING: 'classHinting',
            TIMESTAMP: '@timestamp@',
            TICKS: '@ticks@',
            'ASP.NET': 'ASP.NET',
            ISO8601: 'ISO8601' };

date['encoding'] = date.ISO8601;
date['decode'] = true;

Date.prototype.__json__ = function() {
    switch(date.encoding) {
        case 'classHinting':
            return '{"__jsonclass__":["Date",[' + this.valueOf() + ']]}';
        case '@timestamp@':
        case '@ticks@':
            return '"@' + this.valueOf() + '@"';
        case 'ASP.NET':
            return '"\\/Date(' + this.valueOf() + ')\\/"';
        default:
            return '"' + datetime.toISOTimestamp(datetime.datetime(this)) + '"';
    }
}

var stringify = function (value) {

    switch (typeof value) {
        case 'undefined':
        case 'unknown': return;
        case 'function':  return value.toSource(); /* no lo veo util, pero bueno vemos que pasa */
        case 'boolean': return value.toString();
    }

    if (value === null) return 'null';
    if (callable(value.__json__)) return value.__json__();
    if (Element.isElement(value)) return;

    var results = [];
    if (isinstance(value, Array)) {
        for each (var v in value)
            results.push(stringify(v));
        return '[' + results.join(', ') + ']';
    } else if (isinstance(value, Object)) {
        for (var property in value) {
            var v = stringify(value[property]);
            if (!isundefined(v))
                results.push(stringify(property) + ': ' + v);
        }
    return '{' + results.join(', ') + '}';
    }
}

var parse = function (value, sanitize) {
    value = value.replace(/^\/\*-secure-([\s\S]*)\*\/\s*$/, "$1");
    try {
        if(!sanitize || value.isJSON())
            var data = eval('(' + value + ')');
            /*if (date.decode)
                data = decode_dates(data);
            */
            return data;
    } catch(e){ 
        throw new SyntaxError('Badly formed JSON string: ' + value + " ... " + (e ? e.message : '')); 
    }
}

var decode_dates = function(obj) {
    //Ver que es el hasOwnProperty
    //var matches, useHasOwn = {}.hasOwnProperty ? true : false;
    var matches;
    //Parse date strings
    if(isinstance(obj, String)) {
        //ISO8601
        if(matches = obj.match(/^(?:(\d\d\d\d)-(\d\d)(?:-(\d\d)(?:T| (\d\d)(?::(\d\d)(?::(\d\d)(?:\.(\d+))?)?)?)?)?)$/)){
            var result = new Date();
            if (matches[1])
                result.setUTCFullYear(Number(matches[1]));
            if (matches[2])
                result.setUTCMonth(Number(matches[2]) - 1);
            if (matches[3])
                result.setUTCDate(Number(matches[3]));
            if (matches[4])
                result.setUTCHours(Number(matches[4]));
            if (matches[5])
                result.setUTCMinutes(Number(matches[5]));
            if (matches[6])
                result.setUTCSeconds(Number(matches[6]));
        } else if (matches = obj.match(/^@(\d+)@$/)) {
            var result = new Date(Number(matches[1]));
        } else if (matches = obj.match(/^\/Date\((\d+)\)\/$/)) {
            var result = new Date(Number(matches[1]));
        }
    } else if (isinstance(obj, Object)) {
        //JSON 1.0 Class Hinting: {"__jsonclass__":["constructor", [param1,...]], "prop1": ...}
        if (!isundefined(obj.__jsonclass__) &&  isinstance(obj.__jsonclass__, Array)) {
            if (obj.__jsonclass__[0] == 'Date') {
                if (isinstance(obj.__jsonclass__[1], Array) && !isundefined(obj.__jsonclass__[1][0]))
                    obj = new Date(obj.__jsonclass__[1][0]);
                else
                    obj[key] = new Date();
            }
        } else {
            for (var key in obj)
                obj[key] = decode_dates(obj[key]);
        }
    } else {
        for (var key in obj)
            obj[key] = decode_dates(obj[key]);
    }
    return isundefined(result) ? obj : result;
}

publish({
    date: date,
    stringify: stringify,
    parse: parse
});