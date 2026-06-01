FROM docker:27-cli
RUN apk add --no-cache python3
WORKDIR /app
COPY wakeup.py .
CMD ["python3", "wakeup.py"]
