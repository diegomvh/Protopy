#!/usr/bin/env python
#-*- encoding: utf-8 -*-

import sys, os, glob
import re




def reemplazar(fname, origen = '*', destino = '#', **opts):
    '''
    Reemplaza títulos
    '''
    patron = re.compile(r'''
        \%(origen)s{3,80}\n
        (?P<titulo>[\w\s]+)\n
        \%(origen)s{3,80}\n
    ''' % locals(), re.VERBOSE)

    def reemplazo(match):
        titulo = match.group('titulo')
        linea = destino * len(titulo)
        return '%s\n%s\n%s\n' % ( linea, 
                                  titulo,
                                  linea
                                 )
    # Inicio de la función
    f = open(fname)
    txt = f.read()
    f.close()
    print re.sub(patron, reemplazo, txt)
    
def main(argv = sys.argv):
    try:
        for fname in argv[1:]:
            reemplazar(fname)
    except IOError:
        pass
if __name__ == '__main__':
    sys.exit(main())
