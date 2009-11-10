#!/usr/bin/env python
# -*- coding: utf-8 -*-


'''
Redimencionar imágenes utilizando PIL para que su tamaño no rompa 
la estructura de la hoja en Sphinx/LaTeX
'''

import sys
try:
    from PIL import Image
except ImportError:
    print "Es necesario instalar Python Imaging Library (PIL)"
    sys.exit(3)

class NoNeedReframeException(Exception):
    pass

# Color de fondo
FONDO = (255, 255, 255)

def reframe_fname(name):
    '''
    Redimenciona una imagen, guardandola en 
    @param name: Nombre de un archivo
    '''
    try:
        img = Image.open(name).convert('RGB')
        ancho, alto = img.size
        if alto > ancho and float(alto)/ancho > 1.2: # Relación máxima 1/4
            nuevo_ancho = alto
        else:
            # No se necesita redimencionar
            raise NoNeedReframeException()
        
        # Nueva imagen en RGB    
        new_img = Image.new('RGB', (nuevo_ancho, alto), FONDO )
        
        #ext = name[name.rindex('.')+1:]
        #name =  name[:name.rindex('.')]
        #new_name = '%s_1.%s' % (name, ext, )
        
        new_img.paste(img, ((nuevo_ancho - ancho) / 2 ,0))
        
        new_img.save(name)
    except IOError, e:
        print "No se puede abrir '%s. Formato inválido? %s'" % (name, e)
    except NoNeedReframeException:
        pass
    else:
        print "Se redimencionó %s (%d, %d) -> (%d, %d)" % (name,
                                                           ancho,
                                                           alto,
                                                           nuevo_ancho,
                                                           alto
                                                           ) 

def main(argv = sys.argv):
    names = argv[1:]
    if not names:
        print "Sin entrada"
    for name in names:
        reframe_fname(name)    
        
if __name__ == "__main__":
    sys.exit(main())
