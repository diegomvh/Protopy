#!/usr/bin/env python
# -*- encoding: utf-8 -*-

'''
Corregir errores de codificacion fruto de la correccion ortográfica con OpenOffice.org
http://groups.google.com/group/sphinx-dev/msg/38a35ad8d8740590

'''

import glob, sys, re, os

exp = re.compile(r'''
\\usepackage\[utf8\]\{inputenc\}
''', re.VERBOSE | re.UNICODE)

replacement = '''
\usepackage{pstricks}  % since the dash is rendered by pstricks!
\usepackage[postscript]{ucs}
\usepackage[utf8x]{inputenc}
'''.strip()

def main(argv = sys.argv):
	files = argv[1:]
	for name in files:
		f = open(name)
		txt = f.read()
		f.close()
		print exp.search(txt) and "Match" or "Not Match",
		print len(txt), '->',
		txt = re.sub(exp, replacement, txt)
		print len(txt)
		f = open(name, 'w')
		f.write(txt)
		f.close()
		print "%s OK" % name

if __name__ == "__main__":
	sys.exit(main())
