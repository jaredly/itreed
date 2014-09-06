
ARGS=-t [ reactify --es6 --everything --visitors jstransform/visitors/es6-destructuring-visitors ]

all: js css

js:
	browserify ${ARGS} -d run.js -o www/build.js

watch:
	watchify -v ${ARGS} -d run.js -o www/build.js

css:
	lessc index.less www/build.css

start-ipython:
	ipython notebook --NotebookApp.allow_origin='*'

.PHONY: css watch js all start-ipython

