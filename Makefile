
ARGS=-t [ reactify --es6 --everything --visitors jstransform/visitors/es6-destructuring-visitors ]

all: js css

pages:
	lessc -x run.less pages/demo/build.css
	browserify ${ARGS} run.js | uglifyjs --screw-ie8 > pages/demo/build.js

js:
	browserify ${ARGS} -d run.js -o www/build.js

watch:
	watchify -v ${ARGS} -d run.js -o www/build.js

css:
	lessc run.less www/build.css

start-ijulia:
	ipython notebook --NotebookApp.allow_origin='*' --profile=julia

start-ipython:
	ipython notebook --NotebookApp.allow_origin='*'

dumb-server:
	cd www; python -mSimpleHTTPServer

vendor: www/vendor/d3.js www/vendor/vega.js

www/vendor/d3.js:
	wget http://trifacta.github.io/vega/lib/d3.v3.min.js -O www/vendor/d3.js

www/vendor/vega.js:
	wget http://trifacta.github.io/vega/vega.js -O www/vendor/vega.js

.PHONY: css watch js all start-ipython pages vendor

