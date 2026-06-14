# Admin results page for Sportchat Predict

Додає захищену сторінку:

```text
/admin-results.html
```

## Файли

```text
admin-results.html
netlify/functions/_auth.js
netlify/functions/admin-login.js
netlify/functions/admin-matches.js
netlify/functions/update-result.js
```

У пакеті також є `_supabase.js`, якщо треба оновити/додати його.

## Netlify Environment Variables

У Netlify додай:

```text
ADMIN_USERNAME
ADMIN_PASSWORD
ADMIN_TOKEN_SECRET
```

Приклад:

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=твій_пароль
ADMIN_TOKEN_SECRET=tnLi1vKO3zuanwrv1EyenrXPvUQNDrivXEe0jXr2PwI
```

`ADMIN_PASSWORD` і `ADMIN_TOKEN_SECRET` відмічай як secret values.

Уже існуючі змінні мають залишитись:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Після додавання env variables зроби:

```text
Deploys → Trigger deploy → Deploy site
```

## Як користуватись

1. Відкрий:
   ```text
   https://твій-сайт.netlify.app/admin-results.html
   ```
2. Увійди логіном і паролем.
3. Обери матч.
4. Введи реальний рахунок, наприклад `2-1`.
5. Натисни `Оновити результат`.

Після збереження Supabase оновить `matches`, а `leaderboard` перерахується автоматично.
