bind = "127.0.0.1:8000"

worker_class = "gthread"
workers = 2
threads = 4

log_level = "info"
accesslog = "-"
errorlog = "-"

timeout = 30
graceful_timeout = 30
keepalive = 5

access_log_format = '%(t)s "%(r)s" %(s)s %(b)s %(L)ss'