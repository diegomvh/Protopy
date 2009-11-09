# -*- coding: utf-8 -*-
#!/usr/bin/env python

# Redimencionar imágenes utilizando PIL para que su tamaño no rompa la estructura de la hoja.

from PIL import Image
import sys

FONDO = (255, 255, 255)

def reframe_fname(name):
    try:
        img = Image.open(name).convert('RGB')
        w, h = img.size
        if h > w:
            n_w = h
        else:
            n_w = w
            
        new_img = Image.new('RGB', (n_w, h), FONDO )
        
        ext = name[name.rindex('.')+1:]
        name =  name[:name.rindex('.')]
        new_name = '%s_1.%s' % (name, ext, )
        
        print type(new_img), new_img.__class__
        new_img.paste(img, ((n_w - w) / 2 ,0))
        
        new_img.save(new_name)
    except IOError, e:
        print "No se puede abrir '%s'" % name
    else:
        print name, w, h

def main(argv = sys.argv):
    names = argv[1:]
    if not names:
        print "Sin entrada"
    for name in names:
        reframe_fname(name)    
        
if __name__ == "__main__":
    sys.exit(main())
