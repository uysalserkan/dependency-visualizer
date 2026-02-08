# Monitoring Setup Guide

This directory contains configuration files for monitoring the Dependency Visualizer application.

## Components

### 1. Prometheus
- **Purpose**: Metrics collection and storage
- **Config**: `prometheus.yml`
- **Port**: 9090
- **Metrics Endpoint**: `http://backend:8000/metrics`

### 2. Grafana
- **Purpose**: Metrics visualization
- **Dashboard**: `grafana-dashboard.json`
- **Port**: 3001
- **Default Credentials**: admin/admin

### 3. Alert Rules
- **Config**: `alerts/rules.yml`
- **Purpose**: Automated alerting based on metrics thresholds

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Add monitoring services to docker-compose
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### Option 2: Manual Setup

#### Start Prometheus

```bash
docker run -d \
  --name prometheus \
  --network dependency-visualizer_default \
  -p 9090:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v $(pwd)/monitoring/alerts:/etc/prometheus/alerts \
  prom/prometheus:latest
```

#### Start Grafana

```bash
docker run -d \
  --name grafana \
  --network dependency-visualizer_default \
  -p 3001:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana:latest
```

## Grafana Setup

### 1. Add Prometheus Data Source

1. Open Grafana: `http://localhost:3001`
2. Login (admin/admin)
3. Go to **Configuration** → **Data Sources**
4. Click **Add data source**
5. Select **Prometheus**
6. Set URL: `http://prometheus:9090`
7. Click **Save & Test**

### 2. Import Dashboard

1. Go to **Dashboards** → **Import**
2. Click **Upload JSON file**
3. Select `monitoring/grafana-dashboard.json`
4. Select Prometheus data source
5. Click **Import**

## Available Metrics

### Application Metrics

- `analysis_requests_total{status}` - Total analysis requests (counter)
- `analysis_duration_seconds` - Analysis duration histogram
- `cache_hits_total` - Cache hits counter
- `cache_misses_total` - Cache misses counter
- `active_analyses` - Currently running analyses (gauge)
- `memory_cache_size` - Items in memory cache (gauge)

### HTTP Metrics (from FastAPI Instrumentator)

- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration histogram
- `http_requests_inprogress` - In-progress requests

## Dashboard Panels

### Overview Stats
1. **Request Rate** - Requests per second
2. **Error Rate** - Percentage of failed requests
3. **Cache Hit Ratio** - Cache effectiveness
4. **Active Analyses** - Current workload

### Time Series
1. **Analysis Request Rate** - Success/error requests over time
2. **Analysis Duration** - P50, P95, P99 latencies
3. **Cache Performance** - Hits vs misses
4. **Memory Cache Size** - Cache utilization

## Alert Rules

### Warning Alerts (Review Required)
- High Error Rate (>5% for 5min)
- Slow Response Time (P95 >30s for 10min)
- Low Cache Hit Ratio (<50% for 15min)
- High Memory Cache Usage (>90 items for 10min)
- Too Many Active Analyses (>10 for 5min)

### Critical Alerts (Immediate Action)
- Critical Error Rate (>20% for 2min)
- Very Slow Response Time (P95 >60s for 5min)
- Service Down (for 1min)

## Querying Metrics

### Prometheus UI
Visit `http://localhost:9090/graph` and try these queries:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(analysis_requests_total{status="error"}[5m]) / rate(analysis_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(analysis_duration_seconds_bucket[5m]))

# Cache hit ratio
sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))
```

## Troubleshooting

### Prometheus Can't Scrape Metrics

1. Check backend is running: `docker ps`
2. Verify metrics endpoint: `curl http://localhost:8000/metrics`
3. Check Prometheus targets: `http://localhost:9090/targets`
4. Verify network connectivity: Backend and Prometheus must be on same network

### Grafana Shows "No Data"

1. Verify Prometheus data source is working: **Configuration** → **Data Sources** → **Test**
2. Check time range (default: last 15 minutes)
3. Ensure backend has received traffic to generate metrics
4. Check Prometheus is scraping: `http://localhost:9090/targets`

### Alerts Not Firing

1. Check alert rules are loaded: `http://localhost:9090/alerts`
2. Verify alert expressions are valid
3. Check `for` duration - alerts need sustained conditions
4. Ensure Alertmanager is configured (optional)

## Production Recommendations

### Prometheus
- Enable persistent storage: `-v prometheus-data:/prometheus`
- Increase retention: `--storage.tsdb.retention.time=30d`
- Set up remote write for long-term storage (Thanos/Cortex)

### Grafana
- Use persistent storage: `-v grafana-data:/var/lib/grafana`
- Configure SMTP for alert notifications
- Set up user authentication (LDAP/OAuth)
- Enable dashboard provisioning for GitOps

### Alerting
- Configure Alertmanager for notifications (Slack, PagerDuty, email)
- Set up alert routing based on severity
- Configure silences during maintenance
- Test alert delivery regularly

## Next Steps

1. ✅ Set up Prometheus and Grafana
2. ✅ Import dashboard
3. ✅ Verify metrics collection
4. ⏭️ Configure alerting (Alertmanager)
5. ⏭️ Set up distributed tracing (Jaeger)
6. ⏭️ Add log aggregation (Loki)

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [FastAPI Instrumentator](https://github.com/trallnag/prometheus-fastapi-instrumentator)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
