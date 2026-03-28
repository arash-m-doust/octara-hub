FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app/server

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential libpq-dev \
  && rm -rf /var/lib/apt/lists/*

COPY server/requirements.txt /app/server/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY server /app/server
RUN chmod +x /app/server/entrypoint.sh

EXPOSE 8010

CMD ["/app/server/entrypoint.sh"]
