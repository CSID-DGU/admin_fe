# DGU AI Lab Frontend

React 19 + Vite + Tailwind frontend for DGU AI Lab.

## Requirements
- Node 16+
- npm

## Environment
- `.env.production` (committed, used in Docker/K8s):
  ```bash
  VITE_API_BASE_URL=http://210.94.179.19:9796
  VITE_NODE_ENV=production
  ```
- `.env` (local override, git-ignored) example:
  ```bash
  VITE_API_BASE_URL=http://localhost:8080
  VITE_NODE_ENV=development
  ```

## Commands
- Install: `npm install`
- Dev server: `npm run dev` → http://localhost:5173
- Build: `npm run build`
- Preview build: `npm run preview`

## Deploy
- Docker: `docker build -t ailab-frontend:latest .` then `docker run -d -p 80:80 ailab-frontend:latest`
- Kubernetes (manual):
  ```bash
  docker build -t ailab-frontend:latest .
  docker tag ailab-frontend:latest dguailab/ailab-frontend:latest
  docker push dguailab/ailab-frontend:latest
  kubectl apply -f k8s/namespace.yaml
  kubectl apply -f k8s/deployment.yaml
  kubectl apply -f k8s/service.yaml
  kubectl apply -f k8s/ingress.yaml
  kubectl rollout status deployment/ailab-frontend -n ailab-frontend
  ```
  - Or deploy through `./deploy.sh`

## TLS (self-signed)

The ingress controller terminates TLS on NodePort 30081. Browsers reaching the
cluster by IP send no SNI, so per-Ingress certificate matching does not apply —
the controller serves `controller.extraArgs.default-ssl-certificate` instead
(see `k8s/ingress-controller-values.yaml`).

Create the certificate once. The IP **must** be in `subjectAltName`; modern
browsers ignore `CN`.

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=210.94.179.18" \
  -addext "subjectAltName=IP:210.94.179.18"

kubectl create secret tls ailab-tls -n ailab-frontend \
  --cert=tls.crt --key=tls.key
```

Then apply the controller values (replace `<release>`/`<ns>` with the values
from `helm list -A | grep ingress`):

```bash
helm upgrade <release> ingress-nginx/ingress-nginx -n <ns> \
  -f k8s/ingress-controller-values.yaml
```

Verify:

```bash
openssl s_client -connect 210.94.179.18:30081 -servername 210.94.179.18 </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -ext subjectAltName -dates
```

Self-signed gives encryption but not server authentication — browsers show a
warning that users must click through. To replace it with a trusted
certificate later, only this Secret changes; nothing else in the chain does.
