FROM node
LABEL MAINTAINER="Cobbleopolis <cobbleopolis@gmail.com>"
HEALTHCHECK --interval=1m --timeout=5s CMD wget --quiet --tries=1 --spider http://localhost:9000/alive || exit 1
ADD --chown=node:node packages/server/dist /home/node/
ADD --chown=node:node packages/client/dist /home/node/public
USER node
WORKDIR /home/node
RUN ["npm", "install", "--only=production", "--silent"]
ENV NODE_ENV=production
EXPOSE 9000
ENTRYPOINT ["node", "/home/node/server.js"]