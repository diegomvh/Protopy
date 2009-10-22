/*
 * Module for abstract serializer/unserializer base classes.
 */

var models = require('doff.db.models.base');

var SerializationError = type('SerializationError', [ Exception ]);
var DeserializationError = type('DeserializationError', [ Exception ]);

/*
 * Abstract serializer base class.
 */
var Serializer = type('Serializer', [ object ], {

    //Indicates if the implemented serializer is only available for internal Django use.
    internal_use_only: false,

    //Serialize a queryset.
    serialize: function(queryset) {
        var arg = new Arguments(arguments);
        this.options = arg.kwargs;
        this.stream = this.options["stream"] || String();
        this.selected_fields = this.options["fields"];

        this.start_serialization();
        for each (var obj in queryset) {
            this.start_object(obj);
            for each (var field in obj._meta.local_fields) {
                if (field.serialize) {
                    if (field.rel == null) {
                        if (this.selected_fields == null || include(this.selected_fields, field.attname)) {
                            this.handle_field(obj, field);
                        }
                    } else {
                        if (this.selected_fields == null || include(this.selected_fields, field.attname.slice(0, -3)))
                            this.handle_fk_field(obj, field);
                    }
                }
            }
            for each (var field in obj._meta.many_to_many) {
                if (field.serialize) {
                    if (this.selected_fields == null || include(this.selected_fields, field.attname))
                        this.handle_m2m_field(obj, field);
                }
            }
            this.end_object(obj);
        }
        this.end_serialization();
        return this.getvalue();
    },

    //Convert a field's value to a string.
    get_string_value: function(obj, field) {
      return field.value_to_string(obj);
    },

    //Called when serializing of the queryset starts.
    start_serialization: function() {
        throw new NotImplementedError();
    },

    //Called when serializing of the queryset ends.
    end_serialization: function() {},

    //Called when serializing of an object starts.
    start_object: function(obj) {
        throw new NotImplementedError();
    },

    //Called when serializing of an object ends.
    end_object: function(obj) {},

    //Called to handle each individual (non-relational) field on an object.
    handle_field: function(obj, field) {
        throw new NotImplementedError();
    },
    
    //Called to handle a ForeignKey field.
    handle_fk_field: function(obj, field) {
        throw new NotImplementedError();
    },

    //Called to handle a ManyToManyField.
    handle_m2m_field: function(obj, field) {
        throw new NotImplementedError();
    },
    
    //Return the fully serialized queryset (or None if the output stream is not seekable).
    getvalue: function() {
        if (callable(this.stream['getvalue']))
            return this.stream.getvalue();
    }
});

//Abstract base deserializer class.
var Deserializer = type('Deserializer', [ object ], {
    //Init this serializer given a stream or a string
    __init__: function(stream_or_string) {
        var arg = new Arguments(arguments);
        this.options = arg.kwargs;
        if (isinstance(stream_or_string, String))
            this.stream = String(stream_or_string);
        else
            this.stream = stream_or_string;
        //hack to make sure that the models have all been loaded before
        //deserialization starts (otherwise subclass calls to get_model()
        //and friends might fail...)
        models.get_apps();
    },
    __iter__: function() {
        return this;
    },
    //Iteration iterface -- return the next item in the stream
    next: function() {
        throw new NotImplementedError();
    }
});

/*
 * A deserialized model.
 * Basically a container for holding the pre-saved deserialized data along
 * with the many-to-many data saved with the object.
 * Call ``save()`` to save the object (with the many-to-many data) to the
 * database; call ``save(save_m2m=False)`` to save just the object fields
 * (and not touch the many-to-many stuff.)
 */
var DeserializedObject = type('DeserializedObject', [ object ], {

    __init__: function(obj, m2m_data) {
        this.object = obj;
        this.m2m_data = m2m_data;
    },

    save: function(save_m2m) {
        save_m2m = save_m2m || true;
        //Call save on the Model baseclass directly. This bypasses any
        //model-defined save. The save is also forced to be raw.
        //This ensures that the data that is deserialized is literally
        //what came from the file, not post-processed by pre_save/save methods.
        models.Model.prototype.save_base.apply(this.object,[ true ]);
        if (this.m2m_data && save_m2m)
            for each (var [ accessor_name, object_list ] in items(this.m2m_data))
                setattr(this.object, accessor_name, object_list);

        //prevent a second (possibly accidental) call to save() from saving the m2m data twice.
        this.m2m_data = null;
    }
});

publish({
    SerializationError: SerializationError,
    DeserializationError: DeserializationError,
    Serializer: Serializer,
    Deserializer: Deserializer,
    DeserializedObject: DeserializedObject
});