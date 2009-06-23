'''
Created on 30/05/2009

@author: defo
'''

from pprint import pformat


def html_output( obj, **kwargs ):
    '''
    Generates HTML output for debugging purposes
    '''
    output = pformat(obj, **kwargs)
    output = u'<pre>%s</pre>' % output.replace('\n', '<br />')
    return output
