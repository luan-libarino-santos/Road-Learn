module.exports = {
  apps: [
    {
      name: "road-learn",
      script: ".venv/bin/gunicorn",
      args: "--workers 1 --threads 2 --timeout 60 --max-requests 500 --max-requests-jitter 50 --bind 0.0.0.0:8002 config.wsgi:application",
      cwd: __dirname,
      interpreter: "none",
      env: {
        DJANGO_SETTINGS_MODULE: "config.settings",
        HOST: "0.0.0.0",
        PORT: "8002",
      },
    },
  ],
};
