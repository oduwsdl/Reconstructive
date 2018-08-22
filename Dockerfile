FROM    node

WORKDIR /src
COPY    package*.json ./
RUN     npm install
COPY    . ./
VOLUME  /src/node_modules

CMD     npm run test && npm run docs && npm run dist && npm run diff && npm run dev

# docker image build -t reconstructive .
# docker container run -it --rm -p 5000:5000 -v "$PWD":/src reconstructive
