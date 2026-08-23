"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Snapshot = {
  id: string;
  status: string;
  changeStatus: string | null;
  fetchedAt?: string;
  scrapedAt?: string;
  contentHash?: string | null;
  data?: {
    raw?: string;
    error?: string;
  };
  error?: string | null;
};

type Site = {
  id: string;
  name: string;
  url: string;
  collectorId?: string;
  createdAt?: string;
  status?: string;
  snapshots?: Snapshot[];
};

type ApiResponse = Site[];

function getSortedSnapshots(site: Site): Snapshot[] {
  if (!site.snapshots || site.snapshots.length === 0) {
    return [];
  }

  return [...site.snapshots].sort((a, b) => {
    const aDate = new Date(
      a.fetchedAt || a.scrapedAt || 0
    ).getTime();

    const bDate = new Date(
      b.fetchedAt || b.scrapedAt || 0
    ).getTime();

    return bDate - aDate;
  });
}

/**
 * Most recent scrape attempt, regardless of success/failure.
 */
function getLatestSnapshot(site: Site): Snapshot | null {
  return getSortedSnapshots(site)[0] ?? null;
}

/**
 * Most recent successful scrape.
 *
 * This is deliberately different from getLatestSnapshot().
 * A failed scrape must not erase the last known successful
 * observation of the website.
 */
function getLatestSuccessfulSnapshot(
  site: Site
): Snapshot | null {
  return (
    getSortedSnapshots(site).find(
      (snapshot) => snapshot.status === "ok"
    ) ?? null
  );
}

function getChangeStatus(site: Site) {
  const snapshot = getLatestSuccessfulSnapshot(site);

  if (!snapshot) {
    return {
      label: "NO DATA",
      className: "neutral",
    };
  }

  if (snapshot.changeStatus === "changed") {
    return {
      label: "CHANGED",
      className: "changed",
    };
  }

  if (snapshot.changeStatus === "unchanged") {
    return {
      label: "UNCHANGED",
      className: "healthy",
    };
  }

  if (snapshot.changeStatus === "initial") {
    return {
      label: "INITIAL",
      className: "neutral",
    };
  }

  return {
    label: "OK",
    className: "healthy",
  };
}

/**
 * Primary operational status.
 *
 * A failed latest attempt takes priority because it represents
 * the current health of the monitoring operation.
 */
function getDisplayStatus(site: Site) {
  const latestAttempt = getLatestSnapshot(site);

  if (!latestAttempt) {
    return {
      label: "NO DATA",
      className: "neutral",
    };
  }

  if (latestAttempt.status === "failed") {
    return {
      label: "FAILED",
      className: "failed",
    };
  }

  if (latestAttempt.changeStatus === "changed") {
    return {
      label: "CHANGED",
      className: "changed",
    };
  }

  if (
    latestAttempt.changeStatus === "unchanged" ||
    latestAttempt.changeStatus === "initial"
  ) {
    return {
      label:
        latestAttempt.changeStatus === "initial"
          ? "INITIAL"
          : "UNCHANGED",
      className:
        latestAttempt.changeStatus === "initial"
          ? "neutral"
          : "healthy",
    };
  }

  return {
    label: "OK",
    className: "healthy",
  };
}

