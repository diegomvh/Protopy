RST2S5=$(shell which rst2s5 || which rst2s5.py)
TARGET=index.html
THEME=small-white

all: $(TARGET) 


index.html: pres.txt
	$(RST2S5) --theme=$(THEME) $^ $@

clean:
	-rm -r $(TARGET) ui
	
re: clean all
