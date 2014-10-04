#!/usr/bin/env python

from .formatter import VegaFormatter, formatter
from vincent.core import GrammarClass
from IPython.display import display
import traceback

def grammer_json(obj):
    if hasattr(obj, 'grammar'):
        return grammer_json(obj.grammar)
    if isinstance(obj, (list, tuple)):
        return map(grammer_json, obj)
    if isinstance(obj, dict):
        return {key: grammer_json(value) for key, value in obj.items()}
    return obj

def display_grammar(grammar):
    '''
    try:
        raise Exception()
    except:
        print "Awe"
        traceback.print_stack()
    '''
    obj = grammer_json(grammar)
    display({'json/vega': obj}, raw=True)

formatter.for_type(GrammarClass, display_grammar)

# vim: et sw=4 sts=4
