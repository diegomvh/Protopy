{% load export_models %}{% spaceless %}
var models = require('doff.db.models.base');
{% for model_name, fields in models.iteritems %}
var {{ model_name }} = type("{{ model_name }}", models.Model, {
    {% for field_name, arguments in fields.iteritems %}
    {{ field_name }}: new models.{{ arguments|first }}({% get_model_definition arguments %}){% if not forloop.last %},{% endif %}{% endfor %}
});
{% endfor %}

publish({
{% for name, _ in models.iteritems %} {{ name }}: {{ name }}{% if not forloop.last %},{% endif %}
{% endfor %}
});{% endspaceless %}