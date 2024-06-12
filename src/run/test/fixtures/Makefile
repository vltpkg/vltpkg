all: build

build: $(shell ls *.ts | grep -v '\.d\.ts' | sed -e 's#\.ts$$#.js#')

%.js: %.ts
	tsc

clean:
	rm -f *.js *.map *.d.ts

.PHONY: all build
