RST2S5=$(shell which rst2s5 || which rst2s5.py)
TARGET=slides.
THEME=small-white

#all: $(TARGET)
all: rst2pdf

html: index.html

index.html: pres.txt
	$(RST2S5) --theme=$(THEME) $^ $@

clean:
	-rm -r $(TARGET) ui
	
re: clean all


rst2pdf: slides.pdf

slides.pdf: slides.txt slides.style
	rst2pdf slides.txt -b1 -s slides.style