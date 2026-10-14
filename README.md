# Memorize Direito — app

App Android do Memorize Direito (Expo / React Native). Usa a mesma API da web, `https://memorizedireito.com/api/v1`, tanto em desenvolvimento quanto em produção (`src/api/client.ts`).

## Rodar em desenvolvimento

```bash
npm install
npx expo start
```

Abra no celular com um build de desenvolvimento ou com um Expo Go compatível com o SDK 54.

## Publicar uma nova versão

1. Mudou algo na API (rota ou campo novo)? Publique a web **antes** — ver o README do projeto web.
2. Confira o código:
   ```bash
   npm run avatar:check
   npx tsc --noEmit
   ```
3. Suba o `version` em `app.json` (ex.: `1.0.0` → `1.1.0`). O número interno do build o EAS incrementa sozinho.
4. Gere o pacote da Play Store e envie:
   ```bash
   eas build -p android --profile production
   eas submit -p android --latest
   ```
   Na primeira vez o `eas submit` pede a chave de conta de serviço do Google. Dá também para baixar o `.aab` no painel do EAS e enviar pelo Play Console.

Para testar antes num APK instalável, fora da loja: `eas build -p android --profile preview`.

As pastas `android/` e `ios/` não vão para o git: o EAS as gera a partir do `app.json`. Configuração nativa (ícone, permissões, pacote) se muda lá.

## Avatar

`src/lib/avatar/` é **cópia** da lib de avatar da web — não edite aqui. Depois de mexer no avatar da web:

```bash
npm run avatar:sync
```

As peças são desenhadas por esse código, dentro do app, e não baixadas da web: peça nova só chega ao celular numa versão nova do app.
