```bash
echo "== deploy root ==" && ls -la /home/thechoosentalks/deploy/apps/thechoosentalks
echo "== releases ==" && ls -la /home/thechoosentalks/deploy/apps/thechoosentalks/releases
echo "== current target ==" && readlink -f /home/thechoosentalks/deploy/apps/thechoosentalks/current
echo "== current routes ==" && find /home/thechoosentalks/deploy/apps/thechoosentalks/current/routes -maxdepth 2 -type f | sort
echo "== public_html ==" && find /home/thechoosentalks/public_html -maxdepth 2 | sort
echo "== current api routes ==" && cd /home/thechoosentalks/deploy/apps/thechoosentalks/current && php artisan route:list | grep -i api
```
