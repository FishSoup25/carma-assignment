# Error in carma testing
_Exported on 7/29/2026 at 11:46:52 GMT+2 from Cursor (3.10.15)_

---

**User**

@\home\user\.cursor\projects\home-user-testing-grounds-carma-testing\terminals\1.txt:88-130 fix the error

---

**Cursor**

The Docker build fails because `@carma/shared` isn't on npm — I'll inspect the monorepo layout and Docker setup to wire in the local package.


The backend image builds in isolation, so npm can't resolve the local `@carma/shared` workspace — I'll update the Dockerfiles and compose config to build from the monorepo root.


Verifying the Docker build succeeds:


---

**User**

@\home\user\.cursor\projects\home-user-testing-grounds-carma-testing\terminals\1.txt:184-533 

---

**Cursor**

Build succeeded; the backend can't reach Postgres because it's using `localhost` inside Docker. I'll check the env and compose config to point it at the postgres service.


---

**User**

continue

---

**Cursor**

Updating Docker Compose so the backend uses the `postgres` service hostname instead of `localhost`.


Restarting the backend container to apply the database connection fix.


The build issue is fixed. The new error is a **runtime networking** problem: inside the backend container, `localhost:5432` points at the backend itself, not Postgres. In Docker Compose, the database host must be the service name `postgres`.

I updated `docker-compose.yml` to override the DB connection for the backend container only (local dev in `backend/.env` stays on `localhost`):

```27:29:docker-compose.yml
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-carma}:${POSTGRES_PASSWORD:-carma_dev_password}@postgres:5432/${POSTGRES_DB:-carma}
      POSTGRES_HOST: postgres
```

Recreate the backend to pick this up:

```bash
docker compose --profile full up -d --force-recreate backend
```

Or restart the whole stack:

```bash
docker compose --profile full down
docker compose --profile full up --build
```

After that, the `ECONNREFUSED` errors should stop. If the UI is empty, seed the database from the host:

```bash
npm run seed:articles
```

