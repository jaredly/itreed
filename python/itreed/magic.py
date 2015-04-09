#!/usr/bin/env python

from __future__ import print_function
from IPython.core.magic import (Magics, magics_class, line_magic,
                                cell_magic, line_cell_magic)
import json
import ast

@magics_class
class MyMagics(Magics):

    def __init__(self, *a, **k):
        Magics.__init__(self, *a, **k)

        self.modules = {}

    def get_namespaces(self, namespaces):
        globz = self.shell.user_global_ns.copy()
        last = namespaces.pop(-1)
        ns = self.shell.user_ns.get('modules', {})
        self.shell.user_ns['modules'] = ns
        for name in namespaces:
            if name not in ns:
                ns[name] = {}
            ns = ns[name]
            for sub in ns:
                globz[sub] = ns[sub]
        if last not in ns:
            ns[last] = {}
        local = ns[last]
        return globz, local

    @cell_magic
    def rmagic(self, line, cell):
        try:
            items = json.loads(line)
        except:
            items = [line]
        globz, local = self.get_namespaces(items)
        result = execute(cell, '<cell>', globz, local)
        if isinstance(result, Exception):
            raise result
        return result

    '''
    @line_cell_magic
    def lcmagic(self, line, cell=None):
        "Magic that works both as %lcmagic and as %%lcmagic"
        if cell is None:
            print("Called as line magic")
            return line
        else:
            print("Called as cell magic")
            return line, cell

    @line_magic
    def lmagic(self, line):
        "my line magic"
        print("Full access to the main IPython object:", self.shell)
        print("Variables in the user namespace:", list(self.shell.user_ns.keys()))
        return line
    '''

def execute(code, filename, global_ns, local_ns):
    try:
        tree = compile(code, filename, 'exec', ast.PyCF_ONLY_AST)
    except Exception as e:
        print("Syntax", e)
        return e
    expressions = tree.body
    results = []
    try:
        for item in tree.body:
            if isinstance(item, ast.Expr):
                code = compile(ast.Expression(item.value, lineno=item.lineno, col_offset=item.col_offset), filename, 'eval')
                results.append(eval(code, global_ns, local_ns))
            else:
                code = compile(ast.Module([item]), filename, 'exec')
                exec(code, global_ns, local_ns)
    except Exception as e:
        print("Failure!", e)
        return e
    return results


# vim: et sw=4 sts=4
