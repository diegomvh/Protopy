#!/usr/bin/env python

'''
Crawls some local data such as States and Provinces for 
testing
'''
from pprint import pprint

def get_data():
    import re
    from lxml.html import parse
    from urlparse import urljoin
    BASE_URL = 'http://www.datacraft.com.ar/postal.html'
    
    CP_RE = re.compile(r'(?P<cp>\d{1,6})\s(?P<nombre>[\w\d\-\s]+)')
    VALID_URLS = re.compile(r'postal-(?P<nombre_prov>\w*).html$')
    
    paises = []
    
    argentina = {'nombre': 'Argentina', 'signo_moneda': 'AR$'}
    paises.append(argentina)
    argentina['provincias'] = []
    
    base = parse(BASE_URL)
    document = base.getroot()
    for link in document.cssselect('a'):
        href = link.get('href')
        
        match = VALID_URLS.match(href) 
        if match:
            full_url = urljoin(BASE_URL, href)
            nombre = match.groupdict()['nombre_prov'].capitalize()
            provincia = parse(full_url)
            contents = map(lambda td: td.text_content(), 
                            provincia.getroot().cssselect('td.pie'))
            for raw_text in contents:
                
                for line in raw_text.split('\r\n'):
                    cp_match = CP_RE.search(line)
                    if not cp_match: continue
                    cp = cp_match.groupdict()['cp']
                    ciudad = cp_match.groupdict()['nombre']
                    ciudad = ' '.join(map(lambda x:x.capitalize(), ciudad.lower().split()))
                    print cp, ciudad, '(%s)' % nombre
                    
#                for line in text:
#                    print "***", line, "***"
#                    match = CP_RE.search(line)
#                    if match:
#                        print match.groupdict()
                
            
    pprint(paises)
    
    
    
if __name__ == "__main__":
    print get_data()
