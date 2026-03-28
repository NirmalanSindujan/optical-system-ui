# Eyedeal Frontend

## Production deployment with Nginx

This frontend is configured to call the backend through `/api` in production.

### Build

```powershell
npm install
npm run build
```

### Deploy frontend

Copy the `dist` folder to:

```text
/var/www/eyedeal
```

### Nginx

Use [nginx.conf](/e:/Hashup/Eyedeal/FE/nginx.conf) as the server config template.

Important:

- The frontend is served from `/var/www/eyedeal`
- Requests to `/api` are proxied to `http://127.0.0.1:8080`
- Change the backend port in `nginx.conf` if your backend uses a different port

### Example server steps

```bash
sudo mkdir -p /var/www/eyedeal
sudo cp -r dist/* /var/www/eyedeal/
sudo cp nginx.conf /etc/nginx/sites-available/eyedeal
sudo ln -s /etc/nginx/sites-available/eyedeal /etc/nginx/sites-enabled/eyedeal
sudo nginx -t
sudo systemctl restart nginx
```

### SSL

For production, attach a domain and enable HTTPS with Let's Encrypt.
