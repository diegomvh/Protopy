#! /bin/bash

NOMBRE="informe.tex desarrollo/protopy.tex"

while  inotifywait -e modify $NOMBRE ; do
    yes R | pdflatex $NOMBRE 
done
