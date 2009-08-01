/* 
 * A JavaScript "serializer". Doesn't do much serializing per se -- just converts to
 * and from basic JavaScript data types (lists, dicts, strings, etc.). Useful as a basis for other serializers.
 */

var sbase = require('doff.core.serializers.base');
var models = require('doff.db.models.base');

//Serializes a QuerySet to basic Python objects.
var Serializer = type('Serializer', [ sbase.Serializer ], {
    internal_use_only: true,
    
    start_serialization: function() {
        this._current = null;
        this.objects = [];
    },

    end_serialization: function(){},

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
    },

    handle_field: function(obj, field) {
        this._current[field.name] = getattr(obj, field.name);
    },

    handle_fk_field: function(obj, field) {
        var related = getattr(obj, field.name);
        if (related != null) {
            if (field.rel.field_name == related._meta.pk.name) {
                // Related to remote object via primary key
                related = related._get_pk_val();
            } else {
                // Related to remote object via other field
                related = getattr(related, field.rel.field_name);
            }
        }
        this._current[field.name] = related;
    },

    handle_m2m_field: function(obj, field) {
        if (field.creates_table) {
            this._current[field.name] = [string(related._get_pk_val())
                               for each (related in getattr(obj, field.name).iterator())]
        }
    },

    getvalue: function() {
        return this.objects;
    }
});

/*
 * Deserialize simple Python objects back into Django ORM instances.
 * It's expected that you pass the Python objects themselves (instead of a
 * stream or a string) to the constructor
 */
function Deserializer(object_list) {
    models.get_apps();
    for each (var d in object_list) {
        // Look up the model and starting build a dict of data for it.
        var Model = _get_model(d["model"]);
        var data = {};
        data[Model._meta.pk.attname] = Model._meta.pk.to_javascript(d["pk"]);
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
        yield new sbase.DeserializedObject(new Model(data), m2m_data);
    }
}

//Helper to look up a model from an "app_label.module_name" string.
function _get_model(model_identifier) {
    var [app_label, model_name] = model_identifier.split(".");
    var Model = models.get_model(app_label, model_name);
    if (Model == null)
        throw new sbase.DeserializationError("Invalid model identifier: '%s'".subs(model_identifier));
    return Model;
}

publish({
    Serializer: Serializer,
    Deserializer: Deserializer,
});