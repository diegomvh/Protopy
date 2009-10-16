{% load export_models %}
require('{{site.name}}.{{app}}.mixin');
var models = require('doff.db.models.base');
require('doff.contrib.offline.models', 'SyncModel');

{% for name, app, fields in models %}//Create Object
var mixed{{ name }} = extend(mixin.{{ name }} || {}, {
{% for field_name, arguments in fields.iteritems %}    {{ field_name }}: new models.{{ arguments|first }}({% get_model_definition arguments %}),
{% endfor %}
    Meta: { 
        remote_app_label: '{{ app }}'
    }
});

//Create Model
var {{ name }} = type("{{ name }}", SyncModel, mixed{{name}});

{% endfor %}publish({
{% for name, _, _ in models %}    {{ name }}: {{ name }}{% if not forloop.last %},{% endif %}
{% endfor %}});