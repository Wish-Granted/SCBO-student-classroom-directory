bind = "127.0.0.1:8000"
workers = 4
worker_class = "sync"

log_level = "debug"
accesslog = "-"
errorlog = "-"

access_log_format = '%(t)s "%(r)s" %(s)s %(b)s %(L)ss'
