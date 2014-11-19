#!/usr/bin/env python

'''
This is where I try to do completely crazy things. I might just want to extend
IPython, but I figure "why not?"
'''

import ast

class Kernel:
    def __init__(self):
        self.modules = {None: None}
        self.global_ns = {}
    
    def execute(self, code, module=None):
        print '<<', [code], module
        if module not in self.modules:
            self.modules[module] = {}
        tree = compile(code, '<string>', 'exec', ast.PyCF_ONLY_AST)
        expressions = tree.body
        results = []
        try:
            for item in tree.body:
                if isinstance(item, ast.Expr):
                    code = compile(ast.Expression(item.value, lineno=item.lineno, col_offset=item.col_offset), '<string>', 'eval')
                    results.append(eval(code, self.global_ns, self.modules[module]))
                else:
                    code = compile(ast.Module([item]), '<string>', 'exec')
                    exec(code, self.global_ns, self.modules[module])
        except Exception as e:
            print 'Failure!', e
        return results

'''
tester.py

print "Done been imported"
'''

if __name__ == '__main__':
    import tester
    tester.roo = 123

    print "ASDJKAS"

    k = Kernel()
    print k.execute('3+4')
    print k.execute('e = 5')
    print k.execute('import tester')
    print k.execute('ab=4\n34**2\ne\nprint "hi"', 'one')
    print k.execute('ab')
    print k.execute('ab', 'one')
    print k.execute('tester.roo')


        

# vim: et sw=4 sts=4
