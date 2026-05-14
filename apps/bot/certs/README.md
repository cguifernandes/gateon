# Certificados locais (TLS / PEM)

Use esta pasta **só** para ficheiros de confiança **locais** (por exemplo a CA raiz que o proxy/antivírus da empresa usa para inspecionar HTTPS). Não faças commit de `.pem` com segredos.

## Quando precisas disto

- Se `npm run dev` já funciona com `--use-system-ca` (Node 22+), normalmente **não** precisas de PEM aqui.
- Se ainda vês `unable to verify the first certificate`, exporta a **cadeia / raiz** que assina `api.telegram.org` no teu ambiente e aponta o Node para ela.

## Passos

1. Obtém o certificado raiz (ou um bundle PEM) em formato **PEM** (blocos `-----BEGIN CERTIFICATE-----` … `-----END CERTIFICATE-----`). O IT da empresa costuma fornecer um ficheiro `corp-root.pem` ou similar.
2. Copia o ficheiro para esta pasta, por exemplo: `certs/corp-root.pem`.
3. No `apps/bot/.env` (não commitares), define:

   ```env
   NODE_EXTRA_CA_CERTS=certs/corp-root.pem
   ```

   O caminho é relativo à pasta `apps/bot`. Caminhos absolutos (ex.: `C:\ssl\corp-root.pem`) também funcionam.

4. Mantém nos scripts o `NODE_OPTIONS=--use-system-ca` (já está no `package.json` do bot). O Node **soma** a loja do sistema com o PEM extra.

## Vários CAs num só ficheiro

No Git Bash / WSL / macOS / Linux:

```bash
cat corp-root.pem another-ca.pem > certs/bundle.pem
```

No `NODE_EXTRA_CA_CERTS` usa `certs/bundle.pem`.

## Não usar em produção sem critério

Evita `NODE_TLS_REJECT_UNAUTHORIZED=0` (desliga verificação TLS).
