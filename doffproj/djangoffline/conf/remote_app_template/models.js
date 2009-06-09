require('{{ settings.OFFLINE_BASE }}.{{ app_name }}.models', '*');
{% for model_name in models %}
extend({{ model_name }}.prototype, {
	// put your methods here
});
{% endfor %}
// Put your models here...

publish({
	{% for model_name in models %}{{ model_name }}: {{ model_name }}{% if not forloop.last %},{% endif %}
{% endfor %} });