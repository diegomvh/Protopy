#!/usr/bin/env python

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
        twoside
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
    

def main(argv = sys.argv):
    print("HACKING SPHINX OUTPUT... (this should take no time)")
    remove_twopage_parameter()
    fix_encoding_for_OpenOffice_org()
    remove_empty_chapters()
    print("END OF SPHINX OUTPUT HACKING")

if __name__ == "__main__":
    sys.exit(main())
    
