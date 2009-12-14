SVGS=$(shell ls *.svg)
PDF_FROM_SVG=$(SVGS:.svg=.pdf)
TEMP_FILES=$(shell ls pres.* | grep -v *.tex)

all: pres.pdf 

pres.pdf: imagenes	

show_svgs:
	@echo ${PDF_FROM_SVG}

imagenes: ${PDF_FROM_SVG}

%.pdf: %.tex imagenes
#	yes R | pdflatex $^ || true
#	yes R | pdflatex $^ || true
	pdflatex $^
	pdflatex $^
	pdflatex $^

%.pdf: %.svg
	inkscape --file=$< -C --export-pdf=$@

clean_doc:
	-rm -rf $(TEMP_FILES)

safe: clean_doc all

clean:
	-rm -rf *.pdf *.snm *.toc *.nav *.aux *.out

re: clean all
