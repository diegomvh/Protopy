#!/usr/bin/env python
#-*- encoding: utf-8 -*-
# Created: 10/12/2009 by defo

import sys
import os
import re
import glob

CURRENT_PATH = os.path.abspath(os.path.dirname(__file__))

try:
    # Correct this if the Latex output dir is different 
    LATEX_OUTPUT = os.path.join(CURRENT_PATH, '_build', 'latex')
except:
    sys.exit("Latex output dir couldn't be found, sorry")

# Deprecated!
def remove_fancyhdr_include():
    re_fancy = re.compile(r'''
    \\RequirePackage{fancyhdr}
    ''', re.VERBOSE | re.UNICODE)
    sty_file = os.path.join(CURRENT_PATH, '_build', 'latex', 'sphinx.sty')
    f = open(sty_file, 'r')
    content = f.read()
    f.close()
    
    if re_fancy.search(content):
        
        content = re.sub(re_fancy, '% sin fancy', content)
        f = open(sty_file, 'w')
        f.write(content)
        f.close()
        print "#"* 50
        print "FANCYHDR removeed"
        print "#"* 50

def file_walk(base, pattern):
    for name in glob.glob(base + os.sep + pattern):
        yield name

# ------------------------------------------------------------------
# ONE SIDE PRINTING
# ------------------------------------------------------------------

def file_pattern_replace(orignal, subsitution, filename):
    f = open(filename, 'r') #
    contents = f.read()
    f.close()
    match = orignal.search(contents)
    if match:
        contents = re.sub(orignal, subsitution, contents)
        f = open(filename, 'w')
        f.write(contents)
        f.close()
        return True

    
frel = lambda f: os.path.relpath(f, CURRENT_PATH)

def remove_twopage_parameter(base = LATEX_OUTPUT, files = '*.cls'):
    re_twoside = re.compile(ur'''
        twoside,?
    ''',  re.VERBOSE | re.UNICODE)
    
    for fname in file_walk(base, files):
        if file_pattern_replace(re_twoside, '', fname):
            print "Twoside hot pached in %s." % frel(fname)
            


def remove_empty_chapters(base = LATEX_OUTPUT, files = '*.tex'):
    
    counter = 0
    re_empty_chap = re.compile (ur'''
        \\chapter\{\{\}\}
    ''', re.VERBOSE | re.UNICODE )
    
    for fname in file_walk(base, files):
        if file_pattern_replace(re_empty_chap, '', fname):
            print "Remove empty chapters in %s." % frel(fname)
    

    
def fix_encoding_for_OpenOffice_org(base = LATEX_OUTPUT, files = '*.tex'):
    re_encoding = re.compile(r'''
        \\usepackage\[utf8\]\{inputenc\}
    ''', re.VERBOSE | re.UNICODE)

    replacement = '''
    % Hotfix for OpenOffice encoing issues :S
    \usepackage{pstricks}  % since the dash is rendered by pstricks!
    \usepackage[postscript]{ucs}
    \usepackage[utf8x]{inputenc}
    '''.strip()    
    for fname in file_walk(base, files):
        if file_pattern_replace(re_encoding, replacement, fname):
            print "Encoding fiexed in %s." % frel(fname)

def drown_bibliography(target, base = LATEX_OUTPUT,):
    '''
    Put thebibliography at the bottom
    '''
    re_start = re.compile( ur'''
        \\begin\{thebibliography\}
    ''' , re.VERBOSE | re.UNICODE)
    
    re_stop = re.compile( ur'''
        \\end\{thebibliography\}
    ''' , re.VERBOSE | re.UNICODE)
    
    
    #TARGET = '_build/latex/SistemasWebDesconectados.tex'
    
    TARGET = os.path.join(base, target)
    
    f = open(TARGET)
    lines = f.readlines()
    f.close()
    biblio, rest = [], []
    
    gen_lines = ( (n, l) for n, l in enumerate(lines)) 
    
    # Shame on me, quick and dirty
    
    while not biblio:
        n, l = gen_lines.next()
        if re_start.search(l):
            biblio.append(l)
            print "Comienzo de biblio en %d" % n
            break
        rest.append(l)
    while True:
        n, l = gen_lines.next()
        if re_stop.search(l):
            biblio.append(l)
            print "Fin de biblio en %d. Cantidad %d" % (n, len(biblio))
            break
        biblio.append(l)
    while True:
        try:
            n, l = gen_lines.next()
        except StopIteration:
            break
        rest.append(l)
    
    f = open(TARGET, 'w')
    f.writelines(rest[:-1])
    f.writelines(biblio)
    f.writelines(rest[-1:])
    f.close()
    
def insert_thanks_page(target, base):
    '''
    Mete la página dando las gracias
    '''
    THANKS_CMD = '\\makethankspage'
    
    

def main(argv = sys.argv):
    print("HACKING SPHINX OUTPUT... (this should take no time)")
    import conf
    root, tex_file, title, authors, docclass = conf.latex_documents[0]
    
    remove_twopage_parameter()
    fix_encoding_for_OpenOffice_org()
    remove_empty_chapters()
    drown_bibliography(tex_file)
    print("END OF SPHINX OUTPUT HACKING")

if __name__ == "__main__":
    sys.exit(main())
    
