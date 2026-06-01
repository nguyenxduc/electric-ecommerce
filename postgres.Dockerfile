FROM postgres:15-alpine

# Install pgvector
RUN apk add --no-cache git postgresql-dev build-base && \
    git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git && \
    cd pgvector && \
    make && \
    make install && \
    cd .. && \
    rm -rf pgvector && \
    apk del postgresql-dev build-base git
