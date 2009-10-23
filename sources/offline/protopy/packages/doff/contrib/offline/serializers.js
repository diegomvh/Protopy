/* 
 * A JavaScript "serializer". Doesn't do much serializing per se -- just converts to
 * and from basic JavaScript data types (lists, dicts, strings, etc.). Useful as a basis for other serializers.
 */

require('doff.core.serializers.javascript', 'Serializer', 'Deserializer');
require('doff.core.serializers.base', 'DeserializedObject');
var models = require('doff.db.models.base');

var RemoteSerializer = type('RemoteSerializer', [ Serializer ], {

    start_object: function(obj) {
        this._current = {};
    },

    end_object: function(obj) {
        this.objects.push({
            "model"  : string(obj._meta),
            "pk"     : string(obj._get_pk_val()),
            "fields" : this._current
        });
        this._current = null;
    }
});

/*
 * Deserialize simple Python objects back into Django ORM instances.
 * It's expected that you pass the Python objects themselves (instead of a
 * stream or a string) to the constructor
 */
function Deserializer(object_list, sync_log) {
    models.get_apps();
    for each (var d in object_list) {
        // Look up the model and starting build a dict of data for it.
        var Model = models.get_model_by_identifier(d["model"]);
        if (Model == null)
            throw new sbase.DeserializationError("Invalid model identifier: '%s'".subs(model_identifier));
        var data = {};
        data['sync_log'] = sync_log
        var m2m_data = {};

        // Handle each field
        for each (var [field_name, field_value] in items(d["fields"])) {
            if (isinstance(field_value, String))
                field_value = string(field_value);

            var field = Model._meta.get_field(field_name);

            // Handle M2M relations
            if (field.rel && isinstance(field.rel, models.ManyToManyRel)) {
                var m2m_convert = getattr(field.rel.to._meta.pk, 'to_javascript');
                m2m_data[field.name] = [m2m_convert(string(pk)) for each (pk in field_value)];
            } else if (field.rel && isinstance(field.rel, models.ManyToOneRel)) { // Handle FK fields
                if (field_value != null) {
                    data[field.attname] = field.rel.to._meta.get_field(field.rel.field_name).to_javascript(field_value);
                } else {
                    data[field.attname] = null;
                }
            } else {// Handle all other fields
                data[field.name] = field.to_javascript(field_value);
            }
        }
        yield new DeserializedObject(new Model(data), m2m_data);
    }
}

publish({
    Serializer: Serializer,
    Deserializer: Deserializer,
});