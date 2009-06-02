#! /bin/bash

NOMBRE="informe.tex apendices/protopy.tex apendices/doff.tex"

while  inotifywait -e modify $NOMBRE ; do
    yes R | pdflatex $NOMBRE 
done
