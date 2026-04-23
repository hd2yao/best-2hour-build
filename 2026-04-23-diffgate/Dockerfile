FROM python:3.12-slim

WORKDIR /app

COPY diffgate/ ./diffgate/
COPY pyproject.toml .

# Do not copy .env.example to .env in image.
RUN pip install --no-cache-dir -e .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "diffgate.main:app", "--host", "0.0.0.0", "--port", "8000"]
