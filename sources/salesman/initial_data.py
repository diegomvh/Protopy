#encoding: utf-8

def prepopulate_models():
    from salesman.apps.core import models
    (arg, _) = models.Pais.objects.get_or_create(nombre = 'Argentina')
    provincias = ("Buenos Aires",
            "Córdoba",
            "Santa Fe",
            "Mendoza",
            "Tucumán",
            "Entre Ríos",
            "Salta",
            "Misiones",
            "Chaco",
            "Corrientes",
            "Santiago del Estero",
            "Jujuy",
            "San Juan",
            "Río Negro",
            "Formosa",
            "Neuquén",
            "Chubut",
            "San Luis",
            "Catamarca",
            "La Rioja",
            "La Pampa",
            "Santa Cruz",
            "Tierra del Fuego",
        )
    map(lambda n: arg.provincia_set.get_or_create(nombre = n), provincias)