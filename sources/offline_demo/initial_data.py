#encoding: utf-8
'''
Created on 10/10/2009

@author: defo
'''


def prepopulate_models():
    from offline_demo.salesman import models
    try:
        
        arg = models.Pais.objects.get(nombre = 'Argentina')
    except:
        arg = models.Pais.objects.create(nombre = 'Argentina')
#    from ipdb import set_trace; set_trace()
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
