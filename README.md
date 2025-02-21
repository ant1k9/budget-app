## Budget app

### How to start

1. Choose a free plan for Postgres database on [Neon.tech](https://neon.tech/pricing)
2. Copy database connection string
3. Create sessions table:

    ```bash
    $ cat migrations/sessions.sql | psql "$DATABASE_URL"
    ```

4. Fork this repository
5. Create a hobby plan account on [Render](https://render.com/)
6. Create an app from this repository with settings:
    - Root directory should be blank
    - Build command should be `npm install && npm run build`
    - Start command should be `npm run start`
7. Add environment variables:
    - `DATABASE_URL` - connection string from Neon DB
    - `SESSION_SECRET` - any string you want
    - `APP_PASSWORD` - password that you will use to authenticate to the application
8. 🎉
