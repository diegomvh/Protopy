$L('{{ PROJECT }}.{{ APP }}.models', '*');

{% for model_name in models %}
    var {{ model_name }}Mixin = type('{{ model_name }}Mixin', {{ model_name }}, {
        /*
            {% mostrar_campos model_name %}
        */
        // foo: function () { /* make foo */ }
        
    };
{% endfor %}

$P({
    {% for model_name in models %}
        {{ model_name}}: {{ model_name}}Mixin,
    {% endfor %}
});