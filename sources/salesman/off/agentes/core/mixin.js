
var abs_url = function () { return '/%s'.subs([this._meta.module_name, string(this.pk)].join('/')); }

var Categoria = {
    __str__: function() {
        return this.super != null ? "%s - %s".subs(string(this.super), this.nombre) : this.nombre;
    }
};

var Producto = {
    __str__: function() {
        return this.nombre;
    }
};

var Cliente = {
    __str__: function() {
        return "%s, %s".subs(this.cuit, this.razon_social);
    },
    get_absolute_url: abs_url
};

var Provincia = {
    __str__: function() {
        return this.value;
    }
};

var Proveedor = {
    __str__: function() {
        return this.rason_social;
    },
    get_absolute_url: abs_url
};

var Ciudad = {
    __str__: function() {
        return this.nombre;
    },
    get_absolute_url: abs_url
};

publish({
	Categoria: Categoria,
	Producto: Producto,
	Cliente: Cliente,
	Provincia: Provincia,
	Ciudad: Ciudad,
	Proveedor: Proveedor
});