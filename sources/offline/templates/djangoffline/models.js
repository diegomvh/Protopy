{% load export_models %}
var models = require('doff.db.models.base');
require('doff.contrib.offline.models', 'RemoteModel', 'RemoteReadOnlyModel');
{% for name in apps %}require('{{site.name}}.{{name}}.models', '*');
{% endfor %}require('{{site.name}}.{{app}}.mixin');

//Use __extend__ and safe = true
{% for name, class, fields in models %}//Create Model
var {{ name }} = type("{{ name }}", {{ class }}, __extend__(true, {
	{% for field_name, arguments in fields.iteritems %}    {{ field_name }}: new models.{{ arguments|first }}({% get_model_definition app name arguments %}),
	{% endfor %}}, mixin.{{name}} || {}));
mixin.{{ name }} = {{ name }};

{% endfor %}publish(mixin);