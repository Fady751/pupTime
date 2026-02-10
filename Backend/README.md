# PUPtime Backend

## Setup & Run

### 1. Create a virtual environment

```bash
python3 -m venv venv
```

### 2. Activate the virtual environment

**Linux/macOS:**
```bash
source venv/bin/activate
```

**Windows:**
```bash
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Load interests data

```bash
python manage.py load_interests
```

This reads `user/data.json` and populates the `InterestCategory` and `Interest` tables. Safe to run multiple times (skips existing entries).

### 6. Run the server

```bash
python manage.py runserver
```

### 7. Run tests

```bash
python manage.py test user
```

