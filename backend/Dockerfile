FROM python:3.11-slim

WORKDIR /app

# Copy the current directory into /app respecting .dockerignore
COPY . /app/

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

# Used for python logging
ENV PYTHONUNBUFFERED 1

# Run main.py FAST API when the container launches
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 