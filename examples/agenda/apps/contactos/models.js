var models = require('doff.db.models.base');

var Contacto = type('Contacto', [models.Model], {
	nombre = models.CharField({max_length: 50}),
	apellido = models.CharField({max_length: 50}),
	correo = models.EmailField({max_length: 50}),
	telefono = models.CharField({max_length: 50}),
	
	__str__: function() {
		return "%s, %s".subs(this.apellido, this.nombra);
	}
});

publish({
	Contacto: Contacto
});