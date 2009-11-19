#encoding: utf-8

def prepopulate_models():
    from salesman.apps.core import models
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
    map(lambda n: models.Provincia(nombre = n).save(), provincias)