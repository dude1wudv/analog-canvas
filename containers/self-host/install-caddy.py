"""Install only the Analog Canvas virtual host, with validation and rollback."""
import os
from pathlib import Path
import shutil
import subprocess
import time

config = Path("/etc/caddy/Caddyfile")
content = config.read_text()
domain = "analog.sunmmyapi.xyz"
if domain in content:
    raise SystemExit("Analog route already exists; inspect it before changing it.")
backup = config.with_name(f"Caddyfile.before-analog-{int(time.time())}")
candidate = config.with_name("Caddyfile.analog-candidate")
block = """

analog.sunmmyapi.xyz {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8787 {
        header_up CF-Connecting-IP {http.request.remote.host}
        flush_interval -1
    }
}
"""
shutil.copy2(config, backup)
shutil.copy2(config, candidate)
candidate.write_text(content.rstrip() + block)
subprocess.run(["caddy", "validate", "--config", str(candidate), "--adapter", "caddyfile"], check=True)
os.replace(candidate, config)
try:
    subprocess.run(["caddy", "reload", "--config", str(config), "--adapter", "caddyfile"], check=True)
except subprocess.CalledProcessError:
    shutil.copy2(backup, config)
    subprocess.run(["caddy", "reload", "--config", str(config), "--adapter", "caddyfile"], check=True)
    raise
print("Analog Canvas route installed; existing virtual hosts retained.")
