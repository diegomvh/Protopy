var models = require('doff.db.models.base');
require('doff.db.models.fields.base', 'TextField');
require('json', 'stringify');

var JsonFieldDescriptor = type('JsonFieldDescriptor', [ object ], {
	__init__: function(field) {
	    this.field = field;
	},
	
	__get__: function(instance, instance_type) {
	    if (!isinstance(instance, instance_type))
	        throw new AttributeError("Manager must be accessed via instance");
	    
	    var json = instance[this.field.attname];
	    if (json)
	    	json = eval('(' + json + ')');
	    return json;
	},
	
	__set__: function(instance, instance_type, value) {
	    if (!isinstance(instance, instance_type))
	        throw new AttributeError("Manager must be accessed via instance");
	    
	    instance['module'] = value.__module__? value.__module__ : null;
	    instance['name'] = value.__name__? value.__name__ : string(value); 
	    
	    if (value)
	    	json = stringify(value);
	    instance[this.field.attname] = json;
	}
	
});

var JsonField = type('JsonField', [ TextField ], {
    contribute_to_class: function(cls, name) {
        super(TextField, this).contribute_to_class(cls, name);
        var jd = new JsonFieldDescriptor(this);
        var attr = this.name;
        cls.prototype.__defineGetter__(attr, function(){ return jd.__get__(this, this.constructor); });
        cls.prototype.__defineSetter__(attr, function(value){ return jd.__set__(this, this.constructor, value); });
    },
    
    get_attname: function() {
        return '%s_json'.subs(this.name);
    },
    
    db_type: function() {
    	return 'TextField';
    }
});

var ExtraData = type('ExtraData', [ models.Model ], {
	key: new models.CharField({ 'max_length': 100 }),
    module: new models.CharField({ 'max_length': 100, 'null': true, 'blank': true}),
    name: new models.CharField({ 'max_length': 100 }),
    data: new JsonField(),
    
    Meta: {
		db_table: 'doff_extra_data',
		ordering: ['name']
    }
});

publish({
	ExtraData: ExtraData,
});