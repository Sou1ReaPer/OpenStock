#!/usr/bin/env bash
#
# One-shot launcher for local development.
#
#   ./scripts/dev.sh          start everything (default)
#   ./scripts/dev.sh stop     stop the Next.js and Inngest processes
#   ./scripts/dev.sh restart  stop, then start
#   ./scripts/dev.sh status   show what is running
#   ./scripts/dev.sh logs     tail both logs
#
# Starts: MongoDB (docker container), Next.js dev server, Inngest dev server.
# The MongoDB container is left running by `stop`, since it restarts with Docker anyway.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MONGO_CONTAINER=openstock-mongodb
APP_PORT=3000
INNGEST_PORT=8288
RUN_DIR="$ROOT/.dev"
INNGEST_BIN="${INNGEST_BIN:-$HOME/.cache/openstock-npx/_npx/84e0b49cabd4122d/node_modules/inngest-cli/bin/inngest}"

mkdir -p "$RUN_DIR"

log()  { printf '\033[36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[31mx\033[0m %s\n' "$*" >&2; exit 1; }

port_pid() { lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -1; }

wait_for_http() { # url, seconds
    local url=$1 deadline=$((SECONDS + ${2:-60}))
    while (( SECONDS < deadline )); do
        if curl -s -o /dev/null -m 3 --noproxy '*' "$url"; then return 0; fi
        sleep 1
    done
    return 1
}

start_mongo() {
    docker info >/dev/null 2>&1 || die "Docker is not running - start Docker (OrbStack) first."

    case "$(docker inspect -f '{{.State.Status}}' "$MONGO_CONTAINER" 2>/dev/null || echo missing)" in
        running) log "MongoDB already running ($MONGO_CONTAINER)" ;;
        missing) die "Container $MONGO_CONTAINER not found. Recreate it, or point MONGODB_URI at another database." ;;
        *)       log "Starting MongoDB ($MONGO_CONTAINER)"; docker start "$MONGO_CONTAINER" >/dev/null ;;
    esac
}

start_app() {
    local pid
    pid=$(port_pid "$APP_PORT" || true)
    if [[ -n "$pid" ]]; then
        log "Next.js already listening on :$APP_PORT (pid $pid)"
        return
    fi
    log "Starting Next.js dev server"
    nohup npm run dev >"$RUN_DIR/next.log" 2>&1 &
    echo $! >"$RUN_DIR/next.pid"
    wait_for_http "http://localhost:$APP_PORT/sign-in" 90 \
        || die "Next.js did not come up - see $RUN_DIR/next.log"
}

start_inngest() {
    local pid
    pid=$(port_pid "$INNGEST_PORT" || true)
    if [[ -n "$pid" ]]; then
        log "Inngest already listening on :$INNGEST_PORT (pid $pid)"
    else
        [[ -x "$INNGEST_BIN" ]] || die "Inngest CLI not found at $INNGEST_BIN (override with INNGEST_BIN=...)"
        log "Starting Inngest dev server"
        nohup "$INNGEST_BIN" dev -u "http://localhost:$APP_PORT/api/inngest" --no-discovery \
            >"$RUN_DIR/inngest.log" 2>&1 &
        echo $! >"$RUN_DIR/inngest.pid"
        wait_for_http "http://localhost:$INNGEST_PORT/" 60 \
            || die "Inngest did not come up - see $RUN_DIR/inngest.log"
    fi

    # Register the four background functions with the dev server.
    curl -s -m 10 --noproxy '*' -X PUT "http://localhost:$APP_PORT/api/inngest" >/dev/null || true
}

check_env() {
    [[ -f .env ]] || die ".env is missing - see README for the required variables."
    grep -q '^NEXT_PUBLIC_FINNHUB_API_KEY=.\+' .env \
        || warn "NEXT_PUBLIC_FINNHUB_API_KEY is empty - search, news and price alerts will not work."
}

stop_one() { # name, pidfile, port
    local name=$1 pidfile=$2 port=$3 pid=""
    [[ -f "$pidfile" ]] && pid=$(cat "$pidfile")
    [[ -z "$pid" ]] && pid=$(port_pid "$port" || true)
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
        log "Stopping $name (pid $pid)"
        # npm run dev spawns next as a child, so take the children down too
        pkill -TERM -P "$pid" 2>/dev/null || true
        kill -TERM "$pid" 2>/dev/null || true
        for _ in 1 2 3 4 5; do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
        kill -0 "$pid" 2>/dev/null && kill -KILL "$pid" 2>/dev/null || true
    else
        log "$name is not running"
    fi
    rm -f "$pidfile"
}

cmd_start() {
    check_env
    start_mongo
    start_app
    start_inngest
    echo
    log "App:     http://localhost:$APP_PORT"
    log "Inngest: http://localhost:$INNGEST_PORT"
    log "Logs:    ./scripts/dev.sh logs"
}

cmd_stop() {
    stop_one "Next.js" "$RUN_DIR/next.pid" "$APP_PORT"
    stop_one "Inngest" "$RUN_DIR/inngest.pid" "$INNGEST_PORT"
    log "MongoDB container left running (docker stop $MONGO_CONTAINER to stop it)"
}

cmd_status() {
    docker inspect -f "MongoDB  : {{.State.Status}}" "$MONGO_CONTAINER" 2>/dev/null || echo "MongoDB  : missing"
    local p
    p=$(port_pid "$APP_PORT" || true)
    echo "Next.js  : $([[ -n $p ]] && echo "running (pid $p)" || echo stopped) - http://localhost:$APP_PORT"
    p=$(port_pid "$INNGEST_PORT" || true)
    echo "Inngest  : $([[ -n $p ]] && echo "running (pid $p)" || echo stopped) - http://localhost:$INNGEST_PORT"
}

case "${1:-start}" in
    start)   cmd_start ;;
    stop)    cmd_stop ;;
    restart) cmd_stop; sleep 1; cmd_start ;;
    status)  cmd_status ;;
    logs)    tail -f "$RUN_DIR/next.log" "$RUN_DIR/inngest.log" ;;
    *)       die "Usage: $0 [start|stop|restart|status|logs]" ;;
esac
