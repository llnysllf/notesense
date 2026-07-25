const BLOCKING_SEVERITIES = new Set(["high", "critical"]);

function isBlockingSeverity(severity) {
  return BLOCKING_SEVERITIES.has(severity);
}

function getAdvisoryId(via) {
  if (typeof via !== "object" || via === null) return undefined;

  const haystack = `${via.url ?? ""} ${via.title ?? ""}`;
  return haystack.match(/GHSA-[\w-]+/i)?.[0]?.toUpperCase();
}

function isExceptionActive(exception, now) {
  const expiry = Date.parse(`${exception.expiresOn}T23:59:59.999Z`);
  return Number.isFinite(expiry) && now.getTime() <= expiry;
}

function affectsDevDependenciesOnly(vulnerability, lockfile) {
  return (
    Array.isArray(vulnerability.nodes) &&
    vulnerability.nodes.length > 0 &&
    vulnerability.nodes.every((node) => lockfile.packages?.[node]?.dev === true)
  );
}

function directAdvisories(vulnerability) {
  return vulnerability.via.filter((via) => typeof via === "object" && via !== null && isBlockingSeverity(via.severity));
}

function transitiveSources(vulnerability) {
  return vulnerability.via.filter((via) => typeof via === "string");
}

export function evaluateAuditReport(report, lockfile, policy, now = new Date()) {
  const blocking = new Map(
    Object.entries(report.vulnerabilities ?? {}).filter(([, vulnerability]) =>
      isBlockingSeverity(vulnerability.severity),
    ),
  );
  const ignored = new Map();

  for (const [name, vulnerability] of blocking) {
    const advisories = directAdvisories(vulnerability);
    if (advisories.length === 0 || !affectsDevDependenciesOnly(vulnerability, lockfile)) continue;

    const covered = advisories.every((advisory) => {
      const advisoryId = getAdvisoryId(advisory);
      return policy.exceptions.some(
        (exception) =>
          exception.devOnly === true &&
          exception.package === name &&
          exception.advisory.toUpperCase() === advisoryId &&
          isExceptionActive(exception, now),
      );
    });

    if (covered) {
      ignored.set(name, vulnerability);
      blocking.delete(name);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const [name, vulnerability] of blocking) {
      const advisories = directAdvisories(vulnerability);
      const sources = transitiveSources(vulnerability);
      if (
        advisories.length === 0 &&
        sources.length > 0 &&
        sources.every((source) => ignored.has(source)) &&
        affectsDevDependenciesOnly(vulnerability, lockfile)
      ) {
        ignored.set(name, vulnerability);
        blocking.delete(name);
        changed = true;
      }
    }
  }

  return {
    blocked: [...blocking.entries()],
    ignored: [...ignored.entries()],
  };
}
