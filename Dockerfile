FROM node:4.6.1

ADD . /opt/cimpler
WORKDIR /opt/cimpler
RUN npm install

EXPOSE 12345

CMD /opt/cimpler/bin/cimpler server
