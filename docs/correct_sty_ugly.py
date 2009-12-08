#!/usr/bin/env python

import sys
import os
import re
#import log
re_fancy = re.compile(r'''
\\RequirePackage{fancyhdr}
''', re.VERBOSE | re.UNICODE)



def main(argv = sys.argv):
    ''' Entry point'''
    print "Hacking STY"
    path = os.path.dirname(__file__)
    path = os.path.abspath(path)
    sty_file = os.path.join(path, '_build', 'latex', 'sphinx.sty')
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
    
    
    

if __name__ == "__main__":
    sys.exit(main())
    
