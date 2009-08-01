/* 
 * Serialize data to/from JSON
 */

var JavaScriptSerializer = require('doff.core.serializers.javascript', 'Serializer');
var JavaScriptDeserializer = require('doff.core.serializers.javascript', 'Deserializer');
require('json');

//Convert a queryset to JSON.
var Serializer = type('Serializer', [ JavaScriptSerializer ], {
    internal_use_only: false,

    end_serialization: function() {
        delete this.options['stream'];
        delete this.options['fields'];
        this.stream = json.stringify(this.objects, this.options);
    },
    getvalue: function() {
        return this.stream;
    }
});

//Deserialize a stream or string of JSON data.
function Deserializer(stream_or_string) {
    if (isinstance(stream_or_string, String))
        stream = String(stream_or_string);
    else
        stream = stream_or_string;
    for (var obj in JavaScriptDeserializer(json.parse(stream)))
        yield obj;
}

publish({
    Serializer: Serializer,
    Deserializer: Deserializer
});