require('blog.post.mixin');
var models = require('doff.db.models.base');
require('doff.contrib.synchronization.models', 'SyncModel');

var Tag = type('Tag', [ SyncModel ], extend(mixin.Tag, {
    slug: new models.SlugField('Slug', {'help_text':'Automatically built from the title.', 'primary_key':true}),
    title: new models.CharField('Title', {'max_length':30}),
}));

var Post = type('Post', [ SyncModel ], extend(mixin.Post, {
    slug: new models.SlugField('Slug', {'primary_key':true}),
    title: new models.CharField('Title', {'max_length':30}),
    tags: new models.ManyToManyField(Tag),
    date: new models.DateTimeField('Date', {'editable': false, 'auto_now': true}),
    body: new models.TextField('Body Text'),

    Meta: {
        ordering: ['-date']
    }
}));

var Persona = type('Persona', [ models.Model ], {
    nombre: new models.CharField({verbose_name: 'Nombre', max_length: 50})
});

var Empleado = type('Empleado', [ Persona ], {
    sueldo: new models.IntegerField()
});

var Jefe = type('Jefe', [ Empleado ], {
    empleados: new models.ManyToManyField(Empleado)
});

publish({
    Tag: Tag,
    Post: Post,
    Persona: Persona,
    Empleado: Empleado,
    Jefe: Jefe
});