FROM    node

WORKDIR /src
COPY    package*.json ./
RUN     npm install
COPY    . ./

CMD     npm run docs && npm run dev
