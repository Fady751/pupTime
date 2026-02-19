# PUPtime Backend

This is the Django API for the PUPtime app.

Below are step‑by‑step instructions to get it running for the first time.

---

## 1. Prerequisites

Make sure you have:

- Python 3.10+ installed (`python3 --version`)
- `pip` available (`python3 -m pip --version`)
- Git (only needed if you are cloning the repo)

All other Python dependencies are installed from `requirements.txt`.

---

## 2. Clone the repository (if needed)

From any folder on your machine:

```bash
git clone https://github.com/Fady751/pupTime.git
cd pupTime/Backend
```

If you already have the project, just `cd` into the `Backend` folder.

---

## 3. Create and activate a virtual environment

From the `Backend` directory:

```bash
python3 -m venv venv
```

Then activate it:

**Linux/macOS:**

```bash
source venv/bin/activate
```

**Windows (PowerShell or CMD):**

```bash
venv\Scripts\activate
```

You should now see `(venv)` in your terminal prompt.

---

## 4. Install Python dependencies

With the virtual environment active:

```bash
pip install -r requirements.txt
```

---

## 5. Configure environment variables

In the `Backend` folder:

```bash
cp ".env example.txt" .env
```

Open `.env` and update the values as needed:

- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`: standard Django settings.
- `USE_SQLITE`: when `True`, Django uses the local `db.sqlite3`; when `False`, it connects to Supabase/PostgreSQL.
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`: Supabase/PostgreSQL connection details (only used if `USE_SQLITE=False`).

If you are just running the project locally for the first time, keeping `USE_SQLITE=True` is usually the easiest.

---

## 6. Apply database migrations

Still in the `Backend` directory and with the virtual environment active:

```bash
python manage.py makemigrations
python manage.py migrate
```

This creates or updates the database schema.

---

## 7. Load initial data

### Interests data

```bash
python manage.py load_interests
```

This reads the JSON in the `user` app and populates the `InterestCategory` and `Interest` tables. It is safe to run multiple times (existing entries are skipped).

You may also have other management commands (for example, to load users, friendships, or tasks). They can be run in a similar way:

```bash
python manage.py load_users
python manage.py load_friendships
python manage.py load_tasks
```

Run only the ones you need; all are safe to run after migrations.

---

## 8. Run the development server

```bash
python manage.py runserver
```

By default, the API will be available at:

- http://127.0.0.1:8000/

Leave this terminal running while you use the mobile app frontend.

---

## 9. Run backend tests

To run the test suite for the backend:

```bash
python manage.py test
```

You can also run tests for a single app, for example:

```bash
python manage.py test user
```

---

## 10. Frontend (mobile app) – quick pointer

The React Native frontend lives in the `frontEnd/pupTime` folder at the root of the repository.

To work on the mobile app you typically:

```bash
cd ../frontEnd/pupTime
npm install
npm start
```

Make sure the Django server from step 8 is still running so the app can talk to the API.

---

You should now have the PUPtime backend running locally and ready to use with the mobile app.

