{% load export_models %}{% spaceless %}
require('{{site.name}}.{{app}}.mixin');
var models = require('doff.db.models.base');
require('doff.contrib.synchronization.models', 'SyncModel');
{% for model_name, fields in models.iteritems %}
var {{ model_name }} = type("{{ model_name }}", SyncModel, extend(mixin.{{model_name}}, {
    {% for field_name, arguments in fields.iteritems %}
    {{ field_name }}: new models.{{ arguments|first }}({% get_model_definition arguments %}){% if not forloop.last %},{% endif %}{% endfor %}
}));
{% endfor %}

publish({
{% for name, _ in models.iteritems %} {{ name }}: {{ name }}{% if not forloop.last %},{% endif %}
{% endfor %}
});{% endspaceless %}