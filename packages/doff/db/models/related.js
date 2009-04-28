/* 'doff.db.models.related' */

var BoundRelatedObject = type('BoundRelatedObject', {
    '__init__': function __init__(related_object, field_mapping, original){
        this.relation = related_object;
        this.field_mappings = field_mapping[related_object.name];
    },
    'template_name': function template_name() {
        throw new NotImplementedError();
    }
});

var RelatedObject = type('RelatedObject', {
    '__init__': function __init__(parent_model, model, field){
        this.parent_model = parent_model;
        this.model = model;
        this.opts = model._meta;
        this.field = field;
        this.name = '%s:%s'.subs(this.opts.app_label, this.opts.module_name);
        this.var_name = this.opts.object_name.toLowerCase();
    },

    'get_db_prep_lookup': function get_db_prep_lookup(lookup_type, value){
        return this.field.get_db_prep_lookup(lookup_type, value);
    },

    'editable_fields': function editable_fields(){
        //TODO: esto en js no va
        //return [f for f in self.opts.fields + this.opts.many_to_many if f.editable && f != this.field];
    },

    'bind': function bind(field_mapping, original, bound_related_object_class){
        var bound_related_object_class = bound_related_object_class || BoundRelatedObject;
        return new bound_related_object_class(this, field_mapping, original);
    },

    'get_accessor_name': function get_accessor_name(){
        if (this.field.rel.multiple){
            if (this.field.rel['symmetrical'] && this.model == this.parent_model)
                return null;
            return this.field.rel.related_name || (this.opts.object_name.toLowerCase() + '_set');
        }
        else {
            return this.field.rel.related_name || (this.opts.object_name.toLowerCase());
        }
    }
});

publish({ 
    RelatedObject: RelatedObject 
});
