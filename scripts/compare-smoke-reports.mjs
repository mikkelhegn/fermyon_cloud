import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

export function missingReport(filename) {
  return {
    target: basename(filename, ".json"),
    baseUrl: "not run",
    spin: "unknown",
    checks: [{ name: "smoke:report", status: "MISSING", detail: "No smoke report was produced; inspect workflow logs." }],
  };
}

export function compareReports(reference, candidate) {
  const referenceChecks = new Map(reference.checks.map((check) => [check.name, check]));
  const candidateChecks = new Map(candidate.checks.map((check) => [check.name, check]));
  const names = [...new Set([...referenceChecks.keys(), ...candidateChecks.keys()])].toSorted();
  const checks = names.map((name) => {
    const referenceCheck = referenceChecks.get(name);
    const candidateCheck = candidateChecks.get(name);
    const referenceStatus = referenceCheck?.status ?? "MISSING";
    const candidateStatus = candidateCheck?.status ?? "MISSING";
    return {
      name,
      reference: referenceStatus,
      candidate: candidateStatus,
      referenceDetail: referenceCheck?.detail ?? "",
      candidateDetail: candidateCheck?.detail ?? "",
      equal: referenceStatus === candidateStatus,
    };
  });
  const failedChecks = checks.filter((check) => check.reference !== "PASS" || check.candidate !== "PASS");
  const discrepancies = checks.filter((check) => !check.equal);
  return {
    generatedAt: new Date().toISOString(),
    reference: { target: reference.target, baseUrl: reference.baseUrl, spin: reference.spin },
    candidate: { target: candidate.target, baseUrl: candidate.baseUrl, spin: candidate.spin },
    checks,
    totals: {
      PASS: checks.length - failedChecks.length,
      FAIL: failedChecks.length,
      DISCREPANCY: discrepancies.length,
    },
    passed: failedChecks.length === 0 && discrepancies.length === 0,
  };
}

export function renderComparison(report) {
  const rows = report.checks.map((check) =>
    `| ${check.name} | ${check.reference}${check.referenceDetail ? `: ${check.referenceDetail.replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ")}` : ""} | ${check.candidate}${check.candidateDetail ? `: ${check.candidateDetail.replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ")}` : ""} | ${check.equal ? "same" : "DIFFERENT"} |`);
  return `# Host Validation Comparison

Generated: ${report.generatedAt}

Reference: ${report.reference.target} (${report.reference.baseUrl}; ${report.reference.spin})
Candidate: ${report.candidate.target} (${report.candidate.baseUrl}; ${report.candidate.spin})

Result: **${report.passed ? "PASS" : "FAIL"}**; ${report.totals.PASS} checks passed on both hosts, ${report.totals.FAIL} failed on at least one host, ${report.totals.DISCREPANCY} differed.

| Check | ${report.reference.target} | ${report.candidate.target} | Comparison |
| --- | --- | --- | --- |
${rows.join("\n")}

Equal failures are still failures, not validation passes. Optional outbound, external database, and AI checks are only included when enabled in both smoke runs.
`;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  assert.ok(process.argv[2] && process.argv[3], "Usage: node scripts/compare-smoke-reports.mjs <reference.json> <candidate.json> [output-prefix]");
  const load = async (filename) => {
    try {
      return JSON.parse(await readFile(resolve(filename), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return missingReport(filename);
      throw error;
    }
  };
  const reference = await load(process.argv[2]);
  const candidate = await load(process.argv[3]);
  const report = compareReports(reference, candidate);
  const prefix = resolve(process.argv[4] ?? "reports/host-comparison");
  await mkdir(dirname(prefix), { recursive: true });
  await writeFile(`${prefix}.json`, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(`${prefix}.md`, renderComparison(report));
  console.log(`Comparison: ${prefix}.md (${report.totals.PASS} pass, ${report.totals.FAIL} fail, ${report.totals.DISCREPANCY} differ)`);
  if (!report.passed) process.exitCode = 1;
}