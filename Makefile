all:
	$(MAKE) -C docs

clean:
	$(MAKE) -C docs clean

re: clean all
