FROM nginx:alpine

RUN apk update && \
    apk add --no-cache openssl

RUN rm /etc/nginx/conf.d/default.conf && \
    rm /etc/nginx/nginx.conf

RUN mkdir -p /etc/ssl/private/ && mkdir -p /etc/ssl/certs/ && \
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
   -keyout /etc/ssl/private/nginx.key \
   -out /etc/ssl/certs/nginx.crt \
   -subj "/C=TR/ST=Kocaeli/L=Kocaeli/O=Ecole42/OU=fttranscendence/CN=${SSL_CN}"

COPY ./nginx.conf /etc/nginx/nginx.conf
COPY . /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]