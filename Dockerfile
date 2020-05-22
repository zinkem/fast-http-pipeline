FROM node as http_pipeline_depdendencies
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

#FROM http_pipeline_depdendencies as http_pipeline_tests
#COPY lib lib/
#COPY index.js ./
#COPY test test/
#RUN npm test

FROM http_pipeline_depdendencies as http_pipeline
#COPY lib/ lib/
COPY index.js ./
#COPY server.js ./
CMD npm start
