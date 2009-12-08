var models = require('doff.db.models.base');

var Contacto = type('Contacto', [ models.Model ], {
	nombre: new models.CharField({max_length: 50}),
	apellido: new models.CharField({max_length: 50}),
	correo: new models.EmailField({max_length: 50}),
	telefono: new models.CharField({max_length: 50}),
	
	__str__: function() {
		return "%s, %s".subs(this.apellido, this.nombre);
	}
});

publish({
	Contacto: Contacto
});