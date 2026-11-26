# QuizPlatform: инструкция по запуску

Веб-приложение для создания и прохождения квизов. Состоит из трёх частей:

| Часть | Технологии | Адрес |
|---|---|---|
| База данных | PostgreSQL | localhost:5432 |
| Сервер | Node.js, Express | localhost:3000 |
| Сайт | React, Vite | localhost:5173 |

## 1. Установить программы

1. **Node.js**, версия LTS: https://nodejs.org/
2. **PostgreSQL 19**: https://www.postgresql.org/download/windows/

При установке PostgreSQL оставьте отмеченными сервер и pgAdmin, порт - 5432. Установщик попросит придумать пароль пользователя postgres, его надо запомнить.

## 2. Скачать проект

Открыть https://github.com/LeVVeri/QuizPlatform, нажать Code → Download ZIP и распаковать архив.

## 3. Создать базу данных

Этот шаг выполняется один раз, в программе pgAdmin.

1. Раскрыть Servers → PostgreSQL 19 и ввести пароль из шага 1.
2. Нажать правой кнопкой на Databases → Create → Database…, ввести имя quiz_platform и сохранить.
3. Нажать правой кнопкой на quiz_platform → Query Tool. Откроется пустое поле для SQL-запросов.
4. В папке проекта открыть файл database/schema.sql, выделить весь текст и скопировать.
5. Вернуться в pgAdmin, вставить текст в поле запроса и нажать F5.

После этого в quiz_platform → Schemas → public → Tables (после ПКМ → Refresh) должно быть шесть таблиц.

## 4. Настроить и запустить сервер

Открыть папку backend в Проводнике, щёлкнуть по адресной строке, ввести "cmd" и нажать Enter. В открывшемся окне выполнить:

```bat
npm ci
copy .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
notepad .env
```

Третья команда выводит секретный ключ, четвёртая открывает файл настроек. Заполнить его так:

```ini
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=quiz_platform
DB_USER=postgres
DB_PASSWORD=пароль_из_шага_1
JWT_SECRET=сгенерированный_ключ
```

Порт 3000 не меняйть. Сохранить файл и запустить сервер:

```bat
npm start
```

Должно появиться "Server is running on http://localhost:3000". Это окно не закрывайть.

## 5. Запустить сайт

Таким же способом открыть второе окно cmd, теперь в папке frontend:

```bat
npm ci
npm run dev
```

Открыть в браузере: http://localhost:5173

## Следующие запуски

Нужны два окна cmd:

- в папке backend: npm start
- в папке frontend: npm run dev

Остановить: Ctrl+C в каждом окне.

## Особенности

- Вход действует 1 час. Если после этого появляются ошибки авторизации, нажать «Выйти» и войдти снова.
- Опубликованный квиз редактировать нельзя.

## Если что-то не работает

| Что видно | Что делать |
|---|---|
| node или npm не является командой | Установить Node.js и открыть окно cmd заново. |
| JWT_SECRET не задан в файле .env | Проверить, что есть файл backend/.env и в нём заполнен JWT_SECRET. Запускать сервер из папки backend. |
| password authentication failed в окне сервера | Пароль в .env не совпадает с паролем PostgreSQL. |
| ECONNREFUSED ... 5432 или ошибки без пояснения при запросах к базе | Открыть «Службы» Windows и запустить службу PostgreSQL. |
| database "quiz_platform" does not exist | Выполнить шаг 3. |
| relation "users" does not exist | Выполнить schema.sql именно в базе quiz_platform (шаг 3). |
| EADDRINUSE | Порт 3000 занят, обычно уже запущенной копией сервера. Закрыть её. |
| Vite открылся на порту 5174 | Порт 5173 занят. Закрыть старую копию сайта и запустить заново. |
| Failed to fetch в браузере | Не запущен сервер или сайт открыт не через http://localhost:5173. |
