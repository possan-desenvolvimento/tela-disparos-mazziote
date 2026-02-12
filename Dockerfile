FROM nginx:alpine

# Copia tudo da pasta front para o nginx
COPY . /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]