FROM crccheck/hello-world

RUN echo "1" && sleep 4 && echo "2" && sleep 4 && echo "3" && sleep 4 && echo "4" && sleep 4 && echo "5" && sleep 4 && echo "6" && sleep 4 && echo "7" && sleep 4 && echo "8" && sleep 4 && echo "9" && sleep 4 && echo "10"

ENV PORT=80

CMD echo "httpd started" && trap "exit 0;" TERM INT; httpd -v -p $PORT -h /www -f & wait
