{% load export_models %}{% spaceless %}
require('{{site.name}}.{{app_name}}.mixin');
var models = require('doff.db.models.base');
{% for model_name, fields in models.iteritems %}
var {{ model_name }} = type("{{ model_name }}", models.Model, extend(mixin.{{model_name}}, {
    {% for field_name, arguments in fields.iteritems %}
    {{ field_name }}: new models.{{ arguments|first }}({% get_model_definition arguments %}){% if not forloop.last %},{% endif %}{% endfor %}
}));
{% endfor %}

publish({
{% for name, _ in models.iteritems %} {{ name }}: {{ name }}{% if not forloop.last %},{% endif %}
{% endfor %}
});{% endspaceless %}