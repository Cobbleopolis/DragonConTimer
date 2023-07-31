FROM node
LABEL MAINTAINER="Cobbleopolis <cobbleopolis@gmail.com>"
HEALTHCHECK --interval=1m --timeout=5s CMD wget --quiet --tries=1 --spider http://localhost:9000/alive || exit 1
ADD --chown=node:node packages/server /home/node/
ADD --chown=node:node packages/client/dist /home/node/public
ADD --chown=node:node packages/common /home/node/common
USER node
WORKDIR /home/node
RUN ["npm", "install", "./common"]
RUN ["npm", "install", "--omit=dev"]
ENV NODE_ENV=production
EXPOSE 9000
ENTRYPOINT ["node", "/home/node/server.js"]