function getFailureMessage(snapshot: Snapshot | null) {
  if (!snapshot) {
    return null;
  }

  if (snapshot.error) {
    return snapshot.error;
  }

  if (snapshot.data?.error) {
    return snapshot.data.error;
  }

  return null;
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

export default function Home() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    null
  );

  const loadSites = useCallback(async () => {
    try {
      setError("");

      const response = await fetch("/api/sites", {
        cache: "no-store",
      });

      const data: ApiResponse | { error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error || "Failed to load sites"
            : "Failed to load sites"
        );
      }

      setSites(data as Site[]);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Watchtower data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSites();

    const interval = setInterval(loadSites, 10000);

    return () => clearInterval(interval);
  }, [loadSites]);

  const stats = useMemo(() => {
    let unchanged = 0;
    let changed = 0;
    let failed = 0;

    sites.forEach((site) => {
      const latestAttempt = getLatestSnapshot(site);
      const latestSuccessful =
        getLatestSuccessfulSnapshot(site);

      /*
       * FAILED represents the current monitoring operation.
       */
      if (latestAttempt?.status === "failed") {
        failed++;
      }

      /*
       * CHANGED / UNCHANGED represent the latest known
       * successful website observation.
       */
      if (latestSuccessful?.changeStatus === "changed") {
        changed++;
      }

      if (
        latestSuccessful?.changeStatus === "unchanged"
      ) {
        unchanged++;
      }
    });

    return {
      total: sites.length,
      unchanged,
      changed,
      failed,
    };
  }, [sites]);

  return (
    <main className="watchtower-shell">
      <header className="topbar">
        <div>
          <div className="brand">
            <span className="brand-mark">W</span>
            <span>WATCHTOWER</span>
          </div>

          <p className="subtitle">
            Continuous website change intelligence
          </p>
        </div>

        <div className="live-indicator">
          <span className="live-dot" />
          LIVE
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">MONITORING SYSTEM</p>

          <h1>
            Know when the web
            <br />
            <span>actually changes.</span>
          </h1>

          <p className="hero-description">
            Watchtower continuously captures website snapshots,
            compares them against previous states, and surfaces
            meaningful changes and failures.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadSites}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">MONITORED</span>

          <strong>{stats.total}</strong>

          <span className="stat-description">
            active sites
          </span>
        </div>

        <div className="stat-card healthy-card">
          <span className="stat-label">UNCHANGED</span>

          <strong>{stats.unchanged}</strong>

          <span className="stat-description">
            stable snapshots
          </span>
        </div>

        <div className="stat-card changed-card">
          <span className="stat-label">CHANGED</span>

          <strong>{stats.changed}</strong>

          <span className="stat-description">
            detected changes
          </span>
        </div>

        <div className="stat-card failed-card">
          <span className="stat-label">FAILED</span>

          <strong>{stats.failed}</strong>

          <span className="stat-description">
            latest scrape failures
          </span>
        </div>
      </section>

      <section className="sites-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LIVE TRACKER</p>
            <h2>Monitored Sites</h2>
          </div>

          <div className="updated">
            {lastUpdated
              ? `Updated ${formatDate(
                  lastUpdated.toISOString()
                )}`
              : "Waiting for data"}
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <strong>Connection problem</strong>
            <span>{error}</span>
          </div>
        )}

        {loading && sites.length === 0 ? (
          <div className="empty-state">
            <div className="spinner" />
            <p>Loading monitored sites...</p>
          </div>
        ) : sites.length === 0 ? (
          <div className="empty-state">
            <p>No monitored sites found.</p>
          </div>
        ) : (
          <div className="sites-list">
            {sites.map((site) => {
              const latestAttempt =
                getLatestSnapshot(site);

              const latestSuccessful =
                getLatestSuccessfulSnapshot(site);

              const displayStatus =
                getDisplayStatus(site);

              const changeStatus =
                getChangeStatus(site);

              const failureMessage =
                getFailureMessage(latestAttempt);

              const latestAttemptTime =
                latestAttempt?.fetchedAt ||
                latestAttempt?.scrapedAt;

              const successfulTime =
                latestSuccessful?.fetchedAt ||
                latestSuccessful?.scrapedAt;

              return (
                <article
                  key={site.id}
                  className="site-card"
                >
                  <div className="site-main">
                    <div className="site-icon">
                      {site.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="site-information">
                      <h3>{site.name}</h3>

                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {site.url}
                      </a>

                      <div className="snapshot-info">
                        Latest attempt:{" "}
                        {formatDate(
                          latestAttemptTime
                        )}
                      </div>

                      {latestSuccessful && (
                        <div className="snapshot-info">
                          Last successful:{" "}
                          {formatDate(
                            successfulTime
                          )}{" "}
                          ·{" "}
                          <span
                            className={
                              changeStatus.className
                            }
                          >
                            {changeStatus.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="site-right">
                    <span
                      className={`status-pill ${displayStatus.className}`}
                    >
                      <span className="status-dot" />
                      {displayStatus.label}
                    </span>

                    {latestAttempt?.status ===
                      "failed" &&
                      failureMessage && (
                        <span className="failure-text">
                          {failureMessage}
                        </span>
                      )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="system-footer">
        <div>
          <span className="system-dot" />
          Scraper Runner connected
        </div>

        <div>
          API · localhost:4000
        </div>

        <div>
          Auto-refresh · 10s
        </div>
      </section>
    </main>
  );
}