FROM crccheck/hello-world

RUN sleep 60

ENV PORT=80

CMD echo "httpd started" && trap "exit 0;" TERM INT; httpd -v -p $PORT -h /www -f & wait
