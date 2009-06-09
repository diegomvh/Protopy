require('{{ settings.OFFLINE_BASE }}.{{ app_name }}.models', '*');
{% for model_name in models %}
    var {{ model_name }}Mixin = type('{{ model_name }}Mixin', {{ model_name }}, {        
        // put your methods here
    });
{% endfor %}
// Put your models here...

publish({
	{% for model_name in models %}{{ model_name }}: {{ model_name }}Mixin{% if not forloop.last %},{% endif %}
	{% endfor %} });