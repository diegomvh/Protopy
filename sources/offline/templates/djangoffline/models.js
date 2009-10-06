{% load export_models %}
require('{{site.name}}.{{app}}.mixin');
var models = require('doff.db.models.base');
require('doff.contrib.synchronization.models', 'SyncModel');

{% for model_name, fields in models.iteritems %}//Create Object
var mixed{{ model_name }} = extend(mixin.{{model_name}} || {}, {
{% for field_name, arguments in fields.iteritems %}    {{ field_name }}: new models.{{ arguments|first }}({% get_model_definition arguments %}){% if not forloop.last %},{% endif %}
{% endfor %}});

//Create Model
var {{ model_name }} = type("{{ model_name }}", SyncModel, mixed{{model_name}});

{% endfor %}publish({
{% for name, _ in models.iteritems %}    {{ name }}: {{ name }}{% if not forloop.last %},{% endif %}
{% endfor %}});