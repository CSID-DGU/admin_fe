# DGU AI Lab Frontend

React 19 + Vite + Tailwind frontend for DGU AI Lab.

## Requirements
- Node 24
- pnpm 10

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
- Install: `pnpm install`
- Dev server: `pnpm dev` → http://localhost:5173
- Lint: `pnpm lint`
- Build: `pnpm build`
- Preview build: `pnpm preview`

## Deploy
- Docker: `docker build -t ailab-frontend:latest .` then `docker run -d -p 80:80 ailab-frontend:latest`
- Kubernetes: this repo no longer deploys itself. The admin_infra
  `Deploy Proposed Stack` workflow builds this repo at `fe_ref` into a
  stack-specific image (it rewrites the `/api/` and `/pod-status/` targets in
  `nginx.conf` to that stack) and deploys it. The main address is routed to
  the operation stack by admin_infra-proposed `stack-up.sh`.

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

## 브랜치·배포 규칙

admin_fe·admin_be·admin_infra·admin_infra-proposed 네 저장소가 같은 규칙을 쓴다. 전문은 admin_wiki [`md/브랜치-규칙.md`](https://github.com/CSID-DGU/admin_wiki/blob/main/md/브랜치-규칙.md).

- 브랜치는 `main` 하나다. 작업은 `main`에서 `<커밋 타입>/v<버전>-<짧은 설명>` 브랜치를 따서(예: `fix/v3.0-returning-user-uid`) PR로 `main`에 squash 병합한다.
- PR은 CI(테스트) 통과가 필요하다.
- 어느 브랜치에 push해도 자동 배포는 없다. 배포는 admin_infra의 **Deploy Proposed Stack** 워크플로로만 한다.
- 실험 스택은 `main`(또는 작업 브랜치)을, 운영(operation)은 네 저장소에 같은 이름으로 찍은 릴리스 태그 `vX.Y.Z`만 배포한다.
